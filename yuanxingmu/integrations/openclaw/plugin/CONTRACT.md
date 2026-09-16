# OpenClaw 原生插件契约

插件和 sandbox backend 均注册为 `yuanxingmu`，入口 `index.mjs`，当前核对版本为 OpenClaw `2026.9.4`。本插件直接接收 OpenClaw 模型调用，不包含模型服务或脚本回答。

由可信启动器提供且不可来自工具参数的配置：

| 字段 | 值 |
|---|---|
| `python`、`bwrap` | Linux 上可执行文件的绝对路径 |
| `corePath` | 含 `yuanxingmu/` Python 包的可信目录 |
| `workspace` | 当前固定任务的独立可写工作目录 |
| `brokerSocket` | 已绑定当前持久任务的 Unix socket |
| `operatorSocket` | 仅管理者可用的另一 Unix socket，不挂入 worker |
| `auditPath` | workspace 之外的原生执行日志路径 |
| `resourceIds`、`destinationIds` | 操作者配置的资料名称和接收位置名称数组；可为空 |

路径全部固定；可信代码、日志、socket 和可写 workspace 不得重叠。插件工具要求 host 上下文中的 `sandboxed === true`、非空 `sessionKey` 和实际 workspace 匹配。工厂和执行前都核验。所有聊天使用同一任务，`sessionId` 和 `/new` 不创建新权限身份。

| 工具 | 精确参数 | 向固定 broker 发送 |
|---|---|---|
| `yuanxingmu_read` | `{"resource":"已配置名称"}` | `{"op":"read","resource":"已配置名称"}` |
| `yuanxingmu_send` | `{"destination":"已配置名称","body":"正文"}` | `{"op":"send","destination":"已配置名称","body":"正文"}` |
| `yuanxingmu_status` | `{}` | `{"op":"describe"}` |

工具声明包含明确的行为提示注解（annotations）：`yuanxingmu_read`、`yuanxingmu_status` 与 `yuanxingmu_action_targets` 标注为 `readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false`；`yuanxingmu_prepare_email` 与 `yuanxingmu_prepare_action` 仅在工作台暂存待核对草稿/提案，标注为 `readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false`；涉及实际立即外发或执行的 `yuanxingmu_send` 与 `yuanxingmu_request_action` 标注为 `readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false`。宿主和模型可依据这些显式布尔值提示推导调用副作用与确认边界。

参数由运行时代码再次校验，不接受额外字段、URL、文件路径、任务 ID、标签或任意操作名。正文限制为 UTF-8 编码后 256 KiB。无配置资源/接收位置时，read/send 的调用不能通过校验。三个工具均为 optional；全局 `tools.allow` 与 `tools.sandbox.tools.allow` 应精确允许上述三项及 `exec`。固定配置同时要求 `exec.host="sandbox"`、`sandbox.mode="all"`、`backend="yuanxingmu"`、`workspaceAccess="rw"`、禁用 elevated 和其他发送工具。

结果位于原生 `AgentToolResult.details`，正常响应保留实际 broker 对象；`content` 含中文解释和该 JSON。参数/上下文校验失败返回 `allowed:false`，且不会访问 socket。IPC 错误返回 `allowed:null, outcome:"unknown", reason:"broker_response_unavailable"`，不能把断线或超时解释成“没有发送”。只有实际 `outcome:"acknowledged"` 才说明接收服务返回成功确认。

用户命令 `/yuanxingmu` 与 `/yuanxingmu-revoke` 由 `registerCommand` 仅在 `full` 模式注册，均要求认证管理者及 `operator.admin`，不接受参数，也不成为模型工具。

`/yuanxingmu` 只向固定管理 socket 发送 `{"op":"status"}`。主机持锁读取当前五层的启用位和实际处理方式、暂停与撤权状态，并核对安装检查报告是否对应当前策略。聊天只显示白名单中的状态，不显示目标正文、事件原文、凭证、内部路径或服务返回的 URL。关闭、只记录、拦截分别显示；服务未就绪、旧服务缺少摘要、字段不完整或读取故障均明确写为未确认。状态查询不会调用模型或重新扫描。

工作台说明引导本人回到元星木工作台的“防护记录”；网页已关闭时，用原启动器和终端显示的管理链接打开。命令不猜测工作台端口，也不把原生聊天地址当成管理地址。设置修改和暂停恢复仍通过已认证的工作台执行。

`/yuanxingmu-revoke` 只发送 `{"op":"revoke"}`，期待 `operator_action="revoke"`、`task.active=false`、`task.revoked=true`。它撤销读取和发送权限，不停止本地计算或 Gateway；停止服务由可信启动器负责。

可信启动器负责保存任务和初始标签、限制模型选择、隔离 profile/state/config/history、启动 broker、禁止其他插件工具和外部消息通道。模型服务和持久会话存储属于获准资料处理方。原生 exec 沿用隔离 worker 和可信 `python -I` 引导；模型传入的 exec 环境不会成为启动器环境或权限来源。当前范围为前台 exec；不给予 process 工具，PTY 不受支持。此契约不声称覆盖未知插件、其他 harness、后台进程或内核漏洞。

新增原生执行审计只保存命令 SHA256、字节数、调用关联和退出状态，不复制完整命令或参数。shell helper 的散列输入是 `[script, ...args]` 的 UTF-8 JSON；普通 exec 的散列输入是实际 command 字符串的 UTF-8 字节。OpenClaw 自身的本地会话记录仍包含正常模型交互与工具结果，应按私密资料保护。

启动 Python 使用 `-I -B`，忽略工作目录的包替换及 Python 环境注入，并避免创建 `__pycache__` 改变可信快照。固定引导代码在导入 `yuanxingmu` 前设置 Linux `PDEATHSIG=SIGTERM`，前后检查父进程仍为创建 exec 的 Gateway。当前启动契约是启动器管理的前台 Gateway；有中间 relay 的其他 service 启动方式会被拒绝，未宣称支持。Gateway 退出后 worker 会收到终止信号；整个进程树的停止和回收仍由可信启动器负责。
