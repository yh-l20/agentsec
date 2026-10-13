# Windows 启动器

[下载 0.1.0a1 预览版](https://github.com/yh-l20/agentsec/releases/tag/windows-launcher-0.1.0a1) · [启动与验证记录](../../docs/evidence/windows-launcher-2026-09-13/REPORT.zh-CN.md)

双击 Windows 程序，选择已有 WSL 发行版与 Linux 安装目录，打开已经安装的元星木工作台。首版支持 `0.4.0a2` 安装器准备的 `0.7.0a2`；Windows 需有 .NET Framework 4 和 WSL，发行版的默认用户须是原安装的普通 Linux 用户，系统 Python 须为 3.12+。

启动器检查家目录下的 `yuanxingmu-v07a2` 与 `yuanxingmu`，也允许填写其他现有安装的绝对路径。检测到安装记录只表示发现候选；启动仍调用原来的 `open-yuanxingmu`，沿用文件、版本、目录身份、权限、隔离和重复启动检查。它不修改旧安装、创建 AI 工作、安装或启用 WSL，也不下载镜像、更改安全配置或关闭整个发行版。

成功后自动打开 Windows 默认浏览器，“再次打开浏览器”可重复打开本次管理入口。管理链接只在本次程序内存中保存，不写配置、日志或快捷方式。若工作台已由其他窗口启动，本程序提示回到原窗口，不取得其管理链接。

请保留启动器窗口。关闭本次工作台时，程序通知自己启动的 Linux 子进程，等待它完成已接受的操作并退出，不定时强制终止它。Windows 程序意外退出导致控制管道关闭时，桥接同样请求清理。**关闭工作台或浏览器不会停止已经运行的 AI；请先在网页中对需要结束的工作点击“暂时关闭”。** 启动器不能保证 Windows 断电、WSL 被外部强杀或内核故障后的清理。

## 构建

使用 Windows 自带的 x64 .NET Framework C# 编译器，无需下载 SDK。输出必须选择仓库之外的新目录。下面的开发构建会带 `-dev` 文件名、开发窗口标题和 `publishable:false` 清单，不能作为发行文件：

```powershell
& .\install\windows\build.ps1 -OutputDirectory "$env:TEMP\yxm-windows-dev-01"
```

发布构建要求当前完整提交 SHA、干净的 tracked 文件和 index，且 `install/windows/` 的输入已全部提交；每个输入的实际字节还必须等于固定提交中的 Git blob。清单只绑定本启动器相关的源码、资源、构建脚本、测试与说明，不纳入其他项目内容：

```powershell
& .\install\windows\build.ps1 -Release -SourceCommit <完整的40位提交SHA> -OutputDirectory "$env:TEMP\yxm-windows-release-01"
```

输出包含 `.exe`、`launcher-manifest.json` 和 `SHA256SUMS`；校验文件同时覆盖程序和清单。清单记录编译器和源码 SHA256、兼容的安装器/运行包版本及是否可发布。这里生成的程序没有 Authenticode 签名；这条构建命令不负责签名或发布，也不声称不同编译器环境的二进制可逐字节重现。

## 离线验证

Windows 执行 C# 的真实 CreateProcess 参数往返、UTF-16 发行版列表、严格协议/URL 拒绝，并运行 Python 的可移植检查：

```powershell
& .\install\windows\test.ps1 -Python python
```

已准备 WSL 的 Windows 机器还应加上 `-CheckWslListing`，通过真正的 `wsl.exe --list --quiet` 核对其顶层选项解析及列表编码；该检查只列出注册发行版，不启动工作台。默认离线检查另外覆盖非法 UTF-8 大量输出后的管道排空，确保错误不会让退出清理卡在已写满的管道上。

Python 的真实进程组/控制管道/EOF 清理用例在 Linux 执行，Windows 上明确跳过：

```bash
/usr/bin/python3 -I -B install/windows/tests/test_bridge.py
```

上述离线检查不启动实际工作台、不调用模型、不访问网络。[独立验收记录](../../docs/evidence/windows-launcher-2026-09-13/REPORT.zh-CN.md)另外覆盖了实际 Windows→WSL 参数传递、既有 a2 工作台启动、重复启动拒绝、停止重开和旧管理令牌失效。GUI 布局和组件启停意图已单独检查；默认浏览器的完整人工点击流程尚未单独验收。
