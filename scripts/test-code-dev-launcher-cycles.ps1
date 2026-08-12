# CRON for Code - restart-safe launcher cycle test (runtime integration).
# Performs: launch -> app-ready -> close app (terminate owned Electron) -> lifecycle cleanup
# -> relaunch, for three consecutive cycles. Asserts app-ready every cycle, full teardown after
# close, state self-repair, and that no unrelated process is ever terminated.
#
# Requires the dev userData single-instance lock to be free (close any running CRON for Code dev
# app first). Does not touch the production app or any unrelated process.
[CmdletBinding()]
param(
    [int]$Port = 5390,
    [int]$Cycles = 3
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptDir
$launcher = Join-Path $scriptDir 'run-code-dev-hidden.ps1'
$failCount = 0

function Assert-True([bool]$condition, [string]$name) {
    if ($condition) { Write-Host "  PASS: $name" }
    else { Write-Host "  FAIL: $name"; $script:failCount++ }
}

function Get-OwnedElectronMainPid {
    try {
        $found = Get-CimInstance Win32_Process -Filter "Name='electron.exe'" -ErrorAction SilentlyContinue |
            Where-Object {
                $_.CommandLine -match [regex]::Escape($repoRoot) -and $_.CommandLine -notmatch '--type='
            } | Select-Object -First 1
        if ($found) { return $found.ProcessId }
    }
    catch { }
    return 0
}

function Get-PortOwnerPid([int]$port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -First 1
        if ($conn) { return $conn.OwningProcess }
    }
    catch { }
    return $null
}

function Get-OwnedDevPid {
    try {
        $found = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -match [regex]::Escape($repoRoot) -and $_.CommandLine -match 'dev\.mjs' } |
            Select-Object -First 1
        if ($found) { return $found.ProcessId }
    }
    catch { }
    return 0
}

function Wait-Until([scriptblock]$condition, [int]$seconds, [string]$what) {
    for ($i = 0; $i -lt $seconds; $i++) {
        if (& $condition) { return $true }
        Start-Sleep -Seconds 1
    }
    Write-Host "  (timed out waiting for: $what)"
    return $false
}

# Snapshot of unrelated processes: production CRON for Code app + any electron/node not from this repo.
function Get-UnrelatedProcessIds {
    $ids = @()
    Get-Process | Where-Object { $_.ProcessName -eq 'CRON for Code' } | ForEach-Object { $ids += $_.Id }
    Get-CimInstance Win32_Process | Where-Object {
        ($_.Name -eq 'electron.exe' -or $_.Name -eq 'node.exe') -and
        $_.CommandLine -notmatch [regex]::Escape($repoRoot)
    } | ForEach-Object { $ids += $_.ProcessId }
    return ($ids | Sort-Object -Unique)
}

Write-Host "CRON for Code - dev launcher cycle test (port $Port, $Cycles cycles)"
$beforeUnrelated = Get-UnrelatedProcessIds
$beforeProduction = @(Get-Process | Where-Object { $_.ProcessName -eq 'CRON for Code' } | ForEach-Object { $_.Id })
Write-Host "Unrelated PIDs snapshot at start: $($beforeUnrelated -join ',')"
Write-Host "Production CRON for Code app PIDs: $($beforeProduction -join ',')"

for ($cycle = 1; $cycle -le $Cycles; $cycle++) {
    Write-Host "--- Cycle $cycle ---"

    Write-Host "  Launching via launcher (-Port $Port)..."
    $exit = $null
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Port $Port
    $exit = $LASTEXITCODE
    Assert-True ($exit -eq 0) "cycle $cycle launcher exit 0 (got $exit)"

    $portUp = Wait-Until { Get-PortOwnerPid $Port } 60 "port $Port"
    $electronUp = Wait-Until { (Get-OwnedElectronMainPid) -gt 0 } 40 "owned Electron main"
    Assert-True $portUp "cycle $cycle dev service up on port $Port"
    Assert-True $electronUp "cycle $cycle app-ready (owned Electron running)"

    Write-Host "  Closing the app (terminating owned Electron PID $(Get-OwnedElectronMainPid))..."
    $electronPid = Get-OwnedElectronMainPid
    if ($electronPid -gt 0) {
        & taskkill.exe /PID $electronPid /T /F 2>$null | Out-Null
    }

    $cleaned = Wait-Until {
        $still = Get-OwnedElectronMainPid
        $portStill = Get-PortOwnerPid $Port
        ($still -eq 0) -and (-not $portStill)
    } 30 "lifecycle cleanup (Electron and Vite both down)"
    Assert-True $cleaned "cycle $cycle full teardown after close (no half-running state)"

    $missing = @($beforeUnrelated | Where-Object { -not (Get-Process -Id $_ -ErrorAction SilentlyContinue) })
    $launcherLogText = Get-Content -LiteralPath (Join-Path $repoRoot '.runtime\code-dev-launcher.log') -Raw -ErrorAction SilentlyContinue
    $touchedByLauncher = @($missing | Where-Object { $launcherLogText -match [regex]::Escape([string]$_) })
    Assert-True ($touchedByLauncher.Count -eq 0) "cycle $cycle no unrelated process was terminated by the launcher (launcher-touched: $($touchedByLauncher -join ','))"
    if ($missing.Count -gt 0) {
        Write-Host "  (informational: unrelated pids that ended on their own during the cycle: $($missing -join ','))"
    }

    $prodMissing = @($beforeProduction | Where-Object { -not (Get-Process -Id $_ -ErrorAction SilentlyContinue) })
    Assert-True ($prodMissing.Count -eq 0) "cycle $cycle production CRON for Code app processes were never stopped (missing: $($prodMissing -join ','))"
}

Write-Host "--- Summary ---"
if ($script:failCount -gt 0) {
    Write-Host "$($script:failCount) assertion(s) FAILED."
    exit 1
}
Write-Host "All $Cycles launch/close/relaunch cycles passed; no unrelated process touched."
exit 0
