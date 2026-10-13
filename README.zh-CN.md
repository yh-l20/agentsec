# 元星木 · Yuanxingmu

**让 OpenClaw / Hermes 干活，先管住它能读什么、能发给谁。**

元星木是本机权限工作台。选择资料和接收对象，创建一份独立工作，再到 **OpenClaw 或 Hermes 原来的聊天界面**交代任务。范围内且通过检查的消息、文本上传和填表，可以自动完成。

**Ubuntu 24.04 / WSL · x86_64 · 预览版** — 连接你自己的模型接口，其余正常任务内容仍会交给该模型服务。

**[开始安装](https://yh-l20.github.io/agentsec/start.html#install)** · **[看 100 秒实录](https://yh-l20.github.io/agentsec/layers.html#openclaw-protected-fields)** · [English](README.md) · [官网](https://yh-l20.github.io/agentsec/)

[![30秒真实OpenClaw录屏摘选：合成任务、底价先隐藏、三份实际本机接收记录](site/assets/videos/openclaw-short/overview.gif)](https://yh-l20.github.io/agentsec/#first-look)

*30秒真实录屏摘选，中英字幕；片长不代表任务耗时。画面使用 **0.7.0a1**（`c83add3`）、OpenClaw 2026.9.4 和 GLM-5.2，当前下载是 **0.7.0a2**。[100秒完整实录与限制](https://yh-l20.github.io/agentsec/layers.html#openclaw-protected-fields)。*

## 这段实录里，实际做成了什么？

只交代一次：读取报价和供应商资料，发一条消息、上传一份文本摘要，再填一张表。

- 资料中明确标记的内部底价，在交给模型前隐藏。
- 供应商资料夹带的伪系统指令被扣留，其他已授权工作继续完成。
- 三个**本机合成接收端**各收到一次，没有追加提示或逐项批准；最终回复与实际接收记录一致。

[查看完整会话与接收内容](docs/evidence/openclaw-protected14-2026-09-12/README.md)。这是一次限定场景实测，没有通用防护率结论。上传原始记录存在原因未明的时间顺序异常，不据此证明耗时或性能。

## 用自己的资料试一次

[已发布的安装器](https://github.com/yh-l20/agentsec/releases/tag/installer-0.4.0a2)准备 **元星木 0.7.0a2**、**OpenClaw 2026.9.4** 和 **Hermes 0.21.2 / v2026.9.11**。首次需要 Ubuntu 终端，以及支持工具调用的模型接口。

[下载 0.4.0a2 安装器](https://github.com/yh-l20/agentsec/releases/download/installer-0.4.0a2/yuanxingmu-installer-0.4.0a2.pyz)，放到 Ubuntu 主目录，然后运行：

```bash
/usr/bin/python3 -I "$HOME/yuanxingmu-installer-0.4.0a2.pyz" --install-root "$HOME/yuanxingmu-v07a2" --system-deps
"$HOME/yuanxingmu-v07a2/open-yuanxingmu"
```

[完整安装和第一次使用](https://yh-l20.github.io/agentsec/start.html#install)包含 Windows / WSL 准备、模型设置和示例资料。使用新的安装目录；旧安装和旧工作不会自动升级。

1. **先定范围。** 选短文本资料，写清工作要求；需要外发时，选好固定消息、上传或表单对象。
2. **进入助手。** 从工作台打开 OpenClaw 或 Hermes，交代这份任务。
3. **核对结果。** 查看实际操作记录，用完可以暂时关闭工作，或永久收回资料权限。

关闭浏览器标签页不会停止运行中的工作。结束时请先在工作台点击“暂时关闭”。

## 你可以管住什么？

| 功能 | 实际作用 |
| --- | --- |
| 资料与接收对象 | 宿主核对已登记的资料和目的地；任务读过私密资料后，可发送的范围随之受限。 |
| 敏感字段保护 | 明确标记的底价、密码和令牌先隐藏，再交给模型；后续输出检查支持的等价写法。[具体规则](docs/protected-fields.zh-CN.md)。 |
| 五层检查 | 检查外部指令、记忆修改、任务偏移、危险命令，以及选中的技能与配置。[每层都有 Hermes 实录](https://yh-l20.github.io/agentsec/layers.html#hermes-five-layers)。 |
| 授权内自动执行 | 选定的消息、文本上传和表单，通过权限、内容与额度检查后自动执行。[怎样设范围](docs/automatic-work.zh-CN.md)。 |
| 具体操作确认 | 邮件和敏感文件修改仍需核对具体对象与全文。[邮件实录](https://yh-l20.github.io/agentsec/email-demo.html)。 |
| 关闭、重开与撤权 | 换聊天、正常重启仍保留原权限；撤权限制后续受控读取与发送，不会抹去已读内容或撤回已完成操作。 |

## 防护在哪里生效？

权限由 **可信宿主上的 Broker 和 SQLite 账本**管理，Worker 不能清空读取标签；子任务的资源和目的地权限不得超过父任务。Linux 命名空间与 bubblewrap 隔离执行环境。宿主配置、策略和路径选择仍由可信操作方负责。

只有进入这个执行环境或受控 Broker 的操作受到保护，不会接管已有任意 Agent 安装或宿主工具。消息、上传和表单使用已实现的协议与受控端点；本机接收端实测不代表任意第三方服务都可直接接入。[架构与边界](docs/positioning.md) · [底层运行说明](docs/yuanxingmu.md)。

当前导入短 UTF-8 文本，暂不直接导入 PDF、Word 或图片。敏感字段只覆盖明确标签和有限格式，不能识别任意秘密、编码或推算；工作模型和检查模型会收到各自所需的内容。检查可能漏判，也可能误拦正常工作。[支持范围与限制](docs/framework-support.zh-CN.md)。

## 更多实录与开发接入

[104 秒 Hermes 实录](https://yh-l20.github.io/agentsec/layers.html#hermes-protected-fields)同样无需逐项批准，三项本机提交各到达一次。结尾表单名称写错一个字，[严格完整协议仍未通过](docs/evidence/hermes-auto19-2026-09-12/REPORT.zh-CN.md)。这轮录制也使用 0.7.0a1。

<details>
<summary>查看历史结果、已知失败与核验记录</summary>

- [AUTO18](docs/evidence/hermes-auto18-2026-09-12/REPORT.zh-CN.md)：三项提交完成，但两段显示的回答泄露了底价，检查模型两次错误放行。恶意正文已扣留，没有证据证明提示注入成功。
- [AUTO17](docs/evidence/hermes-auto17-2026-09-12/REPORT.zh-CN.md)：上传因参数错误没有开始；后续危险命令被拦，暂停后的新聊天也不能继续调用。
- [AUTO16](docs/evidence/hermes-auto16-2026-09-12/REPORT.zh-CN.md)与[AUTO15](docs/evidence/hermes-auto15-2026-09-12/REPORT.zh-CN.md)：保留自动接收、未完成项和正常工作误拦。[授权上下文修复](docs/evidence/review-facts-2026-09-12/REPORT.zh-CN.md) · [待确认申请修复](docs/evidence/pending-effect-2026-09-12/REPORT.zh-CN.md)。
- [早期 OpenClaw 资料权限实录](docs/real-openclaw-demo.zh-CN.md)：一次内部接收、零次外部接收，撤权后的读取与发送被拒；也保留了模型读错资料、由用户纠正的过程。
- [底层执行证据](examples/yuanxingmu/verified-core-report.json) · [独立 Linux CI 记录](examples/yuanxingmu/verified-hosted-report.json) · [功能覆盖与缺口](docs/agentward-coverage.zh-CN.md)。

各轮记录保留原版本与范围，后来修复不会把过去未通过的实验改成通过。

</details>

`main` 还提供 [smolagents](docs/sdk-runtime.zh-CN.md)、[LangGraph](docs/langgraph-runtime.zh-CN.md)、[OpenAI Agents](docs/openai-agents-runtime.zh-CN.md)、[PydanticAI](docs/pydantic-ai-runtime.zh-CN.md) 和 [Google ADK](docs/google-adk-runtime.zh-CN.md) 的固定会话流程，复用宿主防护与持久恢复。这些开发入口**尚未进入 0.7.0a2 下载包**，仅覆盖各自文档中的流程。[框架支持表](docs/framework-support.zh-CN.md)。

[底层演示与接入命令](docs/yuanxingmu.md) · [安装器详情](install/README.md) · [历史 MCP 验收工具](LEGACY-MCP.zh-CN.md) · [0.7 海报](site/assets/yuanxingmu-public-v07-poster.png)

## 一起把它做得有用

遇到问题，可以[提交可复现的 Issue](https://github.com/yh-l20/agentsec/issues/new)，附系统、助手与运行包版本、操作步骤和脱敏日志。不要上传模型密钥或私有管理链接。也欢迎[提交 PR](https://github.com/yh-l20/agentsec/pulls)。

如果你也需要这样管理自己的 Agent，欢迎 **Star 仓库**，让更多使用者看到它。[MIT 许可证](LICENSE)。
