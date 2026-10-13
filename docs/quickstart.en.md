# Install Yuanxingmu and run your first task

This guide installs the released **runtime 0.7.0a2** with **installer 0.4.0a2**. It prepares separate, pinned OpenClaw and Hermes environments, then opens a local workbench. It does not modify your existing agent installation.

[Back to the README](../README.md) · [Chinese illustrated guide](https://yh-l20.github.io/agentsec/start.html) · [Watch the 100-second OpenClaw recording](https://yh-l20.github.io/agentsec/layers.html#openclaw-protected-fields)

## Before you start

- **Ubuntu 24.04, x86_64**, directly or inside Windows WSL. This installer does not provide a native Windows or macOS runtime.
- An internet connection for installation, and permission to install the required Ubuntu packages.
- Your own model API with **OpenAI-compatible Chat Completions and tool calling**. A browser chat subscription alone is not an API connection. Cloud services use HTTPS; a local service must be reachable from Ubuntu/WSL.

The workbench currently uses Chinese labels; the steps below identify the controls. Normal conversation and task documents reach your chosen model service. Explicitly labelled sensitive fields use [bounded protection rules](protected-fields.zh-CN.md), not general secret detection. Both the task and defense checks make model requests.

## 1. Prepare Ubuntu

On Windows, run this in PowerShell if Ubuntu 24.04 is not already installed:

```powershell
wsl --install -d Ubuntu-24.04
```

Follow the Windows prompts, restart if requested, and complete Ubuntu's first-time account setup. Open **Ubuntu 24.04** for every remaining command. The Yuanxingmu installer does not install WSL for you.

If you already use Ubuntu 24.04 on an x86_64 machine, continue below.

## 2. Download and install

Download [yuanxingmu-installer-0.4.0a2.pyz](https://github.com/yh-l20/agentsec/releases/download/installer-0.4.0a2/yuanxingmu-installer-0.4.0a2.pyz) from the [installer release](https://github.com/yh-l20/agentsec/releases/tag/installer-0.4.0a2). [SHA256SUMS](https://github.com/yh-l20/agentsec/releases/download/installer-0.4.0a2/SHA256SUMS) and the [installer manifest](https://github.com/yh-l20/agentsec/releases/download/installer-0.4.0a2/installer-manifest.json) are available with the release.

Place the `.pyz` in your **Ubuntu home directory** (`~`). Windows/WSL users can open that directory from the Ubuntu terminal, then drag the downloaded file into the Explorer window:

```bash
cd ~
explorer.exe .
```

In the Ubuntu terminal, install into a **new** directory:

```bash
/usr/bin/python3 -I "$HOME/yuanxingmu-installer-0.4.0a2.pyz" --install-root "$HOME/yuanxingmu-v07a2" --system-deps
```

`--system-deps` allows installation of required Ubuntu components and may request your Ubuntu password. The installer checks the execution boundary and stops if isolation is unavailable. If the system dependencies are already installed, this flag can be omitted.

The installer pins runtime **0.7.0a2**, Node.js **24.16.0**, OpenClaw **2026.9.4** and Hermes **0.21.2 / v2026.9.11**. It prepares both agents; choose one when creating a task. [Pinned versions and download hashes](../install/yxm_setup/pins.json).

Older installs and tasks do not automatically upgrade. Keep them in their existing directories. If `~/yuanxingmu-v07a2` is already used by another installation, select a different empty location with `--install-root` and use that same location below. An interrupted install can resume only when the installer recognizes its own incomplete state; do not overwrite or delete task records to force it.

## 3. Open the workbench

After installation completes, run:

```bash
"$HOME/yuanxingmu-v07a2/open-yuanxingmu"
```

Keep this terminal open. If the browser does not open automatically, copy the **complete local link** printed by the launcher into a browser on the same computer. It contains a private access credential. Keep it private and do not include it in screenshots or issues.

The workbench and the agent chat have different links. Restarting the workbench creates a new management link, while existing tasks retain their records. Data, document copies, model credentials and task permissions are stored under `~/yuanxingmu-v07a2/workbench`; do not create an empty `workbench` directory before first launch.

## 4. Create a small task

Start with a task that only reads a file and answers in chat. Save this as UTF-8 `quote.txt`:

```text
Project: Spring customer event (practice data)
Venue: 6000 CNY
Materials: 2800 CNY
Photography: 1200 CNY
Status: Supplier not yet confirmed.
```

In the workbench:

1. Under **使用哪个 AI 助手** (Which AI assistant), select OpenClaw or Hermes. Give the task a name, such as `Event budget`.
2. Under **这份工作要完成什么** (What this task should do), enter: `Read quote, list the three costs and calculate their total. Answer only in chat. Do not send messages, upload, submit forms, or change files.`
3. Fill in **模型地址** (Model API base URL, usually ending in `/v1`), **模型名称** (Model ID) and **连接密钥** (API key). Use the details from your API provider. A local service that requires no key may leave the key blank.
4. Import `quote.txt` and set its document name to **`quote`**. Leave automatic actions disabled for this first task.
5. Keep the five defense checks enabled under **防护设置与技能** (Defense settings and skills), with **拦截或等本人确认** (Block or wait for my confirmation).
6. Click **创建独立工作** (Create a separate task), then **启动工作** (Start task). After startup, click **进入 OpenClaw** or **进入 Hermes** (Enter the selected agent).

The importer accepts up to 8 UTF-8 `.txt` / `.md` files, at most 256 KiB each and 1 MiB total. PDF, Word, Excel and image import are not supported. Each task keeps a copy of the original documents; later edits to your source file do not update that task.

## 5. Talk to the agent and check the result

In the native agent chat, send:

> Read quote, list the three costs, calculate the total, and say what still needs confirmation. Reply only in chat.

The expected total is **10,000 CNY**; the supplier is not confirmed. Check the actual document-read record and the answer. The model can still make mistakes; permission controls do not guarantee a correct answer.

You can ask for a shorter version or a table. New chats and clean restarts of the same task retain its document and sending permissions.

When ready to allow external work, register fixed targets in **可确认的操作对象** (Reviewable action targets), then select them in **自动执行范围** (Automatic action scope) while creating a new task. Messages, text uploads and forms can execute after the required checks. Targets must use the implemented protocols and controlled endpoints; a third-party chat page URL is not an API endpoint. [Scope instructions](automatic-work.zh-CN.md) · [Workbench details](workbench.zh-CN.md). Emails and sensitive file operations still require individual review.

## 6. Stop or reopen the task

Click **暂时关闭** (Stop for now) on the task card and wait for the workbench to confirm it has stopped. **Closing the browser or workbench alone does not stop running agents.**

Next time, run the same `open-yuanxingmu` command, then start the existing task to continue. Use **防护记录** (Defense records) to inspect a pause; opening a new chat does not bypass it. Only resume after reviewing and resolving its recorded reasons.

**永久收回权限** (Permanently revoke permissions) prevents later controlled document reads and sends and cannot be undone in this preview. It does not erase already-read content, retract previous submissions or stop local computation. Use **暂时关闭** as well when you want the task to stop running.

## If something goes wrong

- **Isolation check fails:** confirm Ubuntu 24.04 / x86_64 and the required system components. Keep the error; do not bypass the isolation check.
- **Model returns 401/404 or cannot use tools:** check the API base URL, model ID, key and tool-call support. Local addresses must work from Ubuntu/WSL. Changing the model configuration requires a new task in this preview.
- **The page cannot be opened:** keep the launcher terminal running and use its current complete link. A link from before a workbench restart is no longer valid.
- **An operation's outcome is unknown:** inspect the receiver or file before making another attempt. The system does not automatically repeat an uncertain external action.

[Report an issue](https://github.com/yh-l20/agentsec/issues/new) with versions, steps, the exact error and redacted logs. Remove API keys, private documents and access links. Keep the task directory and its permission records intact. [Installer details](../install/README.md) · [Runtime boundaries](yuanxingmu.md).
