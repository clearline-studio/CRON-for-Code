# CC diagnostic: enumerate real taskbar buttons via the legacy Shell_TrayWnd
# window (EnumChildWindows + GetWindowText). Counts CRON for Code buttons.
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class TaskbarButtons {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string cls, string win);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string win);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hwnd, EnumProc cb, IntPtr lParam);
    public delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder sb, int max);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder sb, int max);
    public static string[] Enumerate() {
        IntPtr tray = FindWindow("Shell_TrayWnd", null);
        if (tray == IntPtr.Zero) return new string[] { "NO-TRAY" };
        var result = new System.Collections.Generic.List<string>();
        EnumChildWindows(tray, (h, l) => {
            var cls = new StringBuilder(128); GetClassName(h, cls, 128);
            var text = new StringBuilder(512); GetWindowText(h, text, 512);
            result.Add(cls + "|" + text);
            return true;
        }, IntPtr.Zero);
        return result.ToArray();
    }
}
'@
$rows = [TaskbarButtons]::Enumerate()
"Tray child windows: $($rows.Count)"
$rows | Where-Object { $_ -match 'CRON for Code|MSTaskList|Taskband' } | ForEach-Object { $_ }
