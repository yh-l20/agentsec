# 在 OpenClaw 中接入自己的模型与资料

把几段资料交给 AI 整理，在 OpenClaw 原来的聊天界面里看结果。元星木为这次工作建立一个独立实例，默认没有对外发送资料的接收位置。

**你选择的模型会看到聊天内容和它读取的资料。** 使用云端模型时，这些内容会发送给该模型服务。这里的“默认不能发送”指不能另外发往未配置的接收位置，不包括完成聊天所需的模型请求。已读到的内容与过去完成的发送无法撤回。

这是预览版，需要在终端完成安装。下面以 **Ubuntu 24.04 / WSL Ubuntu 24.04、x86_64 电脑**为例，使用系统 Python 3.12+、Node.js 24.16.0、OpenClaw 2026.9.4 和 bubblewrap 0.9.0。其他环境需要另外验证；隔离或启动检查失败时不会直接在宿主上继续运行。

[官网使用页](https://yh-l20.github.io/agentsec/start.html) · [更详细的实现与边界](yuanxingmu.md)

本文保留手工安装流程。[配套 0.4.0a2 安装器](https://github.com/yh-l20/agentsec/releases/tag/installer-0.4.0a2)已发布，会安装 0.7.0a2 运行包和 Hermes、OpenClaw 两套环境；首次使用可按[官网安装步骤](https://yh-l20.github.io/agentsec/start.html#install)安装到新的 `~/yuanxingmu-v07a2` 目录。已有安装继续使用原目录中的入口，不要混用下面的手工目录。

## 1. 安装到一个独立目录

Windows 用户先在 PowerShell 中安装 WSL：

```powershell
wsl --install -d Ubuntu-24.04
```

按屏幕提示完成安装，打开 **Ubuntu 24.04** 终端。后面的命令都在 Ubuntu 终端中运行。已有合适的 Linux / WSL 环境可直接继续。请把工作目录放在 Linux 的 `~` 下。

一段一段执行，某段报错时先处理错误。以下目录用于首次安装；已经装好后，直接看[日常打开与关闭](#日常打开与关闭)。

安装系统依赖：

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-venv git curl xz-utils ca-certificates bubblewrap
/usr/bin/python3 --version
bwrap --version
```

Python 应为 3.12 或更新版本。bubblewrap 已验证版本是 0.9.0，是否能在你的电脑上使用还要由后面的 `doctor` 实际检查。

下载 Node.js 到本次安装目录：

```bash
YXM_DIR="$HOME/yuanxingmu"
mkdir -p "$YXM_DIR/tools" "$YXM_DIR/openclaw" "$YXM_DIR/inputs"
cd "$YXM_DIR/tools"
curl --fail --location --output node-v24.16.0-linux-x64.tar.xz \
  https://nodejs.org/dist/v24.16.0/node-v24.16.0-linux-x64.tar.xz
curl --fail --location --output SHASUMS256.txt \
  https://nodejs.org/dist/v24.16.0/SHASUMS256.txt
sha256sum --check --ignore-missing SHASUMS256.txt
tar -xJf node-v24.16.0-linux-x64.tar.xz
export PATH="$YXM_DIR/tools/node-v24.16.0-linux-x64/bin:$PATH"
node --version
```

校验应显示 `OK`，Node 版本应显示 `v24.16.0`。这里下载的是 Linux x86_64 版本；ARM 电脑不能直接使用这个压缩包。

安装元星木与指定版本的 OpenClaw：

```bash
git clone https://github.com/yh-l20/agentsec.git "$YXM_DIR/yuanxingmu"
/usr/bin/python3 -m venv "$YXM_DIR/.venv"
"$YXM_DIR/.venv/bin/python" -m pip install "$YXM_DIR/yuanxingmu"
npm install --prefix "$YXM_DIR/openclaw" openclaw@2026.9.4
"$YXM_DIR/.venv/bin/python" -I -m yuanxingmu doctor --bwrap /usr/bin/bwrap
```

看到 `"available": true` 后继续。这个检查只说明本机基础隔离探测通过；首次启动还会检查配置、运行文件和 OpenClaw 是否正常响应。它不代表所有模型和所有电脑都已通过验证。

这套 OpenClaw 装在 `~/yuanxingmu/openclaw/node_modules/openclaw`。后面会显式使用这个路径，无须运行 `openclaw onboard`，也无须修改个人 OpenClaw 配置。

## 2. 准备一份短文本

先创建一份练习资料：

```bash
cat > "$YXM_DIR/inputs/quote.txt" <<'EOF'
项目：春季客户活动（练习资料）
场地：6000 元
物料：2800 元
摄影：1200 元
备注：报价仅供内部讨论，尚未确认供应商。
EOF
```

也可以用自己的文件替换 `quote.txt`。当前只接收 **UTF-8 文本，每个文件不超过 256 KiB**；暂不直接读取 PDF、Word、Excel 或图片。第一次建议只放几段文字。

创建实例时会复制这份文件。后来修改原文件，不会自动更新实例中的资料。要换资料，请创建另一个实例；本版暂未提供在已有实例中增删资料的命令。

## 3. 连接自己的模型并创建实例

准备支持**工具调用**的 OpenAI 兼容模型接口，以及服务提供的模型名称。接口地址通常以 `/v1` 结尾，这里使用的是 Chat Completions 接口。网页聊天账号本身不是模型接口。

云端接口须使用 HTTPS。本机接口可以填写类似 `http://127.0.0.1:1234/v1` 的地址，但模型服务必须能从当前 Linux / WSL 的这个地址访问。

下面会依次询问接口地址和模型名称。连接 HTTPS 服务时，程序还会询问 API 密钥，输入不会显示在屏幕上。

```bash
read -r -p "模型接口地址（通常以 /v1 结尾）：" YXM_MODEL_URL
read -r -p "模型名称：" YXM_MODEL_ID
"$YXM_DIR/.venv/bin/python" -I -m yuanxingmu openclaw init \
  --profile "$YXM_DIR/profiles/first-chat" \
  --model-url "$YXM_MODEL_URL" \
  --model-id "$YXM_MODEL_ID" \
  --document "quote=$YXM_DIR/inputs/quote.txt" \
  --node "$YXM_DIR/tools/node-v24.16.0-linux-x64/bin/node" \
  --openclaw-package "$YXM_DIR/openclaw/node_modules/openclaw" \
  --bwrap /usr/bin/bwrap
```

看到 `"status": "created"` 表示实例已建立，尚未启动聊天服务。

`--profile` 指定这个实例自己的目录。首次创建时，该目录必须不存在；不要预先创建 `first-chat`。它会保存资料副本、聊天、配置和权限状态，请保留它以便继续原来的工作。需要另一项工作时，使用另一个新的目录名。

`quote` 是聊天里可用的资料名称。导入多份文本时，可重复添加 `--document`，例如 `--document "notes=/完整路径/notes.txt"`，每份资料使用不同名称。不传 `--destinations` 时，默认不配置任何发送位置。

### 已经用环境变量保存密钥

可以在上面的 `init` 命令末尾加 `--api-key-env YXM_MODEL_KEY`，让程序读取已导出的 `YXM_MODEL_KEY` 环境变量。填的是**变量名**，不是密钥值。无交互终端时，HTTPS 接口也需要使用这种方式；需要密钥的本机接口同样适用。

例如，先在当前终端隐藏输入并导出密钥，再执行带上述参数的创建命令：

```bash
read -r -s -p "模型 API 密钥：" YXM_MODEL_KEY
printf '\n'
export YXM_MODEL_KEY
```

创建成功后可运行 `unset YXM_MODEL_KEY`，取消当前 shell 中的变量。模型密钥仍由宿主侧的本地配置文件保存和读取，不会挂载给沙盒中的 OpenClaw；重新打开实例时不需要再次输入。这个命令不等于删除已保存的配置或清除所有内存副本。

## 4. 打开原生聊天界面

```bash
"$YXM_DIR/.venv/bin/python" -I -m yuanxingmu openclaw start \
  --profile "$YXM_DIR/profiles/first-chat"
```

启动成功后，在浏览器中打开输出里的 **`dashboard_url`**。它包含这个实例的访问凭证，请保留完整链接并只供自己使用。默认地址在本机 `127.0.0.1:18911`。

在 OpenClaw 聊天里输入：

> 请读取 quote，列出三个费用项目，算出总费用，并说明还有什么需要确认。直接在聊天里回复我。

这份练习资料的三项费用合计 **10,000 元**，供应商尚待确认。你应能在聊天里看到资料读取操作及模型的回答。模型如果没有读取资料、报工具调用错误或算错，需要分别检查模型能力和配置；聊天里的回答本身不能代替操作记录。

你还可以继续要求“改成三句话”“整理成表格”。本流程默认在聊天中查看结果，不需要配置邮件、飞书或 Slack。

## 日常打开与关闭

新开 Ubuntu 终端后，重新设置安装目录，再启动原来的实例：

```bash
YXM_DIR="$HOME/yuanxingmu"
"$YXM_DIR/.venv/bin/python" -I -m yuanxingmu openclaw start \
  --profile "$YXM_DIR/profiles/first-chat"
```

查看当前状态：

```bash
"$YXM_DIR/.venv/bin/python" -I -m yuanxingmu openclaw status \
  --profile "$YXM_DIR/profiles/first-chat"
```

关闭服务和它运行中的命令：

```bash
"$YXM_DIR/.venv/bin/python" -I -m yuanxingmu openclaw stop \
  --profile "$YXM_DIR/profiles/first-chat"
```

**关闭后还可以重新打开，资料、聊天和已有权限状态会保留。** 只关闭浏览器标签页不会停止服务。

## 在聊天里查看防护

在已登录且具备管理员权限的 OpenClaw 聊天中输入 `/yuanxingmu`，不用附加参数。它会显示五层当前是关闭、只记录还是拦截，以及工作有没有暂停、资料权限有没有永久收回。

“未确认”表示没有取得可核对的状态，不能按防护正常理解。安装与技能检查若显示设置已变更，要在下次启动时重新检查；开启开关不等于已经完成检查。

修改设置或核对暂停时，回到元星木工作台，选择当前工作并打开“防护记录”。网页已关闭时，用原来的元星木启动器重新打开，使用终端显示的本机管理链接。聊天命令只提供打开方式，不在聊天里展示带凭证的管理链接。旧服务若不支持五层状态摘要，会显示未确认。

## 永久收回这个实例的权限

确定这项工作不应再读取或发送资料时，可以在终端运行：

```bash
"$YXM_DIR/.venv/bin/python" -I -m yuanxingmu openclaw revoke \
  --profile "$YXM_DIR/profiles/first-chat"
```

也可以在已登录的 OpenClaw 聊天中输入 `/yuanxingmu-revoke`。

**撤销是永久的，本版没有恢复权限的命令。** 它会拒绝这个实例后续通过元星木读取或发送资料，也不能靠重新打开聊天恢复。它不会删除已经读到的内容，不会撤回已经完成的发送，也不会停止本地计算。要一起关闭服务，再执行 `stop`。

| 你的目的 | 使用的操作 | 以后能否继续原实例 |
| --- | --- | --- |
| 今天先不用了 | `stop` | 可以，之后用 `start` |
| 查看是否还在运行、权限是否收回 | `status` | 只查看，不改变状态 |
| 永久禁止这项工作继续读取和发送 | `revoke` | 不能恢复读取和发送权限 |

## 遇到问题时

| 看到的情况 | 可以怎样处理 |
| --- | --- |
| `doctor` 返回 `"available": false` | 先看 `reason`。确认在 Linux / WSL 内使用系统 Python 和 bubblewrap；机器限制隔离能力时，需要换受支持环境或请管理员处理。不要跳过这个检查。 |
| 提示只支持 OpenClaw 2026.9.4 | 核对 `--openclaw-package` 是否指向本次独立安装的包，未误用全局或其他版本。 |
| 提示实例目录已有内容 | 已建好的实例用 `start`。新工作换一个目录名；初始化失败留下的目录也不要继续当作成功实例使用。 |
| 模型报 401、404，或不调用工具 | 检查密钥、`/v1` 接口地址、模型名称，以及模型服务是否支持 Chat Completions 的工具调用。 |
| 模型提示内容太长 | 先用更短的文本创建新实例。文件大小限制不代表模型一定能一次处理全部内容。 |
| 端口被占用 | 在 `openclaw init` 创建另一个新实例时可加 `--port 18912`；它不是 `start` 的参数。使用启动输出中的新链接。 |
| 启动失败或超时 | 查看实例目录里的 `supervisor.log`、`gateway.stderr.log`。不要把失败状态当作已获得保护。 |
| 状态为 `interrupted` 或 `unconfirmed` | 上次服务异常中断，程序尚未确认清理完成。保留日志与 `lifecycle.json`，先确认记录中的进程情况，不要手工删除权限库或修改状态绕过检查。 |
| 提示配置、文件或运行版本发生变化 | 当前实例保存了创建时的副本和校验记录。不要直接编辑它的配置或替换运行文件；本版暂未提供原地升级流程。 |

当前发送扩展面向开发者配置的**固定 JSON 接收接口**，还不是飞书、Slack、邮箱等服务的现成连接器。先在聊天里完成资料整理即可。要了解底层配置与适用范围，见[运行说明](yuanxingmu.md)。
