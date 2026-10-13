using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Yuanxingmu Windows Launcher")]
[assembly: AssemblyDescription("Open an existing Yuanxingmu installation in WSL")]
[assembly: AssemblyVersion("0.1.0.0")]
[assembly: AssemblyFileVersion("0.1.0.0")]

namespace Yuanxingmu.WindowsLauncher
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherWindow());
        }
    }

    internal sealed class LauncherWindow : Form
    {
        private readonly ComboBox distributions = new ComboBox();
        private readonly ComboBox installRoots = new ComboBox();
        private readonly NumericUpDown port = new NumericUpDown();
        private readonly Button refresh = new Button();
        private readonly Button detect = new Button();
        private readonly Button launch = new Button();
        private readonly Button open = new Button();
        private readonly Button stop = new Button();
        private readonly Label status = new Label();
        private BridgeSession session;
        private bool listing, probing, stopping, closeAfterStop;
        private string managementUrl;
        private int activePort;

        internal LauncherWindow()
        {
            Text = "元星木 · Windows 启动器" + (Product.Development ? "（开发验收）" : "");
            ClientSize = new Size(690, 520);
            MinimumSize = new Size(690, 540);
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font("Microsoft YaHei UI", 9F);
            AutoScaleMode = AutoScaleMode.Dpi;
            BackColor = Color.FromArgb(245, 248, 246);

            TableLayoutPanel layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.Padding = new Padding(26, 20, 26, 20);
            layout.ColumnCount = 3;
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 110));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 100));
            layout.RowCount = 9;
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 62));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 45));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 45));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 58));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 62));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 26));
            Controls.Add(layout);

            Label title = new Label();
            title.Text = "打开你已经装好的工作台";
            title.Font = new Font(Font.FontFamily, 17F, FontStyle.Bold);
            title.AutoSize = true;
            layout.Controls.Add(title, 0, 0); layout.SetColumnSpan(title, 3);

            Label intro = new Label();
            intro.Text = "适用于 WSL 中由 0.4.0a2 安装器准备的元星木 0.7.0a2。\n选择发行版和安装目录，即可进入原有工作台。";
            intro.Dock = DockStyle.Fill;
            layout.Controls.Add(intro, 0, 1); layout.SetColumnSpan(intro, 3);

            AddLabel(layout, "WSL 发行版", 2);
            distributions.DropDownStyle = ComboBoxStyle.DropDownList;
            distributions.Dock = DockStyle.Top;
            distributions.SelectedIndexChanged += delegate { if (!listing && session == null) BeginProbe(); };
            layout.Controls.Add(distributions, 1, 2);
            ConfigureButton(refresh, "刷新列表", delegate { BeginList(); });
            layout.Controls.Add(refresh, 2, 2);

            AddLabel(layout, "Linux 安装目录", 3);
            installRoots.DropDownStyle = ComboBoxStyle.DropDown;
            installRoots.MaxLength = 1024;
            installRoots.Dock = DockStyle.Top;
            layout.Controls.Add(installRoots, 1, 3);
            ConfigureButton(detect, "检测安装", delegate { BeginProbe(); });
            layout.Controls.Add(detect, 2, 3);

            AddLabel(layout, "本机端口", 4);
            port.Minimum = 1024; port.Maximum = 65535; port.Value = Product.DefaultPort;
            port.Width = 100;
            layout.Controls.Add(port, 1, 4);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill; actions.WrapContents = false;
            ConfigureButton(launch, "打开工作台", delegate { BeginLaunch(); });
            launch.Width = 130; launch.BackColor = Color.FromArgb(40, 93, 63); launch.ForeColor = Color.White;
            ConfigureButton(open, "再次打开浏览器", delegate { OpenBrowser(); }); open.Width = 148;
            ConfigureButton(stop, "关闭本次工作台", delegate { RequestStop(false); }); stop.Width = 148;
            actions.Controls.Add(launch); actions.Controls.Add(open); actions.Controls.Add(stop);
            layout.Controls.Add(actions, 0, 5); layout.SetColumnSpan(actions, 3);

            status.Dock = DockStyle.Fill;
            status.Padding = new Padding(12);
            status.BackColor = Color.White;
            status.BorderStyle = BorderStyle.FixedSingle;
            status.Text = "正在读取已有 WSL 发行版…";
            layout.Controls.Add(status, 0, 6); layout.SetColumnSpan(status, 3);

            Label note = new Label();
            note.Dock = DockStyle.Fill; note.Padding = new Padding(0, 10, 0, 0);
            note.Text = "关闭工作台或浏览器，不会停止已经运行的 AI。\n离开前请先在网页中对需要结束的工作点击“暂时关闭”。";
            layout.Controls.Add(note, 0, 7); layout.SetColumnSpan(note, 3);
            LinkLabel help = new LinkLabel();
            help.Text = "尚未安装？查看现有安装步骤"; help.AutoSize = true;
            help.LinkClicked += delegate
            {
                try { Process.Start(new ProcessStartInfo("https://yh-l20.github.io/agentsec/start.html#install") { UseShellExecute = true }); }
                catch (Exception) { ShowStatus("未能打开帮助页面。请在浏览器访问元星木官网的安装说明。"); }
            };
            layout.Controls.Add(help, 0, 8); layout.SetColumnSpan(help, 3);
            FormClosing += ClosingWindow;
            Shown += delegate { BeginList(); };
            RefreshButtons();
        }

        private static void AddLabel(TableLayoutPanel panel, string text, int row)
        {
            Label label = new Label(); label.Text = text; label.AutoSize = true;
            label.Padding = new Padding(0, 4, 0, 0); panel.Controls.Add(label, 0, row);
        }

        private static void ConfigureButton(Button button, string text, Action action)
        {
            button.Text = text; button.Height = 34; button.Dock = DockStyle.Top;
            button.Margin = new Padding(4, 0, 4, 0);
            button.Click += delegate { action(); };
        }

        private void Ui(Action action)
        {
            if (IsDisposed || !IsHandleCreated) return;
            try { BeginInvoke(action); } catch (InvalidOperationException) { }
        }

        private void ShowStatus(string value) { status.Text = value; }

        private void RefreshButtons()
        {
            bool idle = session == null && !listing;
            distributions.Enabled = idle;
            installRoots.Enabled = idle;
            port.Enabled = idle;
            refresh.Enabled = idle;
            detect.Enabled = idle && distributions.SelectedItem != null;
            launch.Enabled = idle && distributions.SelectedItem != null;
            open.Enabled = managementUrl != null && session != null && !stopping;
            stop.Enabled = session != null && !probing && !stopping;
        }

        private void BeginList()
        {
            if (session != null || listing) return;
            listing = true; RefreshButtons(); ShowStatus("正在读取已有 WSL 发行版…");
            ThreadPool.QueueUserWorkItem(delegate
            {
                List<string> names = null;
                try { names = Wsl.ListDistributions(); }
                catch (Exception) { }
                Ui(delegate
                {
                    distributions.Items.Clear(); installRoots.Items.Clear(); installRoots.Text = "";
                    if (names != null) foreach (string name in names) distributions.Items.Add(name);
                    if (distributions.Items.Count > 0) distributions.SelectedIndex = 0;
                    listing = false; RefreshButtons();
                    if (names == null) ShowStatus("无法读取 WSL 发行版。请确认 Windows 已安装并启用 WSL，再重试；本启动器不会更改系统设置。");
                    else if (names.Count == 0) ShowStatus("没有找到已有 WSL 发行版。请先按安装说明准备环境；本启动器不会下载或安装发行版。");
                    else BeginProbe();
                });
            });
        }

        private void BeginProbe()
        {
            if (session != null || listing || distributions.SelectedItem == null) return;
            probing = true; managementUrl = null; stopping = false;
            installRoots.Items.Clear(); installRoots.Text = "";
            ShowStatus("正在检查这个发行版中的现有安装…");
            StartSession("probe", null, Product.DefaultPort);
        }

        private void BeginLaunch()
        {
            if (session != null || listing || distributions.SelectedItem == null) return;
            string root = installRoots.Text;
            int selectedPort = Decimal.ToInt32(port.Value);
            if (!Arguments.LinuxPath(root))
            {
                ShowStatus("请填写 Linux 中已有安装的完整目录，例如 /home/你的用户/yuanxingmu-v07a2。"); return;
            }
            if (!Arguments.Port(selectedPort)) { ShowStatus("端口须在 1024–65535 之间，且不能使用 18701。"); return; }
            probing = false; stopping = false; managementUrl = null; activePort = selectedPort;
            ShowStatus("正在核对已有安装并打开工作台。请保留此窗口…");
            StartSession("start", root, selectedPort);
        }

        private void StartSession(string mode, string root, int selectedPort)
        {
            BridgeSession created = null;
            created = new BridgeSession((string)distributions.SelectedItem, mode, root, selectedPort,
                delegate(BridgeEvent item) { Ui(delegate { if (session == created) Receive(item); }); },
                delegate(SessionResult result) { Ui(delegate { if (session == created) Finished(result); }); });
            session = created; RefreshButtons(); created.Start();
        }

        private void Receive(BridgeEvent item)
        {
            if (item.Kind == "probe")
            {
                foreach (string root in item.Candidates) installRoots.Items.Add(root);
                if (item.Candidates.Count > 0)
                {
                    installRoots.SelectedIndex = 0;
                    ShowStatus("找到现有安装。可选择目录并点击“打开工作台”；启动时仍会完整核对安装文件和隔离环境。");
                }
                else
                {
                    installRoots.Text = item.Home + "/yuanxingmu-v07a2";
                    ShowStatus("两个常用位置没有找到已完成的 a2 安装。若装在其他位置，请填写实际 Linux 安装目录；尚未安装可查看下方说明。");
                }
            }
            else if (item.Kind == "ready")
            {
                // An address belongs only to this process lifetime, never a saved preference.
                managementUrl = item.Url;
                if (!stopping) { ShowStatus("工作台已经打开。请保留此窗口；可随时再次打开浏览器。"); OpenBrowser(); }
            }
            else if (item.Kind == "error") ShowStatus(ErrorMessage(item.Code));
            else if (item.Kind == "status" && stopping)
                ShowStatus("正在等待本次工作台完成已接受的操作并关闭。清理完成前请保留此窗口…");
            RefreshButtons();
        }

        private void Finished(SessionResult result)
        {
            bool wasProbe = probing;
            session = null; managementUrl = null; probing = false; stopping = false;
            RefreshButtons();
            if (!result.Clean)
            {
                closeAfterStop = false;
                ShowStatus(ErrorMessage(result.ErrorCode));
            }
            else if (closeAfterStop) { closeAfterStop = false; Close(); }
            else if (!wasProbe) ShowStatus("本次工作台已关闭，原有工作和权限记录保留。运行中的 AI 仍须在网页中单独暂停。");
        }

        private void OpenBrowser()
        {
            if (session == null || stopping || !ReadyAddress.Valid(managementUrl, activePort)) return;
            try { Process.Start(new ProcessStartInfo(managementUrl) { UseShellExecute = true }); }
            catch (Exception) { ShowStatus("工作台已启动，但浏览器没有打开。请检查 Windows 默认浏览器后点击“再次打开浏览器”。"); }
        }

        private bool ConfirmStop()
        {
            return MessageBox.Show(this,
                "请先在网页中对需要结束的 AI 工作点击“暂时关闭”。\n\n这里仅关闭本次工作台，不会停止已经运行的 AI，也不会关闭整个 WSL 发行版。继续关闭工作台？",
                "关闭本次工作台", MessageBoxButtons.YesNo, MessageBoxIcon.Information,
                MessageBoxDefaultButton.Button2) == DialogResult.Yes;
        }

        private void RequestStop(bool closeWindow)
        {
            if (session == null) { if (closeWindow) Close(); return; }
            if (stopping) { if (closeWindow) closeAfterStop = true; return; }
            if (!probing && !ConfirmStop()) return;
            closeAfterStop = closeWindow; stopping = true; managementUrl = null;
            ShowStatus("正在等待本次工作台完成已接受的操作并关闭。清理完成前请保留此窗口…");
            RefreshButtons(); session.Stop();
        }

        private void ClosingWindow(object sender, FormClosingEventArgs e)
        {
            if (session == null) return;
            e.Cancel = true;
            RequestStop(true);
        }

        private static string ErrorMessage(string code)
        {
            switch (code)
            {
                case "root_user": return "这个发行版默认以 root 用户运行。请改用安装元星木时的普通 Linux 用户，再重试。";
                case "unsupported_environment": return "该发行版的 Linux 或系统 Python 环境不适用。请使用已准备好 Python 3.12+ 的原有 WSL 安装。";
                case "install_invalid": return "未找到可用的 a2 安装，或安装文件、目录权限、版本记录不符。请核对原安装目录；已有文件保持不变。";
                case "invalid_arguments": return "安装目录或端口无效。请填写 Linux 家目录中的实际安装位置，端口不能使用 18701。";
                case "already_running": return "这个工作台已经打开。请回到原来的浏览器或启动窗口；这里不会接管已有服务。";
                case "port_in_use": return "所选端口已被占用。请回到已打开的工作台，或换一个空闲端口；不会关闭占用者。";
                case "invalid_control": case "protocol_error": return "启动通信未通过检查，已请求关闭本次工作台。请保留原安装并检查启动环境。";
                case "launcher_failed": return "工作台未正常结束，请核对原安装及运行状态；不要据此认为运行中的 AI 已停止。";
                case "startup_failed": return "工作台启动未完成。请从原安装入口核对版本、文件和隔离环境；本次不会降低检查要求。";
                default: return "启动未确认完成或连接意外结束。请确认 WSL 发行版和系统 Python 可用，并核对原工作台状态。";
            }
        }
    }
}
