/** Plugin boundary tests using local Unix IPC; these do not simulate LLM quality. */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readTrustedConfig } from "./config.mjs";
import { registerBrokerTools } from "./tools.mjs";
import { registerRevocationCommand, registerStatusCommand } from "./commands.mjs";

async function setup(t, reply = (request) => ({ allowed: true, operation: request.op })) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "yxm-plugin-contract-"));
  const workspace = path.join(directory, "workspace");
  mkdirSync(workspace);
  const config = { python: "/usr/bin/python3", corePath: path.join(directory, "core"), workspace,
    brokerSocket: path.join(directory, "broker.sock"), operatorSocket: path.join(directory, "operator.sock"),
    bwrap: "/usr/bin/true", auditPath: path.join(directory, "native-events.jsonl"),
    resourceIds: ["notes"], destinationIds: ["team"] };
  mkdirSync(config.corePath);
  const received = [];
  const servers = [];
  for (const endpoint of [config.brokerSocket, config.operatorSocket]) {
    const server = createServer((socket) => {
      let pending = "";
      socket.on("data", (data) => {
        pending += data.toString("utf8");
        if (!pending.includes("\n")) return;
        const request = JSON.parse(pending.slice(0, pending.indexOf("\n")));
        received.push({ endpoint, request });
        const result = reply(request);
        if (result === null) socket.destroy();
        else socket.end(JSON.stringify(result) + "\n");
      });
    });
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(endpoint, resolve); });
    servers.push(server);
  }
  t.after(async () => {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith("yxm-plugin-contract-"));
    rmSync(directory, { recursive: true, force: true });
  });
  const factories = new Map();
  const commands = new Map();
  const api = { registerTool(factory, options) { factories.set(options.name, { factory, options }); },
    registerCommand(command) { commands.set(command.name, command); } };
  registerBrokerTools(api, config);
  registerStatusCommand(api, config);
  registerRevocationCommand(api, config);
  const context = { sandboxed: true, workspaceDir: workspace, sessionKey: "agent:main:main", sessionId: "first" };
  return { directory, config, context, received, factories, commands,
    tool(name, ctx = context) { return factories.get("yuanxingmu_" + name).factory(ctx); } };
}

test("tools require the configured host workspace and sandbox context", async (t) => {
  const f = await setup(t);
  assert.equal(f.factories.size, 3);
  for (const { options } of f.factories.values()) assert.equal(options.optional, true);
  assert.deepEqual(f.tool("read").annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  assert.deepEqual(f.tool("send").annotations, { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false });
  assert.deepEqual(f.tool("status").annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  assert.equal(f.tool("read", {}), null);
  assert.equal(f.tool("read", { ...f.context, sandboxed: false }), null);
  assert.equal(f.tool("read", { ...f.context, workspaceDir: "/workspace" }), null);
  assert.equal(f.tool("read", { ...f.context, sessionKey: "" }), null);
  const retained = f.tool("read");
  f.context.workspaceDir = f.directory;
  assert.equal((await retained.execute("c1", { resource: "notes" })).details.reason, "unbound_tool_context");
  assert.equal(f.received.length, 0);
});

test("extra permission fields and unconfigured identifiers cannot reach IPC", async (t) => {
  const f = await setup(t);
  const badReads = [{ resource: "notes", taskId: "other" }, { resource: "notes", op: "revoke" },
    { resource: "notes", path: "/etc/passwd" }, { resource: "other" }, null, []];
  for (const input of badReads) assert.equal((await f.tool("read").execute("c2", input)).details.allowed, false);
  const badSends = [{ destination: "team", body: "x", url: "https://example.invalid" },
    { destination: "team", body: "x", labels: [] }, { destination: "outside", body: "x" },
    { destination: "team", body: "界".repeat(90000) }];
  for (const input of badSends) assert.equal((await f.tool("send").execute("c3", input)).details.allowed, false);
  assert.equal((await f.tool("status").execute("c4", { action: "reset" })).details.allowed, false);
  assert.equal(f.received.length, 0);
});

test("valid native tools dispatch exact fixed operations and preserve actual results", async (t) => {
  const f = await setup(t, (request) => ({ allowed: true, operation: request.op, outcome: "acknowledged", marker: "actual-local-reply" }));
  const read = await f.tool("read").execute("c5", { resource: "notes" });
  const send = await f.tool("send").execute("c6", { destination: "team", body: "真实请求正文" });
  const nextSession = f.tool("status", { ...f.context, sessionId: "new-chat" });
  await nextSession.execute("c7", {});
  assert.equal(read.details.marker, "actual-local-reply");
  assert.equal(send.details.outcome, "acknowledged");
  assert.deepEqual(f.received, [
    { endpoint: f.config.brokerSocket, request: { op: "read", resource: "notes" } },
    { endpoint: f.config.brokerSocket, request: { op: "send", destination: "team", body: "真实请求正文" } },
    { endpoint: f.config.brokerSocket, request: { op: "describe" } },
  ]);
});

test("a send whose reply is lost stays unknown instead of falsely claiming non-delivery", async (t) => {
  const f = await setup(t, () => null);
  const result = await f.tool("send").execute("c8", { destination: "team", body: "may-have-arrived" });
  assert.equal(f.received.length, 1);
  assert.equal(result.details.allowed, null);
  assert.equal(result.details.outcome, "unknown");
  assert.match(result.content[0].text, /不能据此确定/u);
});

test("an already cancelled call cannot dispatch a broker request", async (t) => {
  const f = await setup(t);
  const signal = AbortSignal.abort();
  const result = await f.tool("send").execute("c9", { destination: "team", body: "x" }, signal);
  assert.equal(result.details.reason, "cancelled_before_request");
  assert.equal(f.received.length, 0);
});

test("revocation requires an authenticated admin and has only the fixed revoke action", async (t) => {
  const f = await setup(t, () => ({ operator_action: "revoke", task: { task_id: "bound", active: false, revoked: true } }));
  const command = f.commands.get("yuanxingmu-revoke");
  assert.equal(command.requireAuth, true);
  assert.equal(command.acceptsArgs, false);
  assert.deepEqual(command.requiredScopes, ["operator.admin"]);
  await command.handler({ isAuthorizedSender: false, gatewayClientScopes: ["operator.admin"] });
  await command.handler({ isAuthorizedSender: true, gatewayClientScopes: ["operator.write"] });
  await command.handler({ isAuthorizedSender: true, gatewayClientScopes: ["operator.admin"], args: "other-task" });
  assert.equal(f.received.length, 0);
  const reply = await command.handler({ isAuthorizedSender: true, gatewayClientScopes: ["operator.admin"], sessionKey: "agent:main:main" });
  assert.deepEqual(f.received, [{ endpoint: f.config.operatorSocket, request: { op: "revoke" } }]);
  assert.match(reply.text, /本地运算仍可继续/u);
});

const admin = { isAuthorizedSender: true, gatewayClientScopes: ["operator.admin"] };
function protectedStatus() {
  return { operator_action: "status", status: "ready", task: { active: true, revoked: false },
    protection: { schema_version: 1, state: "available", paused: false, revoked: false,
      layers: { input: {enabled:true, mode:"enforce"}, memory: {enabled:false, mode:"enforce"},
        command: {enabled:true, mode:"observe"}, alignment: {enabled:true, mode:"enforce"},
        foundation: {enabled:true, mode:"enforce"} },
      foundation_config_enabled: true, skill_semantic_enabled: false,
      foundation_scan: {state:"current", complete:false, assessed:true, verdict:"allow", would_verdict:null} } };
}

test("status is an authenticated admin command with no parameters or model management tool", async (t) => {
  const f = await setup(t, protectedStatus);
  const command = f.commands.get("yuanxingmu");
  assert.equal(command.requireAuth, true);
  assert.equal(command.acceptsArgs, false);
  assert.deepEqual(command.requiredScopes, ["operator.admin"]);
  assert.deepEqual([...f.factories.keys()].sort(), ["yuanxingmu_read", "yuanxingmu_send", "yuanxingmu_status"]);
  for (const context of [ {}, {...admin, isAuthorizedSender:false}, {...admin, isAuthorizedSender:"true"},
    {...admin, gatewayClientScopes:["operator.read"]}, {...admin, gatewayClientScopes:"operator.admin"},
    {...admin, args:"set command_mode observe"}, {...admin, args:42} ]) {
    await command.handler(context);
  }
  assert.equal(f.received.length, 0);
  const reply = await command.handler(admin);
  assert.deepEqual(f.received, [{endpoint:f.config.operatorSocket, request:{op:"status"}}]);
  assert.match(reply.text, /外部内容：拦截/u);
  assert.match(reply.text, /记忆文件：关闭/u);
  assert.match(reply.text, /命令执行：只记录，不拦截/u);
  assert.match(reply.text, /基础配置检查：开启；技能语义检查：关闭/u);
  assert.match(reply.text, /检查未完整完成/u);
  assert.match(reply.text, /工作暂停：未暂停/u);
  assert.match(reply.text, /原来的元星木启动器/u);
  assert.doesNotMatch(reply.text, /https?:\/\//u);
});

test("status distinguishes temporary pause from permanent revocation and uses fresh responses", async (t) => {
  let state = protectedStatus();
  const f = await setup(t, () => state);
  const command = f.commands.get("yuanxingmu");
  state.protection.paused = true;
  let reply = await command.handler(admin);
  assert.match(reply.text, /工作暂停：已暂停/u);
  assert.match(reply.text, /权限：尚未撤销/u);
  state.task = {active:false, revoked:true};
  state.protection.revoked = true;
  state.protection.layers.input.mode = "observe";
  state.protection.foundation_scan = {state:"stale"};
  reply = await command.handler(admin);
  assert.match(reply.text, /权限：已永久收回/u);
  assert.match(reply.text, /工作暂停：已暂停/u);
  assert.match(reply.text, /外部内容：只记录，不拦截/u);
  assert.match(reply.text, /设置已变更，需下次启动重新检查/u);
  assert.equal(f.received.length, 2);
  state.protection.layers.foundation.enabled = false;
  reply = await command.handler(admin);
  assert.match(reply.text, /基础配置和技能语义检查：随安装与技能层关闭/u);
  assert.match(reply.text, /最近安装与技能检查：该层已关闭/u);
  assert.doesNotMatch(reply.text, /基础配置检查：开启|已完成本次检查/u);
});

test("legacy, unavailable, malformed, and unready status never claims active protection", async (t) => {
  let state;
  const f = await setup(t, () => state);
  const command = f.commands.get("yuanxingmu");
  for (const response of [null, {}, {operator_action:"revoke"},
    {operator_action:"status", status:"ready", task:{active:true, revoked:false}},
    {...protectedStatus(), status:"starting"},
    {...protectedStatus(), protection:{schema_version:1, state:"unavailable"}},
    {...protectedStatus(), task:{active:true, revoked:true}},
    {...protectedStatus(), protection:{...protectedStatus().protection, paused:"false"}},
    {...protectedStatus(), protection:{...protectedStatus().protection, schema_version:2}} ]) {
    state = response;
    const {text} = await command.handler(admin);
    assert.match(text, /未确认/u);
    assert.doesNotMatch(text, /：拦截|：未暂停|已完成本次检查/u);
  }
  state = {...protectedStatus(), protection:{schema_version:1, state:"not_configured"}};
  const {text} = await command.handler(admin);
  assert.equal((text.match(/：未启用\n/gu) ?? []).length, 5);
  assert.match(text, /安装与技能：未启用/u);
  assert.doesNotMatch(text, /：拦截|已完成本次检查/u);
});

test("status never renders raw URLs, paths, objectives, credentials, incidents, or unknown values", async (t) => {
  const secret = "PRIVATE-CANARY-MUST-NOT-BE-RENDERED";
  const state = protectedStatus();
  Object.assign(state, {profile:"/host/"+secret, url:"http://127.0.0.1:34567/#token="+secret,
    model:{api_key:secret}, reason:secret, workbench_url:"https://"+secret+".invalid"});
  Object.assign(state.protection, {objective:secret, incident:{reason:secret}, workbench_url:secret});
  state.protection.layers.input = {enabled:true, mode:secret};
  state.protection.layers.memory = {enabled:secret, mode:"enforce"};
  state.protection.foundation_scan = {state:"current", assessed:true, complete:true, verdict:secret, would_verdict:null};
  const f = await setup(t, () => state);
  const {text} = await f.commands.get("yuanxingmu").handler(admin);
  assert.doesNotMatch(text, new RegExp(secret, "u"));
  assert.doesNotMatch(text, /https?:\/\/|\/host\/|34567/u);
  assert.match(text, /外部内容：未确认/u);
  assert.match(text, /记忆文件：未确认/u);
  assert.match(text, /最近安装与技能检查：未确认/u);
});

test("host configuration rejects extra fields and trusted paths inside the workspace", async (t) => {
  const f = await setup(t);
  const config = readTrustedConfig(f.config);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.resourceIds));
  assert.throws(() => readTrustedConfig({ ...f.config, taskId: "model-input" }), /configuration fields/u);
  assert.throws(() => readTrustedConfig({ ...f.config, auditPath: path.join(f.config.workspace, "log.jsonl") }), /overlaps writable workspace/u);
  assert.throws(() => readTrustedConfig({ ...f.config, brokerSocket: f.config.operatorSocket }), /sockets must differ/u);
});

test("fixed Python bootstrap disables bytecode and terminates after its Gateway parent is killed", async (t) => {
  const f = await setup(t);
  const packagePath = path.join(f.config.corePath, "yuanxingmu");
  mkdirSync(packagePath);
  writeFileSync(path.join(packagePath, "__init__.py"), "");
  writeFileSync(path.join(packagePath, "worker.py"), [
    "import json, os, sys, time",
    "def main():",
    "    print(json.dumps({'pid': os.getpid(), 'parent': os.getppid(), 'isolated': sys.flags.isolated, 'no_bytecode': sys.dont_write_bytecode}), flush=True)",
    "    time.sleep(30)",
  ].join("\n") + "\n");
  const runner = String.raw`
import ctypes, json, os, signal, subprocess, sys, time
if ctypes.CDLL(None).prctl(36, 1, 0, 0, 0) != 0:
    raise RuntimeError('subreaper_required_for_test_cleanup')
def timeout(*args):
    raise TimeoutError('bounded_test_timeout')
signal.signal(signal.SIGALRM, timeout)
signal.alarm(7)
script = '''
import { spawn } from 'node:child_process';
const { workerArgv } = await import(process.argv[1]);
const argv = workerArgv(JSON.parse(process.argv[2]), ['/bin/true']);
const worker = spawn(argv[0], argv.slice(1), {stdio: ['ignore', 'pipe', 'inherit'], detached: true});
worker.stdout.pipe(process.stdout);
setInterval(() => {}, 1000);
'''
gateway = subprocess.Popen([sys.argv[1], '--input-type=module', '-e', script, sys.argv[2], sys.argv[3]], stdout=subprocess.PIPE, text=True)
worker_pid = None
reaped = False
try:
    observed = json.loads(gateway.stdout.readline())
    worker_pid = observed['pid']
    assert observed['parent'] == gateway.pid
    assert observed['isolated'] == 1 and observed['no_bytecode'] is True
    gateway.kill()
    gateway.wait(timeout=2)
    waited_pid, status = os.waitpid(worker_pid, 0)
    reaped = True
    assert waited_pid == worker_pid and os.WIFSIGNALED(status) and os.WTERMSIG(status) == signal.SIGTERM
    print(json.dumps({'isolated': True, 'no_bytecode': True, 'parent_death_signal': 'SIGTERM', 'worker_reaped': True}))
finally:
    signal.alarm(0)
    if gateway.poll() is None:
        gateway.kill()
        gateway.wait(timeout=2)
    if worker_pid is not None and not reaped:
        try: os.kill(worker_pid, signal.SIGKILL)
        except ProcessLookupError: pass
        try: os.waitpid(worker_pid, 0)
        except ChildProcessError: pass
`;
  const result = spawnSync("/usr/bin/python3", ["-I", "-B", "-c", runner,
    process.execPath, new URL("./worker-launch.mjs", import.meta.url).href, JSON.stringify(f.config)], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).worker_reaped, true);
  assert.deepEqual(readdirSync(packagePath).sort(), ["__init__.py", "worker.py"]);
});
