# CRON for Code - create a taskbar-friendly development shortcut on the Desktop.
# Creates "CRON for Code Dev.lnk" targeting the silent VBS launcher, using the CRON icon.
# Does not auto-pin and does not touch the registry.
[CmdletBinding()]
param(
    [string]$Desktop = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$vbsPath = Join-Path $repoRoot 'launch-cron-for-code-dev.vbs'
$iconPath = Join-Path $repoRoot 'apps\standalone\branding\assets\code_icon.ico'
$shortcutPath = Join-Path $Desktop 'CRON for Code Dev.lnk'

if (-not (Test-Path -LiteralPath $vbsPath)) {
    throw "Launcher VBS not found: $vbsPath"
}

if (-not (Test-Path -LiteralPath $iconPath)) {
    Write-Warning "Icon not found at $iconPath; the shortcut will fall back to the launcher icon."
    $iconPath = ''
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $vbsPath
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description = 'CRON for Code - development launcher (hidden)'
if ($iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
else {
    $shortcut.IconLocation = "$vbsPath,0"
}
$shortcut.Save()

Write-Output "Created shortcut: $shortcutPath"
Write-Output "Target: $vbsPath"
Write-Output "Working directory: $repoRoot"
if ($iconPath) {
    Write-Output "Icon: $iconPath"
}
