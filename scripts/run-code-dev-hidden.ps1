# CRON for Code - hidden, restart-safe development launcher.
# Dot-sources scripts/code-dev-launcher-logic.ps1 for port/PID/lifecycle decisions.
# Starts the repo's approved dev command (apps/standalone/scripts/dev.mjs -> Vite + Electron),
# records process ownership in .runtime/code-dev-state.json, and self-repairs stale state.
# Never runs installers. Never terminates unrelated processes.
[CmdletBinding()]
param(
    [int]$Port = 0,
    [ValidateSet('dev', 'normal')]
    [string]$Mode = 'normal'
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptDir
$appDir = Join-Path $repoRoot 'apps\standalone'
$logDir = Join-Path $repoRoot '.runtime'
$launcherLog = Join-Path $logDir 'code-dev-launcher.log'
$statePath = Join-Path $logDir 'code-dev-state.json'
$mainMarkerPath = Join-Path $logDir 'code-dev-main-marker.json'
$restartIntentPath = Join-Path $logDir 'code-dev-restart-requested.json'
$mainScriptPath = Join-Path $appDir 'electron\main.mjs'
$preloadScriptPath = Join-Path $appDir 'electron\preload.cjs'
$rendererEntryPath = Join-Path $appDir 'dist-renderer\index.html'

# Normal mode loads the production-built renderer (file://) and never starts Vite.
# If the built renderer is missing, fall back to dev mode so the app always launches.
if ($Mode -eq 'normal' -and -not (Test-Path -LiteralPath $rendererEntryPath)) {
    Write-LauncherLog "WARN: dist-renderer not built ($rendererEntryPath). Falling back to dev mode (Vite)."
    $Mode = 'dev'
}

. (Join-Path $scriptDir 'code-dev-launcher-logic.ps1')

if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-LauncherLog([string]$message) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
    Add-Content -LiteralPath $launcherLog -Value $line -Encoding UTF8
}

# ---- Real probes (injectable equivalents used by tests) ----
# Probe caching: Get-CimInstance Win32_Process is slow on this machine (~1s per
# call), and the launcher probes process state repeatedly during startup. One
# snapshot query (2s TTL) serves Electron/dev/Vite ownership checks so the
# launcher's own decision phase stops dominating the startup time.

$script:ownedProcessSnapshot = $null
$script:ownedProcessSnapshotAt = 0
$script:ownedProcessSnapshotTtlMs = 2000

function Get-OwnedProcessSnapshot {
    $now = Get-Date
    if ($null -ne $script:ownedProcessSnapshot -and ($now - [datetime]$script:ownedProcessSnapshotAt).TotalMilliseconds -lt $script:ownedProcessSnapshotTtlMs) {
        return $script:ownedProcessSnapshot
    }
    $snapshot = @{
        ElectronMainPids = @()
        DevPids = @()
        VitePids = @()
    }
    Get-CimInstance Win32_Process -Filter "Name='electron.exe' OR Name='node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match [regex]::Escape($repoRoot) } |
        ForEach-Object {
            if ($_.Name -eq 'electron.exe' -and $_.CommandLine -notmatch '--type=') {
                $snapshot.ElectronMainPids += [int]$_.ProcessId
            }
            elseif ($_.Name -eq 'node.exe') {
                if ($_.CommandLine -match 'dev\.mjs') { $snapshot.DevPids += [int]$_.ProcessId }
                if ($_.CommandLine -match 'vite') { $snapshot.VitePids += [int]$_.ProcessId }
            }
        }
    $script:ownedProcessSnapshot = $snapshot
    $script:ownedProcessSnapshotAt = $now
    return $snapshot
}

function Clear-OwnedProcessSnapshot {
    $script:ownedProcessSnapshot = $null
    $script:ownedProcessSnapshotAt = 0
}

function Get-PortOwnerPid([int]$port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -First 1
        if ($conn) { return $conn.OwningProcess }
    }
    catch { }
    return $null
}

function Get-ProcessCommandLine([int]$procId) {
    try {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction Stop
        if ($proc) { return [string]$proc.CommandLine }
    }
    catch { }
    return ''
}

function Test-ProcessAlive([int]$procId) {
    return $null -ne (Get-Process -Id $procId -ErrorAction SilentlyContinue)
}

function Test-ProcessOwned([int]$procId) {
    $cmd = Get-ProcessCommandLine $procId
    return $cmd -match [regex]::Escape($repoRoot)
}

function Get-OwnedVitePid([int]$port) {
    $snapshot = Get-OwnedProcessSnapshot
    foreach ($pidCandidate in $snapshot.VitePids) {
        if ((Get-PortOwnerPid $port) -eq $pidCandidate) { return $pidCandidate }
    }
    return 0
}

function Get-OwnedElectronMainPid() {
    $snapshot = Get-OwnedProcessSnapshot
    if ($snapshot.ElectronMainPids.Count -gt 0) { return $snapshot.ElectronMainPids[0] }
    return 0
}

function Get-OwnedDevPid() {
    $snapshot = Get-OwnedProcessSnapshot
    if ($snapshot.DevPids.Count -gt 0) { return $snapshot.DevPids[0] }
    return 0
}

$probe = @{
    GetPortOwner = { param([int]$p) Get-PortOwnerPid $p }
    GetCommandLine = { param([int]$p) Get-ProcessCommandLine $p }
    IsAlive = { param([int]$p) Test-ProcessAlive $p }
    IsOwned = { param([int]$p) Test-ProcessOwned $p }
}

$electronCandidates = @(
    (Join-Path $appDir 'node_modules\electron\dist\electron.exe'),
    (Join-Path $repoRoot 'node_modules\electron\dist\electron.exe')
)
$electronExe = $electronCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

function Start-DevElectron([int]$port) {
    $oldUrl = $env:CRON_CODE_DEV_URL
    $oldDev = $env:CRON_DEV
    $env:CRON_CODE_DEV_URL = "http://127.0.0.1:$port"
    $env:CRON_DEV = if ($Mode -eq 'normal') { '0' } else { '1' }
    try {
        # Prefer the resolved electron.exe (no pnpm/cmd resolution cost). The
        # app package ("main": "electron/main.mjs") is the working directory.
        if ($electronExe) {
            Start-Process -FilePath $electronExe -ArgumentList @('.') `
                -WorkingDirectory $appDir -WindowStyle Hidden | Out-Null
        }
        else {
            Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'pnpm exec electron .') `
                -WorkingDirectory $appDir -WindowStyle Hidden | Out-Null
        }
        return $true
    }
    catch {
        Write-LauncherLog "FAIL: could not launch Electron: $($_.Exception.Message)"
        return $false
    }
    finally {
        if ($null -eq $oldUrl) { Remove-Item Env:CRON_CODE_DEV_URL -ErrorAction SilentlyContinue }
        else { $env:CRON_CODE_DEV_URL = $oldUrl }
        if ($null -eq $oldDev) { Remove-Item Env:CRON_DEV -ErrorAction SilentlyContinue }
        else { $env:CRON_DEV = $oldDev }
    }
}

function Wait-ForPort([int]$port, [int]$seconds) {
    for ($i = 0; $i -lt $seconds; $i++) {
        Start-Sleep -Seconds 1
        if (Get-PortOwnerPid $port) { return $true }
    }
    return $false
}

function Wait-ForElectron([int]$seconds) {
    Clear-OwnedProcessSnapshot
    for ($i = 0; $i -lt $seconds; $i++) {
        Start-Sleep -Seconds 1
        if ((Get-OwnedElectronMainPid) -gt 0) { return $true }
    }
    return $false
}

# Waits until the dev main-process runtime marker proves the Electron main is
# current (hashes + pid), has all required IPC channels registered, and the
# renderer has signalled ready. A window title or live PID is NOT sufficient.
# A recorded startup failure (did-fail-load etc.) fails fast instead of waiting.
function Wait-ForMainMarker([int]$seconds) {
    $currentMainHash = Get-FileHash -Algorithm SHA256 -LiteralPath $mainScriptPath | Select-Object -ExpandProperty Hash
    $currentPreloadHash = Get-FileHash -Algorithm SHA256 -LiteralPath $preloadScriptPath | Select-Object -ExpandProperty Hash
    Clear-OwnedProcessSnapshot
    for ($i = 0; $i -lt $seconds; $i++) {
        Start-Sleep -Seconds 1
        $marker = Read-DevMainMarker -Path $mainMarkerPath
        $electronPid = Get-OwnedElectronMainPid
        if ($marker.lastStartupError) {
            Write-LauncherLog "FAIL: dev main recorded a startup error: $($marker.lastStartupError)"
            return $false
        }
        if (Test-DevMainMarkerReady -Marker $marker -ElectronPid $electronPid `
            -CurrentMainHash $currentMainHash -CurrentPreloadHash $currentPreloadHash) {
            return $true
        }
    }
    return $false
}

function Get-CurrentSourceHashes {
    $mainHash = if (Test-Path -LiteralPath $mainScriptPath) {
        Get-FileHash -Algorithm SHA256 -LiteralPath $mainScriptPath | Select-Object -ExpandProperty Hash
    } else { '' }
    $preloadHash = if (Test-Path -LiteralPath $preloadScriptPath) {
        Get-FileHash -Algorithm SHA256 -LiteralPath $preloadScriptPath | Select-Object -ExpandProperty Hash
    } else { '' }
    return @{ Main = $mainHash; Preload = $preloadHash }
}

function Start-DevStack([int]$port) {
    $devScript = Join-Path $repoRoot 'apps\standalone\scripts\dev.mjs'
    if (-not (Test-Path -LiteralPath $devScript)) {
        Write-LauncherLog "FAIL: dev script not found at $devScript"
        return $false
    }

    $oldLogDir = $env:CRON_DEV_LOG_DIR
    $oldPort = $env:CRON_CODE_DEV_PORT
    $oldDev = $env:CRON_DEV
    $oldMode = $env:CRON_RUN_MODE
    $env:CRON_DEV_LOG_DIR = $logDir
    $env:CRON_CODE_DEV_PORT = [string]$port
    $env:CRON_RUN_MODE = $Mode
    $env:CRON_DEV = '1'
    $proc = $null
    try {
        $quotedDevScript = '"' + $devScript + '"'
        $proc = Start-Process -FilePath 'node.exe' -ArgumentList @($quotedDevScript) `
            -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
    }
    catch {
        Write-LauncherLog "FAIL: could not start dev command: $($_.Exception.Message)"
        return $false
    }
    finally {
        if ($null -eq $oldLogDir) { Remove-Item Env:CRON_DEV_LOG_DIR -ErrorAction SilentlyContinue }
        else { $env:CRON_DEV_LOG_DIR = $oldLogDir }
        if ($null -eq $oldPort) { Remove-Item Env:CRON_CODE_DEV_PORT -ErrorAction SilentlyContinue }
        else { $env:CRON_CODE_DEV_PORT = $oldPort }
        if ($null -eq $oldMode) { Remove-Item Env:CRON_RUN_MODE -ErrorAction SilentlyContinue }
        else { $env:CRON_RUN_MODE = $oldMode }
        if ($null -eq $oldDev) { Remove-Item Env:CRON_DEV -ErrorAction SilentlyContinue }
        else { $env:CRON_DEV = $oldDev }
    }

    Start-Sleep -Seconds 1
    if ($proc.HasExited) {
        Write-LauncherLog "FAIL: dev command exited immediately (code $($proc.ExitCode)). See .runtime/code-dev-vite.log and .runtime/code-dev-electron.log."
        return $false
    }
    Write-LauncherLog "Dev command started (PID $($proc.Id), mode=$Mode)."

    if ($Mode -eq 'dev') {
        if (-not (Wait-ForPort $port 60)) {
            Write-LauncherLog "FAIL: dev service did not become reachable on port $port within 60s. See .runtime/code-dev-vite.log and .runtime/code-dev-electron.log."
            return $false
        }
        Write-LauncherLog "Dev service reachable at http://127.0.0.1:$port."
    }
    return $true
}

function Write-CurrentState([int]$port) {
    $state = @{
        port = $port
        devPid = (Get-OwnedDevPid)
        vitePid = (Get-OwnedVitePid $port)
        electronPid = (Get-OwnedElectronMainPid)
    }
    Write-DevState -Path $statePath -State $state
    Write-LauncherLog "Recorded state: port=$port devPid=$($state.devPid) vitePid=$($state.vitePid) electronPid=$($state.electronPid)."
}

# ================= main =================

Write-LauncherLog "=== CRON for Code dev launcher starting ==="
Write-LauncherLog "Repo root: $repoRoot"

# 1. node_modules must already be installed. Never run install.
$nodeModules = Join-Path $repoRoot 'node_modules'
if (-not (Test-Path -LiteralPath $nodeModules)) {
    Write-LauncherLog "FAIL: node_modules not found at $nodeModules. Dependencies must be installed manually (the dev launcher never installs)."
    exit 1
}

# 2. Read persisted state and repair stale metadata (self-repair before deciding).
$rawState = Read-DevState -Path $statePath
$state = Resolve-DevState -State $rawState -Probe $probe
if ($state.port -ne $rawState.port -or $state.devPid -ne $rawState.devPid -or
    $state.vitePid -ne $rawState.vitePid -or $state.electronPid -ne $rawState.electronPid) {
    Write-LauncherLog "Repaired stale launcher state (recorded pids no longer live/owned)."
    Write-DevState -Path $statePath -State $state
}

# 2a. Clear/repair a persisted port that is not approved for CRON for Code (foreign/reserved).
$portRepair = Repair-DevStatePort -State $state
if ($portRepair.Repaired) {
    Write-LauncherLog "Repaired persisted state: previously recorded port $($rawState.port) is not approved for CRON for Code (see CRON_APP_PORT_REGISTRY.md). Reset to $($portRepair.State.port)."
    $state = $portRepair.State
    Write-DevState -Path $statePath -State $state
}

# 3. Select the port: -Port > CRON_CODE_DEV_PORT > persisted (approved only) > default 5190.
# No fallback scan is permitted for CRON for Code (see CRON_APP_PORT_REGISTRY.md).
$envPort = 0
if ($env:CRON_CODE_DEV_PORT) {
    $envPort = [int]$env:CRON_CODE_DEV_PORT
}
$selection = Select-DevPort -ExplicitPort $Port -EnvironmentPort $envPort `
    -PersistedPort $state.port -RepoRoot $repoRoot -Probe $probe

if ($selection.Port -le 0) {
    Write-LauncherLog "FAIL: $($selection.Reason)"
    exit 2
}
$devPort = $selection.Port
Write-LauncherLog "Selected dev port: $devPort (source: $($selection.Source))."

# 3a. Disclose (but never modify) unrelated CRON_*_PORT env vars that collide with the selected port.
foreach ($envItem in (Get-ChildItem Env: | Where-Object { $_.Name -match '^CRON_.*_PORT$' -and $_.Name -ne 'CRON_CODE_DEV_PORT' })) {
    if ([string]$envItem.Value -eq [string]$devPort) {
        Write-LauncherLog "NOTE: environment variable $($envItem.Name) is set to $devPort (the CRON for Code port). Another project's variable was NOT modified."
    }
}

# 4. Classify the live runtime and decide the action.
$runtime = @{
    VitePid = (Get-OwnedVitePid $devPort)
    ElectronMainPid = (Get-OwnedElectronMainPid)
    DevPid = (Get-OwnedDevPid)
}
$hashes = Get-CurrentSourceHashes
$marker = Read-DevMainMarker -Path $mainMarkerPath
$health = Resolve-DevElectronHealth -ElectronPid $runtime.ElectronMainPid -Marker $marker `
    -CurrentMainHash $hashes.Main -CurrentPreloadHash $hashes.Preload

# 4a. An in-app restart request (written by main.mjs before handoff) forces the
# owned stack replacement instead of surfacing, so Restart converges on the
# approved launcher lifecycle with full renderer-readiness verification.
$restartRequested = Test-DevRestartRequested -Path $restartIntentPath
if ($restartRequested) {
    Write-LauncherLog "In-app restart requested (intent marker present). Replacing the owned dev stack."
    Clear-DevRestartRequested -Path $restartIntentPath
    $health = 'stale'
}
elseif (Test-Path -LiteralPath $restartIntentPath) {
    # A stale intent is left behind when a restart click's launcher never ran
    # (e.g. the old detached-spawn defect). Clear it so it can never misfire.
    Clear-DevRestartRequested -Path $restartIntentPath
    Write-LauncherLog "Cleared stale restart intent (from a previous restart that did not complete)."
}

$runtime.Health = $health
if ($health -eq 'stale') {
    Write-LauncherLog "Stale dev main detected (marker missing, pid mismatch, or main/preload source changed): current main hash=$($hashes.Main) marker main hash=$($marker.mainHash)."
}
if ($health -eq 'broken') {
    $missing = Get-DevMissingIpcChannels -Marker $marker
    Write-LauncherLog "Broken dev main detected - missing required IPC channels: $($missing -join ', ')."
}
$action = Resolve-DevAction -Runtime $runtime
Write-LauncherLog "Lifecycle decision: $($action.Action) (vite=$($action.VitePid) electron=$($action.ElectronMainPid) dev=$($action.DevPid) health=$health)."

# Normal mode has no Vite, so Resolve-DevAction cannot see a 'running stack'.
# A healthy owned Electron IS the whole normal-mode stack: surface it.
if ($Mode -eq 'normal' -and $runtime.ElectronMainPid -gt 0 -and $health -eq 'healthy') {
    Write-LauncherLog "Normal-mode stack already running (electron PID $($runtime.ElectronMainPid)). Surfacing the window."
    if (-not (Start-DevElectron $devPort)) { exit 1 }
    Write-CurrentState $devPort
    Write-LauncherLog "App window surfacing requested. Launcher completed."
    exit 0
}

switch ($action.Action) {
    'surface-running' {
        if ($health -eq 'healthy') {
            Write-LauncherLog "A healthy current dev stack is already running (vite PID $($action.VitePid), electron PID $($action.ElectronMainPid)). Surfacing the window via the single-instance lock."
            if (-not (Start-DevElectron $devPort)) { exit 1 }
            Write-CurrentState $devPort
            Write-LauncherLog "App window surfacing requested. Launcher completed."
            exit 0
        }
        # Health 'starting': the main process is current but the renderer has not
        # signalled readiness yet. Wait for the marker, then report ready.
        Write-LauncherLog "Dev main is current but renderer-ready marker not yet confirmed. Waiting for the runtime marker."
        if (-not (Wait-ForMainMarker 90)) {
            Write-LauncherLog "FAIL: dev main never became renderer-ready (marker not confirmed within 90s)."
            exit 1
        }
        Write-CurrentState $devPort
        Write-LauncherLog "App ready (renderer-ready marker confirmed). Launcher completed."
        exit 0
    }
    'replace-stale-electron' {
        Write-LauncherLog "Replacing only this repo's stale/broken owned Electron process (PID $($action.ElectronMainPid))."
        Stop-Process -Id $action.ElectronMainPid -Force -ErrorAction SilentlyContinue
        # The dying Electron tree can linger in the process table briefly; poll
        # until no owned Electron main remains (bounded) before relaunching.
        $stopped = $false
        for ($i = 0; $i -lt 15; $i++) {
            Start-Sleep -Seconds 1
            if ((Get-OwnedElectronMainPid) -le 0) { $stopped = $true; break }
        }
        if (-not $stopped) {
            Write-LauncherLog "FAIL: stale Electron (PID $($action.ElectronMainPid)) could not be stopped within 15s."
            exit 1
        }
        Write-LauncherLog "Stale Electron stopped. Proceeding with replacement."
        # The owned dev.mjs tears down its Vite when the Electron shim exits.
        # Wait (bounded) for that teardown to complete so the reuse-vite decision
        # is deterministic and a new Electron can never connect to a dying Vite.
        $devTornDown = $false
        for ($i = 0; $i -lt 15; $i++) {
            if ((Get-OwnedDevPid) -le 0) { $devTornDown = $true; break }
            Start-Sleep -Seconds 1
        }
        if (-not $devTornDown) {
            Write-LauncherLog "WARN: old dev.mjs still running after Electron stopped; proceeding anyway."
        }
        # If the owned Vite survived the teardown, reuse it; otherwise start fresh.
        if ((Get-OwnedVitePid $devPort) -gt 0) {
            Write-LauncherLog "Owned Vite survived; reusing it and relaunching Electron from apps/standalone."
            if (-not (Start-DevElectron $devPort)) { exit 1 }
            if (-not (Wait-ForElectron 30)) {
                Write-LauncherLog "FAIL: Electron did not appear within 30s after stale replacement. Starting a fresh stack instead."
                if (-not (Start-DevStack $devPort)) { exit 1 }
            }
        } else {
            Write-LauncherLog "Starting a fresh dev stack on port $devPort."
            if (-not (Start-DevStack $devPort)) { exit 1 }
        }
        if (-not (Wait-ForElectron 30)) {
            Write-LauncherLog "FAIL: Electron did not appear within 30s of stale replacement."
            exit 1
        }
        if (-not (Wait-ForMainMarker 90)) {
            Write-LauncherLog "FAIL: replaced dev main did not prove ready (marker/renderer-ready not confirmed within 90s)."
            exit 1
        }
        Write-CurrentState $devPort
        Write-LauncherLog "App ready (electron PID $(Get-OwnedElectronMainPid), renderer-ready marker confirmed). Launcher completed."
        exit 0
    }
    'reuse-vite' {
        Write-LauncherLog "Owned Vite remains (PID $($action.VitePid)) but Electron is closed. Reusing the owned dev server and relaunching Electron from apps/standalone."
        if (-not (Start-DevElectron $devPort)) { exit 1 }
        if (-not (Wait-ForElectron 30)) {
            Write-LauncherLog "FAIL: Electron did not appear within 30s after reuse. See .runtime/code-dev-electron.log."
            exit 1
        }
        if (-not (Wait-ForMainMarker 90)) {
            Write-LauncherLog "FAIL: reused dev main did not prove ready (marker/renderer-ready not confirmed within 90s)."
            exit 1
        }
        Write-CurrentState $devPort
        Write-LauncherLog "App ready (electron PID $(Get-OwnedElectronMainPid), renderer-ready marker confirmed). Launcher completed."
        exit 0
    }
    default {
        Write-LauncherLog "No dev stack running. Starting a fresh dev stack on port $devPort."
        if (-not (Start-DevStack $devPort)) { exit 1 }
        if (-not (Wait-ForElectron 30)) {
            Write-LauncherLog "FAIL: Electron did not appear within 30s of fresh start. See .runtime/code-dev-electron.log."
            exit 1
        }
        if (-not (Wait-ForMainMarker 90)) {
            Write-LauncherLog "FAIL: fresh dev main did not prove ready (marker/renderer-ready not confirmed within 90s)."
            exit 1
        }
        Write-CurrentState $devPort
        Write-LauncherLog "App ready (electron PID $(Get-OwnedElectronMainPid), renderer-ready marker confirmed). Launcher completed."
        exit 0
    }
}
