# CRON for Code - dev launcher logic + source tests.
# Runs the restart-safe launcher decision logic against injected fake probes and asserts
# the launcher/shortcut contract (port precedence, scan, stale recovery, lifecycle, shortcut,
# no env dependency, no unrelated-process termination, .runtime logging).
# Exit 0 = all pass. Exit 1 = at least one failure.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptDir
. (Join-Path $scriptDir 'code-dev-launcher-logic.ps1')

$script:FailCount = 0
$script:PortOwners = @{}
$script:CommandLines = @{}
$script:AlivePids = @()
$script:OwnedRoot = 'C:\fake\CRON for Code'

function Assert-True([bool]$condition, [string]$name) {
    if ($condition) { Write-Host "PASS: $name" }
    else { Write-Host "FAIL: $name"; $script:FailCount++ }
}

function Assert-Eq($actual, $expected, [string]$name) {
    if ($actual -eq $expected) { Write-Host "PASS: $name" }
    else { Write-Host "FAIL: $name (expected '$expected', got '$actual')"; $script:FailCount++ }
}

function New-FakeProbe {
    return @{
        GetPortOwner   = { param([int]$p) if ($script:PortOwners.ContainsKey($p)) { $script:PortOwners[$p] } else { $null } }
        GetCommandLine = { param([int]$p) if ($script:CommandLines.ContainsKey($p)) { $script:CommandLines[$p] } else { '' } }
        IsAlive        = { param([int]$p) $script:AlivePids -contains $p }
        IsOwned        = {
            param([int]$p)
            $cmd = $script:CommandLines[$p]
            return [bool]($cmd -and $cmd -match [regex]::Escape($script:OwnedRoot))
        }
    }
}

# ---------------- Port selection: registry-aligned precedence ----------------

$probe = New-FakeProbe
$result = Select-DevPort -ExplicitPort 5200 -EnvironmentPort 5199 -DefaultPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 5200 'explicit -Port takes precedence over environment variable'
Assert-Eq $result.Source 'explicit' 'explicit -Port source is explicit'

$result = Select-DevPort -ExplicitPort 0 -EnvironmentPort 5199 -DefaultPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 5199 'environment variable takes precedence over default (unassigned port)'
Assert-Eq $result.Source 'environment' 'environment port source is environment'

$result = Select-DevPort -ExplicitPort 0 -EnvironmentPort 0 -DefaultPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 5190 'default port is 5190 (CRON for Code assigned port)'
Assert-Eq $result.Source 'default' 'default port source is default'

$result = Select-DevPort -ExplicitPort 0 -EnvironmentPort 0 -DefaultPort 5190 -PersistedPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 5190 'approved persisted port (5190) is reused'
Assert-Eq $result.Source 'persisted' 'persisted port source is persisted'

$result = Select-DevPort -ExplicitPort 0 -EnvironmentPort 0 -DefaultPort 5190 -PersistedPort 5191 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 5190 'foreign persisted port (5191) is not reused; default 5190 is selected'

# ---------------- Reserved (other CRON app) port refusal ----------------

$result = Select-DevPort -ExplicitPort 5191 -DefaultPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 0 'explicit port reserved for another CRON app is refused'
Assert-True ($result.Reason -match 'reserved for another CRON') 'reserved refusal cites the registry'

$result = Select-DevPort -ExplicitPort 0 -EnvironmentPort 5193 -DefaultPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 0 'environment port reserved for another CRON app is refused'

# ---------------- Unrelated-port refusal ----------------

$script:PortOwners = @{ 5190 = 1111 }
$script:CommandLines = @{ 1111 = 'node C:\other-project\vite\bin\vite.js' }
$result = Select-DevPort -ExplicitPort 5190 -DefaultPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 0 'explicit port owned by another application is refused'
Assert-True ($result.Reason -match 'in use by another application') 'unrelated refusal is recorded'

$result = Select-DevPort -ExplicitPort 0 -EnvironmentPort 5190 -DefaultPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 0 'environment port owned by another application is refused'

# ---------------- No fallback scan: fail safely when default is blocked ----------------

$result = Select-DevPort -ExplicitPort 0 -EnvironmentPort 0 -DefaultPort 5190 -RepoRoot $script:OwnedRoot -Probe $probe
Assert-Eq $result.Port 0 'default 5190 owned by another app fails safely (no scan)'
Assert-True ($result.Reason -match 'no fallback scan is permitted') 'no-scan policy is stated in the failure message'

$script:PortOwners = @{}
$script:CommandLines = @{}

# ---------------- Reserved-port detection and state repair ----------------

$res = Test-DevPortReserved -Port 5191
Assert-Eq $res.Reserved $true 'Meds port 5191 is flagged reserved'
$res = Test-DevPortReserved -Port 5190
Assert-Eq $res.Reserved $false 'Code port 5190 is not flagged reserved'
$res = Test-DevPortReserved -Port 5199
Assert-Eq $res.Reserved $false 'unassigned port 5199 is not flagged reserved'

$repair = Repair-DevStatePort -State @{ port = 5191; devPid = 0; vitePid = 0; electronPid = 0 }
Assert-Eq $repair.Repaired $true 'foreign persisted port is flagged for repair'
Assert-Eq $repair.State.port 5190 'foreign persisted port is reset to 5190'
$repair = Repair-DevStatePort -State @{ port = 5190; devPid = 0; vitePid = 0; electronPid = 0 }
Assert-Eq $repair.Repaired $false 'approved persisted port (5190) is not repaired'

# ---------------- Port status classification ----------------

$script:PortOwners = @{ 5190 = 700 }
$script:CommandLines = @{ 700 = "node `"$script:OwnedRoot\apps\standalone\node_modules\vite.js`" --port 5190" }
Assert-Eq (Get-DevPortStatus -Port 5190 -RepoRoot $script:OwnedRoot -Probe $probe) 'owned' 'owned repo Vite is classified owned'
$script:CommandLines = @{ 700 = 'node C:\other\vite.js' }
Assert-Eq (Get-DevPortStatus -Port 5190 -RepoRoot $script:OwnedRoot -Probe $probe) 'unrelated' 'foreign Vite is classified unrelated'
$script:PortOwners = @{ }
Assert-Eq (Get-DevPortStatus -Port 5190 -RepoRoot $script:OwnedRoot -Probe $probe) 'free' 'free port is classified free'

# ---------------- Lifecycle decisions ----------------

$action = Resolve-DevAction -Runtime @{ VitePid = 1; ElectronMainPid = 2; DevPid = 3 }
Assert-Eq $action.Action 'surface-running' 'owned Vite + owned Electron surfaces the running window'
$action = Resolve-DevAction -Runtime @{ VitePid = 1; ElectronMainPid = 0; DevPid = 0 }
Assert-Eq $action.Action 'reuse-vite' 'owned Vite with missing Electron reuses the Vite'
$action = Resolve-DevAction -Runtime @{ VitePid = 0; ElectronMainPid = 2; DevPid = 0 }
Assert-Eq $action.Action 'replace-stale-electron' 'missing Vite with stale Electron metadata replaces only its own Electron'
$action = Resolve-DevAction -Runtime @{ VitePid = 0; ElectronMainPid = 0; DevPid = 0 }
Assert-Eq $action.Action 'fresh-start' 'nothing running does a fresh start'

# ---------------- Stale/broken main detection (runtime marker) ----------------

$action = Resolve-DevAction -Runtime @{ VitePid = 1; ElectronMainPid = 2; DevPid = 3; Health = 'stale' }
Assert-Eq $action.Action 'replace-stale-electron' 'stale owned Electron is replaced even when Vite is alive'
$action = Resolve-DevAction -Runtime @{ VitePid = 1; ElectronMainPid = 2; DevPid = 3; Health = 'broken' }
Assert-Eq $action.Action 'replace-stale-electron' 'broken owned Electron (missing handlers) is replaced even when Vite is alive'
$action = Resolve-DevAction -Runtime @{ VitePid = 1; ElectronMainPid = 2; DevPid = 3; Health = 'starting' }
Assert-Eq $action.Action 'surface-running' 'starting (current but not renderer-ready) still surfaces after the marker wait'

$markerHealthy = @{
    exists = $true; pid = 42
    mainHash = 'AAA'; preloadHash = 'BBB'
    registeredIpcChannels = @('cron:app:restart', 'cron:project:reveal', 'cron:project:copy-path', 'cron:project:refresh', 'cron:project:rename', 'cron:project:relink', 'cron:project:archive', 'cron:project:restore-last-active')
    rendererReady = $true; windowReady = $true; startupTimestamp = 1; registrationError = ''; appVersion = 'x'
}
$markerStale = @{ exists = $false; pid = 0; mainHash = ''; preloadHash = ''; registeredIpcChannels = @(); rendererReady = $false; windowReady = $false; startupTimestamp = 0; registrationError = ''; appVersion = '' }
$markerOldPid = @{ exists = $true; pid = 7; mainHash = 'AAA'; preloadHash = 'BBB'; registeredIpcChannels = $markerHealthy.registeredIpcChannels; rendererReady = $true; windowReady = $true; startupTimestamp = 1; registrationError = ''; appVersion = 'x' }
$markerOldHash = @{ exists = $true; pid = 42; mainHash = 'OLD'; preloadHash = 'BBB'; registeredIpcChannels = $markerHealthy.registeredIpcChannels; rendererReady = $true; windowReady = $true; startupTimestamp = 1; registrationError = ''; appVersion = 'x' }
$markerBroken = @{ exists = $true; pid = 42; mainHash = 'AAA'; preloadHash = 'BBB'; registeredIpcChannels = @('cron:app:restart'); rendererReady = $true; windowReady = $true; startupTimestamp = 1; registrationError = ''; appVersion = 'x' }
$markerStarting = @{ exists = $true; pid = 42; mainHash = 'AAA'; preloadHash = 'BBB'; registeredIpcChannels = $markerHealthy.registeredIpcChannels; rendererReady = $false; windowReady = $true; startupTimestamp = 1; registrationError = ''; appVersion = 'x' }

Assert-Eq (Resolve-DevElectronHealth -ElectronPid 0 -Marker $markerHealthy -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') 'none' 'no Electron classifies as none'
Assert-Eq (Resolve-DevElectronHealth -ElectronPid 42 -Marker $markerStale -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') 'stale' 'missing marker classifies as stale'
Assert-Eq (Resolve-DevElectronHealth -ElectronPid 42 -Marker $markerOldPid -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') 'stale' 'marker pid mismatch classifies as stale'
Assert-Eq (Resolve-DevElectronHealth -ElectronPid 42 -Marker $markerOldHash -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') 'stale' 'outdated main source hash classifies as stale'
Assert-Eq (Resolve-DevElectronHealth -ElectronPid 42 -Marker $markerBroken -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') 'broken' 'incomplete channel list classifies as broken'
Assert-Eq (Resolve-DevElectronHealth -ElectronPid 42 -Marker $markerStarting -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') 'starting' 'current-but-not-renderer-ready classifies as starting'
Assert-Eq (Resolve-DevElectronHealth -ElectronPid 42 -Marker $markerHealthy -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') 'healthy' 'current complete renderer-ready marker classifies as healthy'

Assert-Eq (Test-DevMainMarkerReady -Marker $markerHealthy -ElectronPid 42 -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') $true 'healthy marker is ready'
Assert-Eq (Test-DevMainMarkerReady -Marker $markerBroken -ElectronPid 42 -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') $false 'broken marker is not ready'
Assert-Eq (Test-DevMainMarkerReady -Marker $markerStarting -ElectronPid 42 -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') $false 'starting marker is not ready yet'

$markerFailedLoad = @{ exists = $true; pid = 42; mainHash = 'AAA'; preloadHash = 'BBB'; registeredIpcChannels = $markerHealthy.registeredIpcChannels; rendererReady = $true; windowReady = $true; startupTimestamp = 1; registrationError = ''; appVersion = 'x'; lastStartupError = 'did-fail-load -102 ERR_CONNECTION_REFUSED' }
Assert-Eq (Resolve-DevElectronHealth -ElectronPid 42 -Marker $markerFailedLoad -CurrentMainHash 'AAA' -CurrentPreloadHash 'BBB') 'broken' 'recorded startup error (did-fail-load) classifies as broken'

$missing = Get-DevMissingIpcChannels -Marker $markerBroken
Assert-True ($missing -contains 'cron:project:reveal') 'missing-channel diagnostics list the absent handler'
Assert-Eq ($missing.Count) 7 'missing-channel diagnostics count is exact'

# ---------------- In-app restart intent ----------------

$tmpIntent = Join-Path $env:TEMP ('cron-dev-restart-intent-' + [guid]::NewGuid().ToString('N') + '.json')
$tmpIntentStale = Join-Path $env:TEMP ('cron-dev-restart-intent-stale-' + [guid]::NewGuid().ToString('N') + '.json')
try {
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    [System.IO.File]::WriteAllText($tmpIntent, (@{ pid = 42; requestedAt = $now } | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
    Assert-Eq (Test-DevRestartRequested -Path $tmpIntent) $true 'fresh in-app restart intent is honoured'
    $stale = $now - 600000
    [System.IO.File]::WriteAllText($tmpIntentStale, (@{ pid = 42; requestedAt = $stale } | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
    Assert-Eq (Test-DevRestartRequested -Path $tmpIntentStale) $false 'stale restart intent (older than max age) is ignored'
    Assert-Eq (Test-DevRestartRequested -Path (Join-Path $env:TEMP 'cron-dev-no-intent.json')) $false 'missing restart intent file is ignored'
    Clear-DevRestartRequested -Path $tmpIntent
    Assert-Eq (Test-DevRestartRequested -Path $tmpIntent) $false 'cleared restart intent is no longer honoured'
}
finally {
    Remove-Item -LiteralPath $tmpIntent -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tmpIntentStale -Force -ErrorAction SilentlyContinue
}

# ---------------- Marker file round-trip ----------------

$tmpMarker = Join-Path $env:TEMP ('cron-dev-marker-test-' + [guid]::NewGuid().ToString('N') + '.json')
try {
    [System.IO.File]::WriteAllText($tmpMarker, (@{
        appVersion = '1.1.7'; pid = 42; mainHash = 'AAA'; preloadHash = 'BBB'
        registeredIpcChannels = $markerHealthy.registeredIpcChannels
        rendererReady = $true; windowReady = $true; startupTimestamp = 1; registrationError = ''
    } | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
    $round = Read-DevMainMarker -Path $tmpMarker
    Assert-Eq $round.exists $true 'marker file is readable'
    Assert-Eq $round.pid 42 'marker file round-trips the pid'
    Assert-Eq $round.registeredIpcChannels.Count 8 'marker file round-trips all eight channels'
    $missingRead = Read-DevMainMarker -Path (Join-Path $env:TEMP 'cron-dev-marker-does-not-exist.json')
    Assert-Eq $missingRead.exists $false 'missing marker file yields exists=false'
}
finally {
    Remove-Item -LiteralPath $tmpMarker -Force -ErrorAction SilentlyContinue
}

# ---------------- Stale PID / lock recovery ----------------

$script:AlivePids = @(2, 3)
$script:CommandLines = @{
    2 = "`"$script:OwnedRoot\node_modules\electron\electron.exe`" ."
    3 = "`"$script:OwnedRoot\apps\standalone\scripts\dev.mjs`""
}
$state = Resolve-DevState -State @{ port = 5190; devPid = 3; vitePid = 999; electronPid = 2 } -Probe $probe
Assert-Eq $state.port 5190 'stale state keeps its port'
Assert-Eq $state.vitePid 0 'stale (dead) PID is dropped'
Assert-Eq $state.electronPid 2 'live owned Electron PID is kept'
Assert-Eq $state.devPid 3 'live owned dev PID is kept'

$tmpState = Join-Path $env:TEMP ('cron-dev-state-test-' + [guid]::NewGuid().ToString('N') + '.json')
try {
    Write-DevState -Path $tmpState -State @{ port = 5190; devPid = 3; vitePid = 0; electronPid = 2 }
    $round = Read-DevState -Path $tmpState
    Assert-Eq $round.port 5190 'state file round-trips the port'
    Assert-Eq $round.electronPid 2 'state file round-trips the electron pid'
}
finally {
    Remove-Item -LiteralPath $tmpState -Force -ErrorAction SilentlyContinue
}

# ---------------- Launcher source contract ----------------

$launcher = Get-Content -LiteralPath (Join-Path $scriptDir 'run-code-dev-hidden.ps1') -Raw
$logic = Get-Content -LiteralPath (Join-Path $scriptDir 'code-dev-launcher-logic.ps1') -Raw
$vbs = Get-Content -LiteralPath (Join-Path $repoRoot 'launch-cron-for-code-dev.vbs') -Raw
$bat = Get-Content -LiteralPath (Join-Path $repoRoot 'Launch-CRON-for-Code-Dev.bat') -Raw
$shortcutScript = Get-Content -LiteralPath (Join-Path $scriptDir 'create-code-dev-shortcut.ps1') -Raw

Assert-True ($launcher -match 'code-dev-launcher-logic\.ps1') 'launcher dot-sources the logic module'
Assert-True ($logic -match '\$script:DevDefaultPort = 5190') 'built-in default port is 5190'
Assert-True ($logic -match '\$script:DevReservedPorts') 'logic module defines reserved CRON ports'
Assert-True ($logic -notmatch 'DevPortRange') 'no fallback scan range exists for CRON for Code'
Assert-True ($launcher -match 'NOT modified') 'launcher discloses (never modifies) colliding CRON_*_PORT env vars'
Assert-True ($launcher -match 'Repair-DevStatePort') 'launcher repairs a persisted foreign/reserved port'
Assert-True ($launcher -match 'pnpm exec electron \.') 'launcher launches Electron via the approved dev command'
Assert-True ($launcher -match 'apps\\standalone') 'launcher runs Electron from apps/standalone (correct app entry)'
Assert-True ($launcher -match 'code-dev-state\.json') 'launcher persists state under .runtime/code-dev-state.json'
Assert-True ($launcher -match 'code-dev-main-marker\.json') 'launcher reads the dev main runtime marker'
Assert-True ($launcher -match 'Resolve-DevElectronHealth') 'launcher classifies dev main health from the marker'
Assert-True ($launcher -match 'Wait-ForMainMarker') 'launcher waits for the renderer-ready + IPC-ready marker'
Assert-True ($launcher -match 'code-dev-restart-requested\.json') 'launcher reads the in-app restart intent marker'
Assert-True ($launcher -match 'Test-DevRestartRequested') 'launcher honours the in-app restart intent'
Assert-True ($launcher -match 'Clear-DevRestartRequested') 'launcher consumes the restart intent marker'
Assert-True ($launcher -match 'In-app restart requested') 'launcher logs the in-app restart handoff'
Assert-True ($logic -match 'DevRequiredIpcChannels') 'logic module defines the required IPC channel list'
Assert-True ($logic -match 'Read-DevMainMarker') 'logic module reads the main runtime marker'
Assert-True ($logic -match 'Test-DevMainMarkerReady') 'logic module tests marker readiness'
Assert-True ($launcher -match 'Get-FileHash') 'launcher compares current source hashes against the marker'
Assert-True ($launcher -match 'code-dev-launcher\.log') 'launcher writes code-dev-launcher.log'
Assert-True ($launcher -match 'code-dev-vite\.log') 'launcher references code-dev-vite.log'
Assert-True ($launcher -match 'code-dev-electron\.log') 'launcher references code-dev-electron.log'
Assert-True ($launcher -notmatch 'taskkill') 'launcher does not use taskkill (uses the reliable owned-pid Stop-Process)'
Assert-True ($launcher -match 'Stop-Process -Id \$action\.ElectronMainPid') 'launcher only ever terminates the owned Electron main pid'
Assert-True ($launcher -match 'Get-OwnedElectronMainPid') 'launcher only ever terminates pids from its owned scan'

Assert-True ($vbs -match 'WScript\.ScriptFullName') 'VBS resolves repo root dynamically (no hardcoded user)'
Assert-True ($vbs -notmatch 'CRON_CODE_DEV_PORT') 'VBS has no temporary terminal environment dependency'
Assert-True ($vbs -notmatch 'CRON_DEV') 'VBS does not depend on a terminal-set environment variable'
Assert-True ($bat -match '%~dp0') 'BAT resolves repo root dynamically'

Assert-True ($shortcutScript -match 'electron\.exe') 'shortcut creator targets electron.exe directly (single taskbar identity)'
Assert-True ($shortcutScript -notmatch 'launch-cron-for-code-dev') 'shortcut creator does not target the VBS launcher'
Assert-True ($shortcutScript -match '\$shortcut\.WorkingDirectory = \$standaloneDir') 'shortcut runs Electron from the standalone app directory'
Assert-True ($shortcutScript -match 'code_icon\.ico') 'shortcut uses the CRON for Code icon'
Assert-True ($shortcutScript -notmatch 'CRON_CODE_DEV_PORT') 'shortcut does not embed a temporary environment variable'
Assert-True ($shortcutScript -match '\$shell\.CreateShortcut') 'shortcut creator builds a .lnk (not an auto-pin action)'
Assert-True ($shortcutScript -notmatch 'Shell\.Application') 'shortcut creator does not auto-pin to the taskbar'
Assert-True ($shortcutScript -notmatch 'reg\.exe') 'shortcut creator does not touch the registry via reg.exe'
Assert-True ($shortcutScript -notmatch 'Set-ItemProperty') 'shortcut creator does not touch the registry via Set-ItemProperty'

if ($script:FailCount -gt 0) {
    Write-Host ("{0} assertion(s) FAILED." -f $script:FailCount)
    exit 1
}
Write-Host 'All dev-launcher logic/source tests passed.'
exit 0
