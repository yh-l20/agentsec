/** Execute the real plugin registrar/tools over local Unix IPC.
 * Broker responses are explicit fixtures, not a model or an OpenClaw Gateway.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readTrustedConfig } from "../yuanxingmu/integrations/openclaw/plugin/config.mjs";
import { registerBrokerTools } from "../yuanxingmu/integrations/openclaw/plugin/tools.mjs";

const draft = () => ({ recipient: "reviewed@example.test", subject: "请核对主题", body: "完整正文\n第二行\tend" });
const saved = (status = "pending") => ({ allowed: true, reason: "mail_draft_saved", draft_id: "a".repeat(32),
  digest: "b".repeat(64), revision: 1, status });
const linuxTest = (name, action) => test(name, { skip: process.platform !== "linux" }, action);

async function setup(t, { reviewedMail = true, automaticActions = false, reply = () => saved() } = {}) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "yxm-mail-plugin-"));
  const workspace = path.join(directory, "workspace");
  const corePath = path.join(directory, "core");
  mkdirSync(workspace);
  mkdirSync(corePath);
  const rawConfig = { python: "/usr/bin/python3", corePath, workspace,
    brokerSocket: path.join(directory, "broker.sock"), operatorSocket: path.join(directory, "operator.sock"),
    bwrap: "/usr/bin/true", auditPath: path.join(directory, "events.jsonl"), resourceIds: [], destinationIds: [] };
  if (reviewedMail !== undefined) rawConfig.reviewedMail = reviewedMail;
  if (automaticActions) Object.assign(rawConfig, {automaticActions:true, reviewedActions:true, defenseEnabled:true});
  const received = [], servers = [], sockets = new Set();
  const hostReview = path.join(directory, "review.sock");
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith("yxm-mail-plugin-"));
    rmSync(target, { recursive: true, force: true });
  });
  for (const endpoint of [rawConfig.brokerSocket, rawConfig.operatorSocket, hostReview]) {
    const server = createServer(socket => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
      socket.on("error", () => {});
      let chunks = [], handled = false;
      socket.on("data", chunk => {
        if (handled) return;
        chunks.push(chunk);
        const bytes = Buffer.concat(chunks);
        const newline = bytes.indexOf(10);
        if (newline < 0) return;
        handled = true;
        const request = JSON.parse(bytes.subarray(0, newline).toString("utf8"));
        received.push({ endpoint, request });
        const result = reply(request, endpoint, received.length);
        if (result === null) socket.destroy();
        else socket.end(JSON.stringify(result) + "\n");
      });
    });
    servers.push(server);
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(endpoint, resolve); });
  }
  const config = readTrustedConfig(rawConfig);
  const factories = new Map();
  registerBrokerTools({ registerTool(factory, options) { factories.set(options.name, { factory, options }); } }, config);
  const context = { sandboxed: true, workspaceDir: workspace, sessionKey: "agent:main:main", sessionId: "chat-one" };
  return { directory, config, rawConfig, factories, received, context, hostReview,
    tool(ctx = context) { return factories.get("yuanxingmu_prepare_email")?.factory(ctx); } };
}

linuxTest("reviewed mail is optional and registers only the three draft fields", async t => {
  const enabled = await setup(t);
  assert.deepEqual([...enabled.factories.keys()].sort(), ["yuanxingmu_prepare_email", "yuanxingmu_read", "yuanxingmu_send", "yuanxingmu_status"]);
  const { options } = enabled.factories.get("yuanxingmu_prepare_email");
  assert.deepEqual(options, { name: "yuanxingmu_prepare_email", optional: true });
  const tool = enabled.tool();
  assert.deepEqual(tool.annotations, { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  assert.equal(tool.parameters.additionalProperties, false);
  assert.deepEqual(tool.parameters.required, ["recipient", "subject", "body"]);
  assert.deepEqual(Object.keys(tool.parameters.properties).sort(), ["body", "recipient", "subject"]);
  assert.equal(tool.parameters.properties.subject.maxLength, 200);
  assert.equal(tool.parameters.properties.body.maxLength, 65536);
  assert.match(tool.description, /不会发送邮件/u);
  assert.match(tool.description, /用户在工作台亲自确认/u);
  const disabled = await setup(t, { reviewedMail: false });
  assert.equal(disabled.factories.size, 3);
  assert.equal(disabled.tool(), undefined);
  const legacy = { ...disabled.rawConfig };
  delete legacy.reviewedMail;
  const oldConfig = readTrustedConfig(legacy);
  assert.equal(oldConfig.reviewedMail, false);
  const oldNames = [];
  registerBrokerTools({ registerTool(_factory, registration) { oldNames.push(registration.name); } }, oldConfig);
  assert.ok(!oldNames.includes("yuanxingmu_prepare_email"));
});

linuxTest("automatic actions are distinct from inert proposals and bind exact tool identities", async t => {
  const f = await setup(t, {automaticActions:true, reply:()=>({allowed:true,status:"acknowledged",started:true,execution_mode:"automatic"})});
  const tool = f.factories.get("yuanxingmu_request_action").factory(f.context);
  const prepare = f.factories.get("yuanxingmu_prepare_action").factory(f.context);
  const targets = f.factories.get("yuanxingmu_action_targets").factory(f.context);
  assert.deepEqual(tool.annotations, { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false });
  assert.deepEqual(prepare.annotations, { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  assert.deepEqual(targets.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  assert.match(prepare.description, /不会实际执行/u);
  assert.match(tool.description, /立即执行/u);
  assert.deepEqual(tool.parameters.properties.kind.enum, ["message","upload","form"]);
  const proposal = {kind:"message",target_id:"team",payload:{body:"进度"}};
  const result = await tool.execute("auto-one", proposal);
  assert.equal(f.received.length,1);
  assert.deepEqual(f.received[0].request, {op:"request_action",request_key:createHash("sha256").update(f.context.sessionKey+"\0auto-one").digest("hex"),proposal});
  assert.match(result.content[0].text, /自动执行/u);
  assert.doesNotMatch(result.content[0].text, /本人.*确认|亲自确认/u);
  assert.equal((await tool.execute("forged", {...proposal, approved:true})).details.allowed,false);
  assert.equal((await tool.execute("", proposal)).details.reason,"invalid_tool_call_id");
  assert.equal((await tool.execute("cancelled",proposal,{aborted:true})).details.reason,"cancelled_before_request");
  assert.equal(f.received.length,1);
  const legacy = await setup(t);
  assert.equal(legacy.factories.has("yuanxingmu_request_action"),false);
  assert.throws(()=>readTrustedConfig({...f.rawConfig,defenseEnabled:false}));
  assert.throws(()=>readTrustedConfig({...f.rawConfig,reviewedActions:false}));
});

linuxTest("automatic transport loss remains unknown and does not retry", async t => {
  const f = await setup(t,{automaticActions:true,reply:()=>null});
  const tool = f.factories.get("yuanxingmu_request_action").factory(f.context);
  const result = await tool.execute("once",{kind:"message",target_id:"team",payload:{body:"progress"}});
  assert.equal(result.details.allowed,null);
  assert.equal(result.details.outcome,"unknown");
  assert.equal(f.received.length,1);
  assert.doesNotMatch(result.content[0].text,/自动执行|尚未提交/u);
});

linuxTest("a real prepare_email execution contacts only the fixed draft broker", async t => {
  const f = await setup(t);
  const proposed = draft();
  const result = await f.tool().execute("tool-call-one", proposed);
  assert.deepEqual(result.details, saved());
  const key = createHash("sha256").update(f.context.sessionKey + "\0tool-call-one").digest("hex");
  assert.deepEqual(f.received, [{ endpoint: f.config.brokerSocket,
    request: { op: "draft_email", request_key: key, draft: proposed } }]);
  assert.match(result.content[0].text, /尚未发送邮件/u);
  assert.ok(!f.received.some(({ endpoint }) => endpoint === f.hostReview || endpoint === f.config.operatorSocket));
});

linuxTest("extra approval, account, recipient and operation fields never enter IPC", async t => {
  const f = await setup(t);
  for (const key of ["from_address", "account", "account_id", "password", "cc", "bcc", "attachments", "html",
    "confirm", "approved", "op", "task_id", "request_key", "brokerSocket", "reviewSocket"]) {
    const result = await f.tool().execute("invalid-extra", { ...draft(), [key]: "model-selected" });
    assert.deepEqual(result.details, { allowed: false, reason: "invalid_tool_arguments" }, key);
  }
  for (const value of [null, [], {}, { recipient: "reviewed@example.test", subject: "missing body" },
    { ...draft(), recipient: ["reviewed@example.test"] }, { ...draft(), subject: 5 },
    { ...draft(), body: "界".repeat(21846) }, { ...draft(), recipient: "a".repeat(255) }]) {
    assert.equal((await f.tool().execute("invalid-types", value)).details.reason, "invalid_tool_arguments");
  }
  assert.deepEqual(f.received, []);
});

linuxTest("a retained tool still requires its bound workspace and live sandbox context", async t => {
  const f = await setup(t);
  for (const context of [{}, { ...f.context, sandboxed: false }, { ...f.context, workspaceDir: f.directory },
    { ...f.context, sessionKey: "" }]) assert.equal(f.tool(context), null);
  const retained = f.tool();
  f.context.sandboxed = false;
  assert.deepEqual((await retained.execute("retained", draft())).details,
    { allowed: false, reason: "unbound_tool_context" });
  assert.equal(f.received.length, 0);
});

linuxTest("retries retain the same request key across session-id changes", async t => {
  const f = await setup(t);
  await f.tool().execute("same-call", draft());
  await f.tool().execute("same-call", draft());
  await f.tool({ ...f.context, sessionId: "reconnected-chat" }).execute("same-call", draft());
  await f.tool().execute("new-call", draft());
  await f.tool({ ...f.context, sessionKey: "agent:main:another" }).execute("same-call", draft());
  const keys = f.received.map(({ request }) => request.request_key);
  assert.equal(keys[0], keys[1]);
  assert.equal(keys[0], keys[2]);
  assert.notEqual(keys[0], keys[3]);
  assert.notEqual(keys[0], keys[4]);
  for (const key of keys) assert.match(key, /^[0-9a-f]{64}$/u);
  assert.ok(f.received.every(({ request }) => request.op === "draft_email"));
});

linuxTest("a changed retry keeps its key and preserves the broker conflict", async t => {
  const f = await setup(t, { reply: (_request, _endpoint, count) => count === 1
    ? saved() : { allowed: false, reason: "mail_request_conflict" } });
  await f.tool().execute("fixed-call", draft());
  const result = await f.tool().execute("fixed-call", { ...draft(), body: "different body" });
  assert.equal(f.received[0].request.request_key, f.received[1].request.request_key);
  assert.notEqual(f.received[0].request.draft.body, f.received[1].request.draft.body);
  assert.deepEqual(result.details, { allowed: false, reason: "mail_request_conflict" });
  assert.doesNotMatch(result.content[0].text, /草稿已交给/u);
});

linuxTest("a replay describes each saved status without claiming a new or delivered email", async t => {
  let status = "pending";
  const f = await setup(t, { reply: () => saved(status) });
  const cases = [
    ["pending", /核对收件人、主题和全文/u],
    ["acknowledged", /邮箱服务已接收/u],
    ["sending", /结果尚未确认/u],
    ["unconfirmed", /结果尚未确认/u],
    ["cancelled", /草稿已经弃用/u],
    ["not_started", /没有重新创建或发送/u],
    ["future-unknown-state", /工作台核对实际状态/u],
  ];
  for (const [current, description] of cases) {
    status = current;
    const result = await f.tool().execute("status-replay", draft());
    assert.equal(result.details.status, current);
    const explanation = result.content[0].text.split("\n", 1)[0];
    assert.match(explanation, description, current);
    if (current !== "pending") assert.doesNotMatch(explanation, /现在尚未发送邮件/u, current);
    if (current === "acknowledged") {
      assert.match(explanation, /没有重复发送/u);
      assert.match(explanation, /不代表收件人已经收到或阅读/u);
    }
    if (current === "sending" || current === "unconfirmed") assert.match(explanation, /不要重复/u);
  }
  assert.equal(new Set(f.received.map(({ request }) => request.request_key)).size, 1);
});

linuxTest("a lost reply is unknown, has no implicit retry, and can reuse its original draft key", async t => {
  const f = await setup(t, { reply: (_request, _endpoint, count) => count === 1 ? null : saved("unconfirmed") });
  const first = await f.tool().execute("lost-reply", draft());
  assert.deepEqual(first.details, { allowed: null, reason: "broker_response_unavailable", outcome: "unknown" });
  assert.equal(f.received.length, 1);
  assert.match(first.content[0].text, /未得到确认/u);
  assert.doesNotMatch(first.content[0].text, /尚未发送邮件/u);
  const repeated = await f.tool().execute("lost-reply", draft());
  assert.equal(f.received.length, 2);
  assert.equal(f.received[0].request.request_key, f.received[1].request.request_key);
  assert.equal(repeated.details.status, "unconfirmed");
});

linuxTest("invalid call IDs and cancellation before dispatch cannot create a draft", async t => {
  const f = await setup(t);
  for (const value of [null, undefined, "", 1, {}, [], "x".repeat(1025)]) {
    assert.equal((await f.tool().execute(value, draft())).details.reason, "invalid_tool_call_id");
  }
  const cancelled = await f.tool().execute("cancelled-call", draft(), AbortSignal.abort());
  assert.deepEqual(cancelled.details, { allowed: false, reason: "cancelled_before_request" });
  assert.equal(f.received.length, 0);
});
