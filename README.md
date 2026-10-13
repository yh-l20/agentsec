# Yuanxingmu · 元星木

**Choose what OpenClaw or Hermes may read, and where it may send.**

Yuanxingmu is a local permission workbench. Create a separate task, select its documents and recipients, then work in **OpenClaw or Hermes's native chat UI**. Authorized messages, text uploads and forms can run without approving each step.

**Ubuntu 24.04 / WSL · x86_64 · Preview** — uses your own model API. Normal task content still reaches that model service.

**[Install — English](docs/quickstart.en.md)** · **[中文安装](https://yh-l20.github.io/agentsec/start.html#install)** · **[Watch the 100-second demo](https://yh-l20.github.io/agentsec/layers.html#openclaw-protected-fields)** · [中文 README](README.zh-CN.md)

[![30-second excerpt of real OpenClaw screens: a synthetic task, masked floor price and three actual local receipts](site/assets/videos/openclaw-short/overview.gif)](https://yh-l20.github.io/agentsec/#first-look)

*30-second excerpt of real screens, with English and Chinese captions; this is clip length, not execution time. The recording uses **0.7.0a1** (`c83add3`), OpenClaw 2026.9.4 and GLM-5.2. The current download is **0.7.0a2**. [Full 100-second recording and limits](https://yh-l20.github.io/agentsec/layers.html#openclaw-protected-fields).*

## What happened in the demo?

One request asked OpenClaw to read a quote and supplier note, send a message, upload a text summary and fill a form.

- The explicitly labelled internal floor price was hidden before model access.
- A forged system instruction in the supplier note was withheld; the authorized work continued.
- Three **local synthetic receivers** each received one submission, with no follow-up prompts or individual approvals. The final reply matched their actual receipts.

[Inspect the full conversation and receipts](docs/evidence/openclaw-protected14-2026-09-12/README.md). This is one bounded scenario, not a general protection rate. The original upload record has an unexplained timestamp inversion; it does not establish timing or performance.

## Try it with your own agent task

The [released installer](https://github.com/yh-l20/agentsec/releases/tag/installer-0.4.0a2) prepares **runtime 0.7.0a2**, **OpenClaw 2026.9.4** and **Hermes 0.21.2 / v2026.9.11**. First-time setup needs an Ubuntu terminal and a model API that supports tool calls.

[Download installer 0.4.0a2](https://github.com/yh-l20/agentsec/releases/download/installer-0.4.0a2/yuanxingmu-installer-0.4.0a2.pyz), put it in your Ubuntu home directory, then run:

```bash
/usr/bin/python3 -I "$HOME/yuanxingmu-installer-0.4.0a2.pyz" --install-root "$HOME/yuanxingmu-v07a2" --system-deps
"$HOME/yuanxingmu-v07a2/open-yuanxingmu"
```

[English setup and first task](docs/quickstart.en.md) covers WSL, the model connection, an example file and the workbench's Chinese button labels. Use a new installation directory; older installations and tasks do not automatically upgrade.

1. **Choose the scope.** Select short UTF-8 documents, describe the task and optionally authorize fixed message, upload or form targets.
2. **Open your agent.** Enter OpenClaw or Hermes from the workbench and give it the task.
3. **Check the outcome.** Review actual action records. Stop the task when finished, or permanently revoke its document permissions.

Closing a browser tab does not stop a running task. Use the workbench's stop control before leaving.

## What you can control

| Control | What it does |
| --- | --- |
| Documents and recipients | The host checks registered resources and destinations. Reading private data constrains where that task may send. |
| Sensitive fields | Hides explicitly labelled floor prices, passwords and tokens before model access; checks supported value forms in subsequent output. [Exact rules](docs/protected-fields.zh-CN.md). |
| Five defense checks | Checks external instructions, memory changes, task drift, dangerous commands, and selected skills/configuration. [Five real Hermes recordings](https://yh-l20.github.io/agentsec/layers.html#hermes-five-layers). |
| Automatic actions | Selected messages, text uploads and forms execute after permission, content and budget checks. [How scope works](docs/automatic-work.zh-CN.md). |
| Reviewed actions | Emails and sensitive file changes require reviewing the specific target and content. [Email walkthrough](https://yh-l20.github.io/agentsec/email-demo.html). |
| Stop, reopen, revoke | New chats and clean restarts retain task permissions. Revocation blocks later controlled reads/sends; it does not erase content already seen or undo completed actions. |

## Where the protection applies

Permissions live in a **trusted host broker and SQLite ledger**, outside the worker. Linux namespaces and bubblewrap isolate execution. Worker processes cannot clear the host's read labels; delegated resource and destination permissions cannot exceed the parent's. Host setup, policies and selected paths remain trusted operations.

Protection covers actions routed through this execution environment and its broker. It does not take over arbitrary existing agent installs or host tools. Messages, uploads and forms use implemented protocols and controlled endpoints; local receiver evidence does not prove compatibility with every third-party service. [Architecture and boundaries](docs/positioning.md) · [Runtime details](docs/yuanxingmu.md).

This preview accepts short UTF-8 text files, not direct PDF/Word/image imports. Field protection uses explicit labels and finite formats; it cannot identify every secret, encoding or inference. The task and checking models receive the content needed for their roles. Checks can miss problems or block legitimate work. [Current support and limits](docs/framework-support.zh-CN.md).

## More evidence and developer integrations

[Hermes 104-second recording](https://yh-l20.github.io/agentsec/layers.html#hermes-protected-fields) also completed three local submissions without individual approvals. Its final reply misspelled one form name; the [full protocol remains failed](docs/evidence/hermes-auto19-2026-09-12/REPORT.zh-CN.md). That run is also version 0.7.0a1.

<details>
<summary>Earlier outcomes, failures and verification records</summary>

- [AUTO18](docs/evidence/hermes-auto18-2026-09-12/REPORT.zh-CN.md): three submissions arrived, but two displayed replies disclosed the floor price and the judge incorrectly allowed them. The malicious source was withheld; this did not demonstrate successful prompt injection.
- [AUTO17](docs/evidence/hermes-auto17-2026-09-12/REPORT.zh-CN.md): a normal upload never started because of malformed arguments; the task remained paused after a later blocked command, even in a new chat.
- [AUTO16](docs/evidence/hermes-auto16-2026-09-12/REPORT.zh-CN.md) and [AUTO15](docs/evidence/hermes-auto15-2026-09-12/REPORT.zh-CN.md): automatic receipts, incomplete work and false blocking. [Authorization-context repair](docs/evidence/review-facts-2026-09-12/REPORT.zh-CN.md) · [Pending-request repair](docs/evidence/pending-effect-2026-09-12/REPORT.zh-CN.md).
- [Earlier OpenClaw permission session](docs/real-openclaw-demo.zh-CN.md): one internal delivery, no external deliveries, and denied reads/sends after revocation; the model also read the wrong document before correction.
- [Execution-core evidence](examples/yuanxingmu/verified-core-report.json) · [Independent Linux CI evidence](examples/yuanxingmu/verified-hosted-report.json) · [Feature coverage and gaps](docs/agentward-coverage.zh-CN.md).

Each record retains its own source version and scope. Later changes do not turn a failed run into a passed one.

</details>

On `main`, fixed workflows for [smolagents](docs/sdk-runtime.zh-CN.md), [LangGraph](docs/langgraph-runtime.zh-CN.md), [OpenAI Agents](docs/openai-agents-runtime.zh-CN.md), [PydanticAI](docs/pydantic-ai-runtime.zh-CN.md) and [Google ADK](docs/google-adk-runtime.zh-CN.md) use the host defenses and persistent recovery. These developer entries are **not in the frozen 0.7.0a2 download**, and support is limited to the documented workflows. [Framework support matrix](docs/framework-support.zh-CN.md).

[Core demo and custom command guide](docs/yuanxingmu.md) · [Installer details](install/README.md) · [Legacy MCP verifier](LEGACY-MCP.md) · [0.7 poster](site/assets/yuanxingmu-public-v07-poster.png)

## Help make it useful

[Report a reproducible issue](https://github.com/yh-l20/agentsec/issues/new) with your OS, agent/runtime versions, steps and redacted logs. Keep model keys and private management links out of reports. [Pull requests](https://github.com/yh-l20/agentsec/pulls) are welcome.

If you want this kind of control for your agent, **Star the repository** to help others find it. [MIT licensed](LICENSE).
