Option Explicit

Dim fso, shell, repoRoot, ps1
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' Resolve the repository root dynamically from this file's location.
repoRoot = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = fso.BuildPath(repoRoot, "scripts\run-code-dev-hidden.ps1")

If Not fso.FileExists(ps1) Then
    WScript.Echo "CRON for Code Dev: launcher script not found." & vbCrLf & ps1
    WScript.Quit 1
End If

' Run the PowerShell launcher hidden (window style 0), without waiting.
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """", 0, False
