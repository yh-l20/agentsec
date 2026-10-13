# 玄甲 AgentWard 功能对照与验收清单

核查日期：**2026-09-12**。比较对象是 [FIND-Lab/AgentWard](https://github.com/FIND-Lab/AgentWard)，不是名字相近的其他产品。本次通过 GitHub API 确认其 `main` 为 [`46309333bdfdbcf4701000c1dad85b33b4a0e7ef`](https://github.com/FIND-Lab/AgentWard/tree/46309333bdfdbcf4701000c1dad85b33b4a0e7ef)，提交时间为 2026-06-04 11:47:33 UTC；下列玄甲链接固定在这个版本。核查包括 README、配置、主插件、五层实现、命令、警告和日志代码。

元星木的目标是覆盖这些实际功能，再补上权限、隔离和真实发送的控制。**目前不能宣称已全面覆盖或效果超过玄甲**：功能已写入、组件检查通过、原生 Agent 确实触发并被拦截，是三种不同的证据。

## 单次任务：AUTO19 的改进与边界

0.7 源码 `c83add3` 的 [AUTO19 原生实录](evidence/hermes-auto19-2026-09-12/REPORT.zh-CN.md)中，明确标出的内部底价在进入 AI 前被隐藏；供应商伪系统指令由输入规则扣留后，Hermes 继续完成消息、文本上传和表单。三个本机合成接收端各收到一次，没有逐项批准、人工恢复或操作者补参数。[104 秒视频](https://yh-l20.github.io/agentsec/layers.html#hermes-protected-fields)展示实际过程。

**这次防护与实际提交检查通过，严格完整协议仍为 false。** 模型最终把“合成报价表”写成“合造报价表”；实际表单目标、字段和值正确。原回复与错字保留，未重跑。当前版本与下载状态见[安装说明](https://yh-l20.github.io/agentsec/start.html#install)；旧版 0.6 与旧工作不包含这项新保护，旧安装不会自动升级。安装成功不等于本表所列防御效果全部通过，仍需分别阅读对应版本的实测记录。

<details>
<summary>完整核验范围，以及不能据此宣称的能力</summary>

独立检查覆盖全部模型请求、回复、官方工具消息及参数、接收正文，共 28 项；未发现底价或声明支持的等价金额写法。不是只核对最终回复。支持明确标签和有限值写法，不覆盖任意编码、推断、未知秘密或跨消息重组。伪系统指令未进入工作模型，不能称为模型抵抗了未看到的攻击。

[AUTO18](evidence/hermes-auto18-2026-09-12/REPORT.zh-CN.md) 中的两次可见回复泄露和检查模型错误放行仍然保留；AUTO15–17 的误拦和未完成步骤也不改写。AUTO19 只是一轮固定 Hermes 任务，不能外推为 OpenClaw 或十一组 SDK 均完成原生保护验收，也不是与玄甲同条件的整体胜负比较。

</details>

## 如何读这份表

- **已实现**：有可调用代码，不表示已完成真实 Agent 验收。
- **组件验证**：检查过真实函数、HTTP/Unix socket、文件系统或插件模块；测试中的裁判回答可能是预设响应。
- **原生验证**：官方 Agent 在对应版本实际运行；只有观察到候选危险调用、拦截决策及下游结果，才算验证该次拦截。
- **待完成**：接口、完整覆盖范围或证据仍有缺口；不会把“没有发生危险行为”当成拦截成功。

这里的“语义偏移”是：用户请 AI 整理文件，AI 却准备向陌生人发资料；“危险指令阻断”是：在真正运行删文件、提权或下载执行代码之前停住。两者需要同时工作，不能只靠一个模型回答“安全”。

新增核查记录：[输入、记忆与命令逐类别补漏](agentward-rule-audit-2026-09-12.md)、[外部危险命令指令与记忆条件破坏](evidence/rule-parity-2026-09-12/REPORT.zh-CN.md)、[OpenClaw 实机结果与误报](openclaw-layers-validation-2026-09-12.md)、[独立检查模型及其漏判](judge-configuration.zh-CN.md)。

## 五层逐项对应

| 玄甲实际功能 | 元星木实现和证据 | 当前缺口或边界 |
|---|---|---|
| **输入：识别外部内容伪造系统角色、模板标记、越狱、覆盖既有指令、索要凭证**。[源码](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/input-sanitization.ts) | [`Guards.check_input`](../yuanxingmu/guards.py) 做规范化及规则检查；命中时以固定说明替代外部内容。Broker 与 OpenClaw/Hermes 工具路径有接入；[`test_yuanxingmu_guards.py`](../tests/test_yuanxingmu_guards.py) 覆盖规则及关闭/观察模式。GLM14 已验证供应商合成文本被扣留，恢复后正常报价读取成功。 | 规则不穷尽所有提示注入。需要按网页、文件、消息、搜索结果等原生来源分别验证，不能以邮件案例代表全部。玄甲的警告类型定义也不等于所有类型都有实际检测器。 |
| **输入：递归检查工具结果里的字符串、数组和对象**。 | Broker 对输入文本检查；原生插件整理工具结果后送主机检查，保留文本换行，避免重复 JSON 编码导致漏检。 | 新增钩子的模块测试不能代表所有官方工具结果类型；图片、音频、嵌入对象等未建立完整承诺。 |
| **输入/记忆：外部文字要求执行危险命令，或将破坏指令留待以后触发**。 | 新规则对明确执行要求检查相邻命令，补齐递归删除、提权、磁盘破坏、常见包装和下载执行等语法；记忆和所选技能规则复用。教学引用、否定句、正常条件偏好和 token 统计另有对照。独立复核发现的转义引号及无围栏多行遗漏已修复。22 项专属加既有 48 项 guards 检查，Linux **70/70**；Windows 58 通过、12 项 Linux 接口跳过。[前后结果与范围](evidence/rule-parity-2026-09-12/REPORT.zh-CN.md) | 本轮仅组件证据，未执行危险命令或模型。有限语法不能穷尽自然语言改写；未把裸 token/secret 等模糊用语一概封禁，仍有与玄甲不同的规则。旧实机视频不计为本轮验证。 |
| **输入：按配置插入提醒、替换危险内容、暂时停用工具、覆盖受污染回答**。[主插件](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/index.ts) | 危险输入不交给 AI；[`quarantine.py`](../yuanxingmu/quarantine.py) 在主机暂停整项工作及分出的任务，作废未使用审批和待确认草稿；[`model_output.py`](../yuanxingmu/model_output.py) 收齐模型响应后检查，拒绝时只返回明确的主机提醒。暂停 16 项、当前响应协议与真实套接字 25 项测试通过。 | 暂停需本人恢复，不随下一条用户消息解除。回答检查覆盖所接入模型接口的正文、拒绝及思考文本；工具卡参数、图片、工具结果和旧聊天记录另有边界。GLM14 已验证三次真实工作台恢复和暂停后新聊天；更多原生来源与后续代码仍需验收。详见[回答与暂停](response-and-quarantine.md)。 |
| **记忆：检查 `write/edit/exec` 对 MEMORY.md、memory/、SOUL.md、IDENTITY.md、AGENTS.md、USER.md、TOOLS.md 的改写**。[源码](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/cognition-protection.ts) | [`Guards.check_memory`](../yuanxingmu/guards.py) 识别受保护名字、写入/补丁工具及命令中的改写；规则对安全绕过等内容给出拦截。组件用例覆盖正常写入和恶意记忆修改。 | 通过任意编程语言或别名改写的情况不能仅靠文本规则穷尽。宿主只读挂载才承担不可改的边界。GLM14 已验证官方 `write_file` 写入 `SOUL.md` 被阻止且文件不存在；正常记忆写入、其他 file/terminal 路径仍需原生验收。 |
| **决策：用模型比较最近用户意图、上下文、助手行为，发现指令语义偏移**。[源码](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/decision-alignment.ts) | [`Guards.check_alignment`](../yuanxingmu/guards.py) 对照主机固定目标检查完整工具候选；`check_response` 检查收齐后的模型文字。两者采用不同检查提示，严格解析 `allow/block/review`。强制模式下模型缺失、超时、非法判定或审计失败均不放行。组件测试实际走 HTTP，裁判文本为预设响应。 | 不能保证识别所有偏离或恶意内容。同源码 native13/GLM14 均拦住含底价的真实邮件候选；GLM14 正常草稿创建成功，固定正常集未见语义误拦，native13 保留两次正常误拦。较新 AUTO15 的发送后回答再次误拦，不能据此称误报已解决。 |
| **执行：阻止毁损、提权、远程代码执行、反向 shell**。[源码](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/exec-control.ts) | [`Guards.check_command`](../yuanxingmu/guards.py) 检查命令分段、解释器包装、敏感操作与下载执行；OpenClaw 钩子与 Hermes terminal provider 在执行前调用。危险硬规则优先于模型的“需审批”。 | 解析器有明确支持范围；它不是任意 shell 或程序的形式化证明。GLM14 已验证两次 `true` 成功、`sudo true` 执行前阻止；其他命令、代码执行器和子 Agent 入口仍需逐项实测。 |
| **执行：敏感凭证/环境访问、资源耗尽、无限循环转人工审批**。 | 明确的凭证窃取、进程爆炸等直接阻止；需要核对的候选进入主机一次性审批，批准绑定完整参数与本次调用。主机审批的 4 项账本测试及 11 项真实 Broker 套接字测试通过。Hermes 适配已接入这条审批路径。 | 策略和玄甲不完全相同。当前没有 CPU/内存/磁盘配额。Hermes native12 已完成官方写文件的一次真实工作台批准后执行；这证明该次动态写入审批链，不表示上述敏感命令类别已全部原生验收。 |
| **基础：检查 Gateway 暴露、认证、会话隔离、敏感工具配置**。[源码](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/foundation-scan.ts) | [`Guards.scan_foundation`](../yuanxingmu/guards.py) 检查显式配置快照：绑定地址、认证、工具清单、提权、直接联网、隔离执行、会话分离、凭证归属、技能固定。缺字段或无效字段不会当成正常。 | 这是对主机声明和选定文件的检查；不等于自动发现机器上全部暴露端口或所有插件。应与实际进程、挂载和网络验证共同验收。 |
| **基础：技能清单、内容规则检查、模型检查及可信哈希缓存**。 | 现有扫描器在 Linux 逐级不跟随链接，限制文件大小、总量、深度，读取完整 UTF-8 文件后检查；拒绝硬链接、特殊文件和无法完整扫描的内容。[`skills.py`](../yuanxingmu/skills.py) 已实现显式选中技能的内容寻址只读快照、精确清单及启动前重验；28 项 Linux 组件测试通过，包括真实只读挂载。 | 固定扫描目录必须与 Agent 最终加载目录相同。Hermes 默认采用空技能库、显式选择后挂载；不能仅因源码目录只读就把 `skills_pinned` 写成 true。GLM14 已验证所选普通技能可以启动，危险技能在官方助手启动前被规则拒绝；这不替代对更多官方加载目录、挂载和自动复制路径的验收。 |
| **基础：将技能宣称的用途与所属代码文件对照**。[玄甲实现](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/foundation-scan.ts#L463) | 带 `skill_purpose_v1` 的新工作，将所选技能根目录的完整 `SKILL.md` 与各文件内容一起送审；用途、代码及摘要来自同一次固定快照读取。多个技能不混用说明，子目录同名文件不能替换根用途。缺失、空白或只有标题/名称时记录 `skill_purpose_missing`，不称检查完整。[组件证据](evidence/skill-purpose-2026-09-12/REPORT.zh-CN.md) | 随技能语义开关运行。存在性规则不证明用途明确或模型判断正确；用途矛盾的识别仍可能误报、漏判。没有执行技能代码，也没有把旧实机录像当作本功能验收。 |

这组新增检查在开发时完成了 **Linux/WSL 51 项组件测试**；Windows 完成 27 项，另外 24 项因依赖 Linux 的隔离或文件系统接口跳过。这些数量对应当时的 guards、Broker 与原生钩子组件，不是 51 次真实模型攻击，也不是当前所有模块的完整测试总数。

技能快照另有 [`test_yuanxingmu_skills.py`](../tests/test_yuanxingmu_skills.py) 的 28 项 Linux 测试：来源修改、路径链接、硬链接、管道、非文本、超限和快照篡改都不静默跳过；同用户进程在实际 bubblewrap 只读挂载中写文件和改权限均被拒绝。默认选择为空；选中集默认上限为 32 文件、单文件 64 KiB、总量 512 KiB、深度 16。超限需显式调整快照与扫描器双方限制，不能只扩大其中一个。这里没有调用模型，也没有运行官方 Agent。

另用安装的 OpenClaw 2026.9.4 真正加载器和工具执行包装器完成了 [`test_yuanxingmu_openclaw_hooks_sdk.mjs`](../tests/test_yuanxingmu_openclaw_hooks_sdk.mjs) 的 6 项检查。它复现并修正了只在 `full` 模式注册、导致实际 `discovery` 注册表没有防御钩子的缺陷；检查了正常允许、阻止、SDK 超时后晚到允许、取消和一次性审批。Unix socket 是真实的，裁判响应和下游实现是受控测试对象，**没有真实模型或 Agent 对话**。默认 SDK 钩子超时为 15 秒；插件显式设置 65 秒、主机通信限制 60 秒；更短的宿主超时仍会停止执行，但应记为检查失败，不能记为攻击识别成功。

独立套件的 Linux/WSL 结果为：[暂停测试](../tests/test_yuanxingmu_quarantine.py) **16/16**、当前[回答协议与 Unix HTTP 测试](../tests/test_yuanxingmu_model_output.py) **25/25**（2026-09-12 复验，8 项协议加 17 项真实 Unix HTTP，新增逐层观察与撤权边界）、[审批账本](../tests/test_yuanxingmu_tool_reviews.py)与[主机审批套接字](../tests/test_yuanxingmu_tool_review_broker.py)合计 **15/15**。它们不追加到上面的历史 51 项数字。暂停测试检查跨子任务、重启、并发恢复及旧审批失效；回答测试确认首段文字在收齐并完成检查前不发送，拒绝和超时不会漏出原文。新增状态检查区分暂停、永久撤权及状态读写故障：发送前拒绝时上游和裁判请求均为零；请求发出后发生撤权只说返回内容暂不展示，不误称请求尚未发送；提示不泄露内部错误，也不把未检查说成检查失败。这些回复均为本地预设数据，没有运行真实模型。

回答套件 **17/17 是历史结果**（7 项协议加 10 项 Unix HTTP）；当时 Windows 为 7 通过、10 跳过。当前 25 项已包含并扩展旧检查，两次结果不能相加，也不能把旧 Windows 数字写成当前套件的 Windows 验证。

Hermes `v2026.9.11 / 0.21.2` 的本地 `native07-layers` 首轮记录了正常读取，以及输入、记忆、危险命令和语义偏移的真实候选命中；独立 `native08-badskill` 在启动前拒绝恶意技能，并确认清理完成。同一批记录也保留了良性基础配置和正常摘要的误报。加入暂停、回答缓冲后的 `native10` 验证了正常读取与完整回答，以及暂停后新聊天没有新增上游模型任务或工具结果；两次正常本地写入仍被语义模型误拦，另有不合法命令，不算防御成功。[Hermes 实测说明](../yuanxingmu/integrations/hermes/VALIDATION.zh-CN.md)保留各次分类。这些旧快照当时尚未完成审批正常路径及完整五层视频。**这些记录不构成新版五层全通过，也没有运行冻结攻击集。**

随后独立冻结的 **Hermes native12** 已完成正常读取、一次官方 `write_file`、一次真实工作台批准、精确 50 字节文件落盘、`true` 退出码 0、`sudo true` 在执行前阻止，以及暂停后新聊天模型/工具调用均为 0。原生工具参数、批准来源、标准输入与实际文件一致，最后真实关闭并清理成功。[native12 核心报告](evidence/hermes-native12-2026-09-12/REPORT.zh-CN.md)保留哈希及范围。该轮未重跑恶意材料、记忆投毒、外发底价和危险技能，也早于后续设置历史与技能用途对照；不能拼接成最新代码五层全通过。

## 同源码补充：native13、GLM14 与五层视频

[native13 本地模型记录](evidence/hermes-five-layers-2026-09-12/REPORT.zh-CN.md)与 [GLM14 记录](evidence/hermes-glm14-2026-09-12/REPORT.zh-CN.md)均固定在 `6881138`，使用同一目标、12 条逐字冻结输入与合成资料，每轮 11 次实际工具调用。外部材料、恶意记忆、底价邮件草稿、提权命令和危险技能均有真实候选/启动请求及下游核对，不以模型口头拒绝计为拦截。两轮均完成一次人工批准后的精确 50 字节文件写入，没有邮件获准或发送。

native13 使用本地 Qwen3-4B 工作模型与 Qwen3-8B 检查模型，保留两次正常语义误拦及五次真实工作台恢复。GLM14 的两个角色均为远程 GLM-5.2，独立请求、不同上下文，thinking 关闭；本次固定正常集未观察到语义误拦，三次工作台恢复均有真实操作回执。两轮都验证暂停后新建官方会话的模型、工具及输入/输出 token 为零。固定输入相同不等于生成候选逐字相同，底价邮件的标点仍有差异；[协议对照](evidence/hermes-glm14-2026-09-12/COMPARISON.zh-CN.md)保留模型、接口与观察差异。没有重复采样，不能据此宣布某种模型更安全或整体超过玄甲。

GLM14 五段实录：[外部资料 · 52 秒](../site/assets/videos/hermes-glm14-input/hermes-glm14-input.mp4)、[长期记忆 · 56 秒](../site/assets/videos/hermes-glm14-memory/hermes-glm14-memory.mp4)、[任务偏移 · 62 秒](../site/assets/videos/hermes-glm14-alignment/hermes-glm14-alignment.mp4)、[危险命令 · 66 秒](../site/assets/videos/hermes-glm14-tools/hermes-glm14-tools.mp4)、[环境与技能 · 53 秒](../site/assets/videos/hermes-glm14-skills/hermes-glm14-skills.mp4)。[视频清单](../site/assets/videos/hermes-glm14-manifest.json)记录素材与证据绑定；技能片的网页只显示操作未完成，准确原因与未启动由实际日志核对。

后来 `9bd6605` 的 [AUTO15 自动工作记录](evidence/hermes-auto15-2026-09-12/REPORT.zh-CN.md)只完成一条真实自动消息到本机接收端；之后正常状态回答被误拦，整项工作暂停，连续流程验收失败。创建时一次授权后没有逐次批准或人工恢复，上传、表单及其他后续步骤未提交。读取阶段额外列出内部底价的是本地回答，该阶段没有外发请求。GLM14 视频不覆盖这一版自动执行代码，也不抵消 AUTO15 的失败。

## 五层以外，也必须对齐

| 功能 | 玄甲源码行为 | 元星木状态 |
|---|---|---|
| 人工审批 | OpenClaw `requireApproval`；展示候选操作；可配置超时。`allow-always` 只缓存本进程中**完全相同操作**的哈希。[主插件](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/index.ts) | 主机保存完整工具参数，工作台提供“只允许这一次/拒绝这一次”；5 分钟到期，重启作废未消费审批，消费回复丢失也不重新发许可。15/15 主机审批测试通过；邮件和其他动作仍有独立草稿确认。Hermes native12 一次官方 write_file、一次真实工作台批准后产生精确 50 字节文件已通过。未提供本进程持续批准或可调审批期限。[实机证据](evidence/hermes-native12-2026-09-12/REPORT.zh-CN.md) |
| 运行中配置 | 认证后的 `/agentward config get/set/reset`；无参数 `get` 列可写字段，按键读取可访问其他既有路径；`set` 仅允许 `layers.*` 和 `notifications.*` 现有叶子字段；`reset` 恢复启动时的这些字段。[命令](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/core/commands.ts#L109)和[回调](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/index.ts#L126)修改内存配置，未在此持久写回文件。 | 带 `live_settings_v1` 的实例经主机审批入口修改运行中设置；更旧实例须确认停止。工作台管理的工作在工作台保存，独立实例可用 `yuanxingmu defense set/reset/restore`；CLI 对工作台工作在写入前拒绝，`get` 仍可用。`reset` 全开并默认拦截；带快照的新实例另提供恢复创建时设置。新工作台每次保存检查读时版本，过期页面不能覆盖别人更新；历史记录入口、操作类型和安全字段前后差异。修改作废未用审批和草稿，不解除暂停或撤权。真实管理 HTTP + Unix socket **15/15**，框架运行状态为测试对象；原生配置验收另计，未提供聊天配置写入。[实现与边界](layer-settings.zh-CN.md) |
| 独立开关与仅观察 | 每层检测与干预可分别开关；配置表列有配置、技能、规则、语义选项，输入层有三项干预开关；但固定版本文件规则实际受 semanticDetection 与模型上下文的外层条件影响，关闭语义不会独立跑文件规则。通知可运行中修改，日志与审批等属于静态配置，不在命令写入范围内。[配置](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/config.ts#L9) | 已有五个启用位、默认 `enforce/observe`，以及五层各自的 `inherit/enforce/observe`；单层设置优先，摘要显示实际处理方式。事件区分关闭、观察与实际拦截。基础配置、技能语义、技能规则可分别开关，关闭项明确记录且不计为完整检查。规则与语义互不代替，安全读取和固定快照校验仍保留。逐层设置要求 `per_layer_settings_v1`，规则开关另要求 `skill_rules_v1`；旧实例不显示或接受新字段，旧绑定及 v1 创建基线保持兼容。未复刻玄甲输入层的三种干预组合。[新组件证据](evidence/skill-purpose-2026-09-12/REPORT.zh-CN.md)、[策略](../yuanxingmu/guards.py)、[界面](../yuanxingmu/dashboard/web/protection.js)、[验证](evidence/layer-settings-2026-09-12/REPORT.zh-CN.md) |
| 主动通知 | 当前通道和目标存在时，可调用 `openclaw message send` 发送警告。 | 暂停卡片、页签计数和需保留网页的本机桌面提醒；另有主机[后台提醒](background-notifications.zh-CN.md)，可关闭浏览器，Workbench 进程须运行。固定通用 JSON 接收地址、持久队列、重启补投、稳定事件编号及失败/容量显示。当前队列 28/28、真实工作台 HTTP + 本机接收端 15/15；重试已覆盖时钟回拨与跨进程/系统重启，旧队列格式升级前须停止旧工作台。没有宣称第三方 IM/邮件提供商已验收，也没有复刻玄甲的当前聊天通道发送。 |
| 事件记录 | 主机 logger 加 JSONL 文件日志，字段为时间、级别、消息。[日志](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/util/logger.ts) | 元星木记录层、候选哈希、判定、是否实际拦截、模型响应哈希和耗时；原始裁判文本留在主机审计。界面不直接展示原始敏感内容。日志不是防篡改远程审计系统。 |
| 警告作用范围 | 单次、暂时、到下一条用户消息；源码中所谓 permanent 也会在下一次用户请求清除。[警告](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/core/warnings.ts) | 已有单次候选判定、整项工作及子任务暂停、本人核对后恢复、永久撤销。相同未处理告警去重，新告警使旧页面的恢复请求失效；重启及下一条聊天消息不自动解除暂停。生命周期与玄甲不同，尚未复刻其全部警告时长选项；恢复也不能撤销永久撤权。 |
| 安装与平台 | README 标记 Linux 完整，macOS/Windows 进行中；OpenClaw 插件包，声明 peer 版本范围。 | 元星木执行隔离依赖 Linux/bubblewrap，Windows 通过 WSL；没有无隔离降级模式。支持特定 OpenClaw/Hermes 版本，不代表所有版本可装即用。 |
| 演示与上手 | README 已有中文/英文五层视频。[README](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/README.md) | 已有 OpenClaw 原生运行与邮件案例，以及 Hermes GLM14 的五段中文解说实录；每段附字幕、原片来源及证据哈希，见下方五段链接。它们只对应 `6881138` 的固定案例，不给后续规则或自动执行代码背书。 |

## 五项配置与记录的对齐进度

以下是源码差距及补齐进度。逐层模式、基础配置/技能语义/技能规则开关、字段前后审计、创建时设置恢复与技能用途对照已实现并通过组件检查。原生入口见最后一行；尚未实现或原生验收未完成的部分不计为已全面覆盖。P1 直接影响持续使用，P2 改善恢复和日常操作。

| 优先级与用户问题 | 玄甲实际能力 | 元星木现状与建议 |
|---|---|---|
| **P1：一层误报时，其余防护仍应拦截。已补齐组件能力。** | 各层检测和干预独立；例如[记忆、决策、执行设置](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/config.ts#L32)，[执行干预检查](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/index.ts#L321)。 | [`GuardPolicy`](../yuanxingmu/guards.py) 支持每层跟随默认／拦截／观察，原启用位负责关闭；UI 显示实际状态。保留旧全局语义、旧持久绑定和审计失败即停止。已验证单层观察不影响其他层、恢复继承、重开保留与回答观察不能绕过撤权。原生五层验收另行记录。 |
| **P1：看得懂哪项设置从什么改成什么。已补齐。** | [`set`](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/core/commands.ts#L139) 记录旧值、新值及成功结果；`reset` 记录恢复动作和字段数，未逐项记录差异。 | [`apply_profile_settings`](../yuanxingmu/protection.py) 对 CLI、工作台和主机入口统一记录允许设置字段的 `before/after`、入口、普通修改/恢复全开/恢复创建时设置，并保留状态编号、审批作废数量和策略哈希。工作台按白名单投影为可读差异，未知字段与非法值不会显示；不记录目标正文或凭证。新实时协议以 `settings_history_v1` 标记，旧运行实例不能冒称已有新审计记录。[证据](evidence/settings-history-2026-09-12/REPORT.zh-CN.md) |
| **P2：试调后能回到此前确认过的设置。已补齐创建基线。** | [`reset`](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/core/commands.ts#L158) 恢复[首次初始化保存的启动快照](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/index.ts#L97)，不是恢复统一默认值。 | 新实例保存主机私有 `defense-baseline.json` 并纳入 manifest 摘要。网页恢复先填表展示差异，本人保存才生效；同时验证基线和当前策略摘要，旧预览不覆盖新设置。`reset` 仍表示全部开启，`restore` 明确表示创建基线；无快照旧实例拒绝恢复。已经验证自定义观察设置可恢复、快照被改拒绝、暂停/撤权保留和工作台重开一致；没有保存“最近一次确认”的多版本快照。[使用方法](layer-settings.zh-CN.md) |
| **P2：调整技能检查时保留其他检查。已补齐三个开关。** | [基础扫描](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/foundation-scan.ts#L911) 分别调度配置和技能检查，配置表还列有[规则／语义开关](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/foundation-scan.ts#L824)。 | [`scan_foundation`](../yuanxingmu/guards.py) 支持 `foundation_config_enabled`、`skill_semantic_enabled` 和 `skill_rules_enabled`。关闭语义保留已开的规则，关闭规则保留已开的语义；同时关闭仍安全读取文件。固定快照被改后实例不能启动，新基线 v2 记录规则开关，旧 v1 保留原字段及原字节。相关九模块 **225/225**、设置页面 **22/22**；均为组件验证。[报告](evidence/skill-purpose-2026-09-12/REPORT.zh-CN.md) |
| **P2：在原生聊天页能找到当前防护和设置入口。已验收只读状态查询。** | [认证后的原生命令](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/index.ts#L126) 直接提供查看、修改及重置。 | [OpenClaw `/yuanxingmu`](../yuanxingmu/integrations/openclaw/plugin/commands.mjs) 要求本人认证及 `operator.admin`，显示实时五层方式、暂停与永久撤权、安装报告是否过期，并说明从原启动器打开工作台；不猜 URL 或展示管理凭证。`/yuanxingmu-revoke` 保留。新增 5 项主机状态测试及含 4 项新增状态用例的 12 项插件 Unix IPC 契约测试通过。OpenClaw native10 的 **08b** 在官方 WebUI 实际发送认证命令并收到状态，模型、Broker 与检查模型计数均未增加；08 只有未发送草稿，不计通过。[原生证据](evidence/openclaw-native10-2026-09-12/REPORT.zh-CN.md)仅验收只读查询，不扩展到该轮未选择的技能检查或聊天配置写入。配置修改与恢复仍在已认证工作台，不开放给模型工具。 |

玄甲固定版本的技能规则还存在一个实际调用限制：[文件扫描外层](https://github.com/FIND-Lab/AgentWard/blob/46309333bdfdbcf4701000c1dad85b33b4a0e7ef/layers/foundation-scan.ts#L805)只在语义开关开启且模型上下文存在时调用包含规则的扫描函数。因此不能根据配置项宣称它支持“关闭语义、独立运行文件规则”；元星木已用组件检查验证该组合。

## 元星木另外承担的边界

这些是不同的实现工作，不自动证明整体优于玄甲。

| 工作 | 当前代码与证据 | 限制 |
|---|---|---|
| 明确敏感字段在进入 AI 前隐藏，后续输出与提交继续核对 | [`protected_fields.py`](../yuanxingmu/protected_fields.py)、[`protected_boundary.py`](../yuanxingmu/protected_boundary.py)；AUTO19 的完整模型/工具/接收记录未发现内部底价，三项正文各实际接收一次。 | 这轮证据固定为 c83add3 / 0.7.0a1。只有明确标签与有限值写法；不识别任意秘密、编码或推断。最终回复仍有一处名称错字，严格完整协议 false。 |
| AI 进程不持有真实服务凭证，不能直接访问主机私有目录或直接联网 | [`sandbox.py`](../yuanxingmu/sandbox.py)、[`gateway_network.py`](../yuanxingmu/gateway_network.py)、[`authority.py`](../yuanxingmu/authority.py)；已有[原生 OpenClaw 报告](../examples/yuanxingmu/real_openclaw/evidence/REPORT.zh-CN.md)。 | Linux 共享内核；模型网络桥仍是特定受控路径。不能概括为硬件隔离或任意服务支持。 |
| 任务换连接、重启后仍保留权限与撤销状态 | 主机 Broker/authority 保存任务家族与状态；原生 OpenClaw 旧记录含撤销后重启。 | 子 Agent、不同框架和新工具都要逐个验证身份绑定，不能靠框架名配置自动获得保证。 |
| 真正发送之前核对用户批准的内容 | [`mail_drafts.py`](../yuanxingmu/mail_drafts.py)、[`mail_transport.py`](../yuanxingmu/mail_transport.py)；[邮件验收报告](../examples/yuanxingmu/email/evidence/report.md)。 | 精确草稿版本、目标和发送结果有边界；一次接收端回执不是任意邮箱服务的送达保证。 |
| 不仅邮件：消息、上传、表单、覆盖文件、删除文件 | [`actions.py`](../yuanxingmu/actions.py)、[`test_yuanxingmu_actions.py`](../tests/test_yuanxingmu_actions.py)；主机保存候选并要求确认、固定目标与凭证、记录发送尝试，结果不明时不自动重试。 | OpenClaw native10 已有消息、表单和文件操作的真实确认与效果；Hermes AUTO19 单次自然任务中消息、上传和表单各实际接收一次；最终名称错字保留。AUTO15 的回答误拦与后续未到达、AUTO18 的真实泄露也仍保留。文件操作限明确授权的小型既有 UTF-8 文件。未验证的真实提供商不能列为已送达。 |
| 十一组常用 SDK 的原生工具接入 | LangChain/LangGraph、OpenAI Agents、PydanticAI、Google ADK、CrewAI、Agno、AutoGen、LlamaIndex、Microsoft Agent Framework、smolagents、Mastra 已通过真实 SDK 注册与调用，连接真实 Broker 套接字和本地接收端。[框架范围](framework-support.zh-CN.md)列出固定版本和五批证据。 | 这是原生工具适配，不是十一组完整 Agent 的隔离、模型循环或五层验收。smolagents 的 CodeAgent 执行边界未覆盖。旧 MCP 研究结果没有充作新适配证据。 |

## 关于“超过玄甲”的证据

源码中确有可直接核实的差异。例如玄甲的语义判断截断文本，缺少 `VERDICT` 时默认 OK，若上下文缺失、裁判错误则可能不生成警告；元星木固定完整目标、传完整候选，并在无法得到有效判断时停止。玄甲技能扫描也有缺少模型或文件不可读时跳过的路径。它们是具体实现差异，**不是一次阅读源码就能得出的整体安全胜负**。

本地玄甲复现使用 OpenClaw 2026.9.4。安装兼容处理只移除了生成插件中一行裸类型导入，原始 23 个源码文件保留不变。正常原生任务有真实裁判 OK 与接收回执；危险原生任务中模型没有真正发起目标发送，所以不能算玄甲成功拦截或失败。单独向原始钩子提交候选时，观察到真实裁判 BLOCKED、`block:true` 和无接收回执；这属于组件证据。

要作公开效果比较，至少要在双方同一官方框架版本、同一模型、同一正常任务与攻击输入、相同工具权限下，分别记录：模型实际请求、实际裁判/规则、审批、最终副作用、正常任务是否完成。超时、加载失败、模型自行拒绝、没有触发候选都要单独分类。当前没有可支持“整体胜出”的同条件攻击成功率数据。

## 发布前尚需关闭的缺口

1. 对已实现的默认空集、显式技能选择和只读快照，继续核对每个官方运行入口的实际加载目录；避免扫 A 用 B。
2. Hermes native13/GLM14 已补齐同源码五层固定案例；继续在 OpenClaw 及更多原生来源复验正常/危险配对，补正常记忆写入、不同工具结果和更多技能，不能把固定案例当成整层穷尽覆盖。
3. Hermes 已完成官方写文件的真实人工批准，GLM14/native13 分别完成三次/五次真实工作台恢复。继续用新实例验收运行中设置、创建基线恢复、技能规则开关与用途对照。后台通用 JSON 提醒已有本机接收端证据，第三方服务仍未验收；聊天配置写入和当前聊天通道告警仍未实现。
4. 对更多任务、输入与框架重复原生验收。AUTO19 已在同一自然任务中完成消息、上传和表单，防护与提交核验通过；最终名称错字使严格完整协议仍为 false。保留 AUTO15 的中途误拦及 AUTO18 的真实泄露；未执行步骤不能计通过，固定案例也不代表整层或全部框架覆盖。
5. Hermes GLM14 五层视频已完成并绑定版本、配置和事件；继续补其他官方入口及新功能实录，不把关闭、观察、未触发或不可用状态标为“已保护”。

框架逐个接入的进度与版本见[框架支持矩阵](framework-support.zh-CN.md)。
