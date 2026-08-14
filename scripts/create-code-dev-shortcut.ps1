# CRON for Code - create a taskbar-friendly development shortcut on the Desktop.
# Creates "CRON for Code Dev.lnk" targeting electron.exe DIRECTLY (not the VBS
# launcher). Taskbar grouping on Windows 11 is by process-path identity: the
# pinned button only merges with the running window when both resolve to the
# same executable path. A VBS/launcher target resolves to wscript.exe, so the
# running app would appear as a SECOND taskbar icon next to the pinned one.
# Launching electron.exe directly keeps one icon AND loads the same app entry
# (apps/standalone/package.json "main" -> electron/main.mjs, normal mode).
# Does not auto-pin and does not touch the registry.
[CmdletBinding()]
param(
    [string]$Desktop = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$standaloneDir = Join-Path $repoRoot 'apps\standalone'
$iconPath = Join-Path $standaloneDir 'branding\assets\code_icon.ico'
$shortcutPath = Join-Path $Desktop 'CRON for Code Dev.lnk'

$electronExe = Join-Path $standaloneDir 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath $electronExe)) {
    $fallback = Join-Path $repoRoot 'node_modules\electron\dist\electron.exe'
    if (-not (Test-Path -LiteralPath $fallback)) {
        throw "electron.exe not found (tried: $electronExe, $fallback). Run the dependency install step first."
    }
    $electronExe = $fallback
}

if (-not (Test-Path -LiteralPath $iconPath)) {
    Write-Warning "Icon not found at $iconPath; the shortcut will fall back to the electron icon."
    $iconPath = ''
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $electronExe
$shortcut.Arguments = '.'
$shortcut.WorkingDirectory = $standaloneDir
$shortcut.Description = 'CRON for Code - development app (normal mode)'
if ($iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
else {
    $shortcut.IconLocation = "$electronExe,0"
}
$shortcut.Save()

Write-Output "Created shortcut: $shortcutPath"
Write-Output "Target: $electronExe ."
Write-Output "Working directory: $standaloneDir"
if ($iconPath) {
    Write-Output "Icon: $iconPath"
}
Write-Output "Taskbar note: shortcut targets electron.exe directly so the pinned icon and the running window share one taskbar identity."
