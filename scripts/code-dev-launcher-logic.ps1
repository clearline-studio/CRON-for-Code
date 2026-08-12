# CRON for Code - dev launcher logic module.
# Dot-sourceable, side-effect free. Contains the pure decision functions used by
# scripts/run-code-dev-hidden.ps1 and exercised by scripts/test-code-dev-launcher.ps1.
#
# Probe contract (hashtable of scriptblocks) passed by callers/tests:
#   GetPortOwner(port)   -> owning PID or $null
#   GetCommandLine(pid)  -> command line string or ''
#   IsAlive(pid)         -> bool
#   IsOwned(pid)         -> bool (command line belongs to this repo)

Set-StrictMode -Version Latest

# CRON-wide development-port allocation per CRON_APP_PORT_REGISTRY.md.
$script:DevDefaultPort = 5190                        # CRON for Code assigned port (locked)
$script:DevApprovedPorts = @(5190)                   # Code's own port + any Architect-approved additions
$script:DevReservedPorts = @(4000, 5173, 5180, 5191, 5192, 5193, 5194, 5195, 5196, 5197, 5198) # other CRON apps
# NOTE: there is intentionally NO fallback scan range for CRON for Code.

# IPC channels the live dev main process must register for the stack to be healthy.
$script:DevRequiredIpcChannels = @(
    'cron:app:restart',
    'cron:project:reveal',
    'cron:project:copy-path',
    'cron:project:refresh',
    'cron:project:rename',
    'cron:project:relink',
    'cron:project:archive',
    'cron:project:restore-last-active'
)

# In-app restart intent file (written by main.mjs before it hands off to the launcher).
$script:DevRestartIntentMaxAgeSeconds = 300

# Returns @{ Reserved; Reason }.
function Test-DevPortReserved {
    param([int]$Port)
    if ($script:DevReservedPorts -contains $Port) {
        return @{
            Reserved = $true
            Reason = "Port $Port is assigned to another CRON application (see CRON_APP_PORT_REGISTRY.md). CRON for Code may only use port $($script:DevDefaultPort) or an Architect-approved unassigned port."
        }
    }
    return @{ Reserved = $false; Reason = '' }
}

# Returns 'free' | 'owned' | 'unrelated'.
function Get-DevPortStatus {
    param(
        [int]$Port,
        [string]$RepoRoot,
        [hashtable]$Probe
    )
    $fn = [scriptblock]$Probe.GetPortOwner
    $ownerPid = & $fn $Port
    if (-not $ownerPid) { return 'free' }

    $cmdFn = [scriptblock]$Probe.GetCommandLine
    $cmd = & $cmdFn $ownerPid
    if ($cmd -and $cmd -match 'vite' -and $cmd -match [regex]::Escape($RepoRoot)) {
        return 'owned'
    }
    return 'unrelated'
}

# Validates one candidate port against the registry and live listeners.
# Returns @{ Port; Source; Reason }. Port = 0 means refused.
function Resolve-DevPortChoice {
    param(
        [int]$Port,
        [string]$Source,
        [int[]]$ReservedPorts,
        [string]$RepoRoot,
        [hashtable]$Probe
    )
    if ($Port -le 0) { return @{ Port = 0; Source = 'none'; Reason = 'No port supplied.' } }

    if ($ReservedPorts -contains $Port) {
        return @{ Port = 0; Source = 'none'; Reason = "Port $Port is reserved for another CRON application (see CRON_APP_PORT_REGISTRY.md). Refusing to use it." }
    }

    $status = Get-DevPortStatus -Port $Port -RepoRoot $RepoRoot -Probe $Probe
    if ($status -eq 'unrelated') {
        $ownerFn = [scriptblock]$Probe.GetPortOwner
        $ownerPid = & $ownerFn $Port
        return @{ Port = 0; Source = 'none'; Reason = "$Source port $Port is in use by another application (PID $ownerPid). Refusing to use or touch it." }
    }
    return @{ Port = $Port; Source = $Source; Reason = '' }
}

# Port precedence: -Port > CRON_CODE_DEV_PORT env > persisted (only if approved) > default 5190.
# Returns @{ Port; Source; Reason }. Port = 0 means selection failed (fail safely).
function Select-DevPort {
    param(
        [int]$ExplicitPort = 0,
        [int]$EnvironmentPort = 0,
        [int]$DefaultPort = $script:DevDefaultPort,
        [int[]]$ApprovedPorts = $script:DevApprovedPorts,
        [int[]]$ReservedPorts = $script:DevReservedPorts,
        [int]$PersistedPort = 0,
        [string]$RepoRoot,
        [hashtable]$Probe
    )

    if ($ExplicitPort -gt 0) {
        return (Resolve-DevPortChoice -Port $ExplicitPort -Source 'explicit' -ReservedPorts $ReservedPorts -RepoRoot $RepoRoot -Probe $Probe)
    }
    if ($EnvironmentPort -gt 0) {
        return (Resolve-DevPortChoice -Port $EnvironmentPort -Source 'environment' -ReservedPorts $ReservedPorts -RepoRoot $RepoRoot -Probe $Probe)
    }
    if ($PersistedPort -gt 0 -and $ApprovedPorts -contains $PersistedPort) {
        $persistedChoice = Resolve-DevPortChoice -Port $PersistedPort -Source 'persisted' -ReservedPorts $ReservedPorts -RepoRoot $RepoRoot -Probe $Probe
        if ($persistedChoice.Port -gt 0) { return $persistedChoice }
    }
    $defaultChoice = Resolve-DevPortChoice -Port $DefaultPort -Source 'default' -ReservedPorts $ReservedPorts -RepoRoot $RepoRoot -Probe $Probe
    if ($defaultChoice.Port -gt 0) { return $defaultChoice }
    return @{ Port = 0; Source = 'none'; Reason = "Port $DefaultPort (the CRON for Code assigned port) is unavailable ($($defaultChoice.Reason)) and no fallback scan is permitted. See CRON_APP_PORT_REGISTRY.md." }
}

# Resets a persisted port that is not approved for CRON for Code (foreign/reserved/unassigned).
# Returns @{ State; Repaired }.
function Repair-DevStatePort {
    param(
        [hashtable]$State,
        [int[]]$ApprovedPorts = $script:DevApprovedPorts,
        [int]$DefaultPort = $script:DevDefaultPort
    )
    if ($State.port -gt 0 -and -not ($ApprovedPorts -contains $State.port)) {
        $State.port = $DefaultPort
        return @{ State = $State; Repaired = $true }
    }
    return @{ State = $State; Repaired = $false }
}

# Lifecycle decision from discovered runtime state.
# Runtime: @{ VitePid; ElectronMainPid; DevPid; Health }
# Health: 'healthy' | 'stale' | 'broken' | 'starting' | 'none' (defaults to 'healthy' for backward compat).
# Returns @{ Action; VitePid; ElectronMainPid; DevPid; Health }
# Actions: 'surface-running' | 'reuse-vite' | 'replace-stale-electron' | 'fresh-start'
function Resolve-DevAction {
    param([hashtable]$Runtime)

    $vite = if ($Runtime.VitePid) { [int]$Runtime.VitePid } else { 0 }
    $electron = if ($Runtime.ElectronMainPid) { [int]$Runtime.ElectronMainPid } else { 0 }
    $dev = if ($Runtime.DevPid) { [int]$Runtime.DevPid } else { 0 }
    $health = if ($Runtime.ContainsKey('Health') -and $Runtime.Health) { [string]$Runtime.Health } else { 'healthy' }

    # A stale/broken owned Electron must be replaced even when Vite is alive and
    # the window exists: a running window with an outdated main process is not
    # a healthy dev stack.
    if ($electron -gt 0 -and ($health -eq 'stale' -or $health -eq 'broken')) {
        return @{ Action = 'replace-stale-electron'; VitePid = $vite; ElectronMainPid = $electron; DevPid = $dev; Health = $health }
    }
    if ($vite -gt 0 -and $electron -gt 0) {
        return @{ Action = 'surface-running'; VitePid = $vite; ElectronMainPid = $electron; DevPid = $dev; Health = $health }
    }
    if ($vite -gt 0) {
        return @{ Action = 'reuse-vite'; VitePid = $vite; ElectronMainPid = 0; DevPid = $dev; Health = $health }
    }
    if ($electron -gt 0) {
        return @{ Action = 'replace-stale-electron'; VitePid = 0; ElectronMainPid = $electron; DevPid = $dev; Health = $health }
    }
    return @{ Action = 'fresh-start'; VitePid = 0; ElectronMainPid = 0; DevPid = 0; Health = 'none' }
}

# Reads the dev main-process runtime marker written by main.mjs.
# Returns a hashtable; a missing/corrupt marker yields exists=$false.
function Read-DevMainMarker {
    param([string]$Path)

    $empty = @{
        exists = $false
        pid = 0
        mainHash = ''
        preloadHash = ''
        registeredIpcChannels = @()
        requiredChannels = @()
        rendererReady = $false
        windowReady = $false
        startupTimestamp = 0
        registrationError = ''
        appVersion = ''
        lastStartupError = ''
    }
    if (-not (Test-Path -LiteralPath $Path)) { return $empty }
    try {
        $json = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
        $obj = $json | ConvertFrom-Json -ErrorAction Stop

        # StrictMode-safe property reads (the marker may be missing fields when it
        # was written by an earlier main build).
        $readProp = {
            param([string]$name)
            $prop = $obj.PSObject.Properties[$name]
            if ($null -ne $prop) { return $prop.Value }
            return $null
        }
        $channels = @()
        $channelValue = & $readProp 'registeredIpcChannels'
        if ($channelValue) { $channels = @($channelValue) }
        $required = @()
        $requiredValue = & $readProp 'requiredChannels'
        if ($requiredValue) { $required = @($requiredValue) }

        $pidValue = & $readProp 'pid'
        $mainHashValue = & $readProp 'mainHash'
        $preloadHashValue = & $readProp 'preloadHash'
        $rendererReadyValue = & $readProp 'rendererReady'
        $windowReadyValue = & $readProp 'windowReady'
        $startupValue = & $readProp 'startupTimestamp'
        $registrationErrorValue = & $readProp 'registrationError'
        $appVersionValue = & $readProp 'appVersion'
        $lastStartupErrorValue = & $readProp 'lastStartupError'

        return @{
            exists = $true
            pid = if ($pidValue) { [int]$pidValue } else { 0 }
            mainHash = if ($mainHashValue) { [string]$mainHashValue } else { '' }
            preloadHash = if ($preloadHashValue) { [string]$preloadHashValue } else { '' }
            registeredIpcChannels = $channels
            requiredChannels = $required
            rendererReady = [bool]$rendererReadyValue
            windowReady = [bool]$windowReadyValue
            startupTimestamp = if ($startupValue) { [long]$startupValue } else { 0 }
            registrationError = if ($registrationErrorValue) { [string]$registrationErrorValue } else { '' }
            appVersion = if ($appVersionValue) { [string]$appVersionValue } else { '' }
            lastStartupError = if ($lastStartupErrorValue) { [string]$lastStartupErrorValue } else { '' }
        }
    }
    catch {
        return $empty
    }
}

# Classifies an owned dev Electron main process against the runtime marker and the
# CURRENT source hashes. Returns 'healthy' | 'stale' | 'broken' | 'starting' | 'none'.
#   stale   - marker missing, pid mismatch, or source hashes differ (main/preload changed)
#   broken  - marker present and current, but required IPC channels are missing
#   starting- marker current + channels complete, renderer has not signalled ready yet
#   healthy - fully current and renderer-ready
function Resolve-DevElectronHealth {
    param(
        [int]$ElectronPid,
        [hashtable]$Marker,
        [string]$CurrentMainHash,
        [string]$CurrentPreloadHash,
        [string[]]$RequiredChannels = $script:DevRequiredIpcChannels
    )

    if ($ElectronPid -le 0) { return 'none' }
    if (-not $Marker.exists) { return 'stale' }
    if ([int]$Marker.pid -ne $ElectronPid) { return 'stale' }
    if ($CurrentMainHash -and $Marker.mainHash -and $Marker.mainHash -ne $CurrentMainHash) { return 'stale' }
    if ($CurrentPreloadHash -and $Marker.preloadHash -and $Marker.preloadHash -ne $CurrentPreloadHash) { return 'stale' }
    foreach ($channel in $RequiredChannels) {
        if ($Marker.registeredIpcChannels -notcontains $channel) { return 'broken' }
    }
    if ($Marker.ContainsKey('lastStartupError') -and $Marker.lastStartupError) { return 'broken' }
    if (-not $Marker.rendererReady) { return 'starting' }
    return 'healthy'
}

# True when the marker proves the dev main is current, complete and renderer-ready.
function Test-DevMainMarkerReady {
    param(
        [hashtable]$Marker,
        [int]$ElectronPid,
        [string]$CurrentMainHash,
        [string]$CurrentPreloadHash,
        [string[]]$RequiredChannels = $script:DevRequiredIpcChannels
    )
    $health = Resolve-DevElectronHealth -ElectronPid $ElectronPid -Marker $Marker `
        -CurrentMainHash $CurrentMainHash -CurrentPreloadHash $CurrentPreloadHash `
        -RequiredChannels $RequiredChannels
    return ($health -eq 'healthy')
}

# Computes the missing required channels in a marker (used for visible diagnostics).
function Get-DevMissingIpcChannels {
    param(
        [hashtable]$Marker,
        [string[]]$RequiredChannels = $script:DevRequiredIpcChannels
    )
    if (-not $Marker.exists) { return @($RequiredChannels) }
    $missing = @()
    foreach ($channel in $RequiredChannels) {
        if ($Marker.registeredIpcChannels -notcontains $channel) { $missing += $channel }
    }
    return $missing
}

# True when the in-app restart intent file is present and fresh (within MaxAgeSeconds).
function Test-DevRestartRequested {
    param(
        [string]$Path,
        [int]$MaxAgeSeconds = $script:DevRestartIntentMaxAgeSeconds
    )
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    try {
        $json = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
        $obj = $json | ConvertFrom-Json -ErrorAction Stop
        $requestedAt = if ($obj.requestedAt) { [long]$obj.requestedAt } else { 0 }
        if ($requestedAt -le 0) { return $false }
        $ageSeconds = [long](([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $requestedAt) / 1000)
        return $ageSeconds -le $MaxAgeSeconds
    }
    catch {
        return $false
    }
}

# Removes the restart intent file (consumed after the launcher acts on it).
function Clear-DevRestartRequested {
    param([string]$Path)
    try {
        if (Test-Path -LiteralPath $Path) {
            Remove-Item -LiteralPath $Path -Force -ErrorAction Stop
        }
    }
    catch { }
}

# Drops stale or non-owned PIDs from the persisted state (stale PID/lock recovery).
# Returns a clean hashtable with only verified-live-and-owned pids.
function Resolve-DevState {
    param(
        [hashtable]$State,
        [hashtable]$Probe
    )

    $clean = @{ port = 0; devPid = 0; vitePid = 0; electronPid = 0 }
    if ($State.port) { $clean.port = [int]$State.port }

    foreach ($key in @('devPid', 'vitePid', 'electronPid')) {
        $value = if ($State[$key]) { [int]$State[$key] } else { 0 }
        if ($value -gt 0) {
            $aliveFn = [scriptblock]$Probe.IsAlive
            $ownedFn = [scriptblock]$Probe.IsOwned
            if ((& $aliveFn $value) -and (& $ownedFn $value)) {
                $clean[$key] = $value
            }
        }
    }
    return $clean
}

function Read-DevState {
    param([string]$Path)

    $empty = @{ port = 0; devPid = 0; vitePid = 0; electronPid = 0 }
    if (-not (Test-Path -LiteralPath $Path)) { return $empty }
    try {
        $json = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
        $obj = $json | ConvertFrom-Json -ErrorAction Stop
        return @{
            port = if ($obj.port) { [int]$obj.port } else { 0 }
            devPid = if ($obj.devPid) { [int]$obj.devPid } else { 0 }
            vitePid = if ($obj.vitePid) { [int]$obj.vitePid } else { 0 }
            electronPid = if ($obj.electronPid) { [int]$obj.electronPid } else { 0 }
        }
    }
    catch {
        # Corrupt or unreadable state is treated as empty so it self-repairs on next launch.
        return $empty
    }
}

function Write-DevState {
    param(
        [string]$Path,
        [hashtable]$State
    )

    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $json = $State | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($Path, $json, (New-Object System.Text.UTF8Encoding($false)))
}
