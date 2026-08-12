# CRON for Code - set System.AppUserModel.ID on a shortcut (.lnk) by writing the
# PropertyStoreDataBlock (MS-SHLLINK extra-data signature 0xA0000001) directly.
# The shell's IPropertyStore refuses SetValue on .lnk files, so this is the
# documented serialized-property-storage layout, appended after the string data.
# Grouping fix: Windows groups the running window (AUMID com.cron.code.dev set by
# main.mjs) under the pinned shortcut ONLY when the shortcut carries the same ID.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ShortcutPath,
    [string]$AppUserModelId = 'com.cron.code.dev'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ShortcutPath)) {
    throw "Shortcut not found: $ShortcutPath"
}

$bytes = [System.IO.File]::ReadAllBytes($ShortcutPath)

function Read-UInt32([byte[]]$b, [int]$offset) {
    return [System.BitConverter]::ToUInt32($b, $offset)
}
function Read-UInt16([byte[]]$b, [int]$offset) {
    return [System.BitConverter]::ToUInt16($b, $offset)
}

# --- Parse the .lnk to locate the ExtraData section (MS-SHLLINK) ---
if ($bytes.Length -lt 76) { throw 'Shortcut file is too small to be a valid .lnk' }

$linkFlags = Read-UInt32 $bytes 20
$hasIdList = ($linkFlags -band 0x1) -ne 0
$hasLinkInfo = ($linkFlags -band 0x2) -ne 0
$hasName = ($linkFlags -band 0x4) -ne 0
$hasRelativePath = ($linkFlags -band 0x8) -ne 0
$hasWorkingDir = ($linkFlags -band 0x10) -ne 0
$hasArguments = ($linkFlags -band 0x20) -ne 0
$hasIconLocation = ($linkFlags -band 0x40) -ne 0
$isUnicode = ($linkFlags -band 0x80) -ne 0

$pos = 76

if ($hasIdList) {
    if ($pos + 2 -gt $bytes.Length) { throw 'Truncated ID list' }
    $idListSize = Read-UInt16 $bytes $pos
    $pos += 2 + $idListSize
}

if ($hasLinkInfo) {
    if ($pos + 4 -gt $bytes.Length) { throw 'Truncated link info' }
    $linkInfoSize = Read-UInt32 $bytes $pos
    if ($linkInfoSize -lt 4) { throw 'Invalid link info size' }
    $pos += $linkInfoSize
}

# Skip string data (WScript.Shell writes Unicode strings).
foreach ($flag in @(@($hasName, 0x4), @($hasRelativePath, 0x8), @($hasWorkingDir, 0x10), @($hasArguments, 0x20), @($hasIconLocation, 0x40))) {
    if (-not $flag[0]) { continue }
    if ($pos + 2 -gt $bytes.Length) { throw 'Truncated string data' }
    $charCount = Read-UInt16 $bytes $pos
    $bytesForChars = $charCount * ($(if ($isUnicode) { 2 } else { 1 }))
    $pos += 2 + $bytesForChars
}

# Walk existing extra-data blocks to their terminator.
while ($true) {
    if ($pos + 4 -gt $bytes.Length) { throw 'Shortcut has no extra-data terminator' }
    $blockSize = Read-UInt32 $bytes $pos
    if ($blockSize -eq 0) { break }
    $pos += $blockSize
}

# --- Build the PropertyStoreDataBlock (AppUserModelID, VT_LPWSTR) ---
$fmtid = [System.Guid]::Parse('9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3')
$guidBytes = $fmtid.ToByteArray()
$propertyId = [uint32]5
$vt = [uint32]31

$wideChars = [System.Text.Encoding]::Unicode.GetBytes($AppUserModelId + [char]0)
$charCount = $wideChars.Length / 2
$valueSize = 2 + $wideChars.Length
$pad = (4 - ($valueSize % 4)) % 4

$entry = [System.Collections.Generic.List[byte]]::new()
$entry.AddRange([System.BitConverter]::GetBytes([uint32](20 + $valueSize + $pad)))  # entry cbSize
$entry.AddRange([System.BitConverter]::GetBytes([uint32]1))                            # reserved
$entry.AddRange([System.BitConverter]::GetBytes($propertyId))
$entry.AddRange([System.BitConverter]::GetBytes($vt))
$entry.AddRange([System.BitConverter]::GetBytes([uint32]20))                           # valueOffset
$entry.AddRange([System.BitConverter]::GetBytes([uint16]$charCount))                   # wCount (incl NUL)
$entry.AddRange($wideChars)
$entry.AddRange((New-Object byte[] $pad))

$header = [System.Collections.Generic.List[byte]]::new()
$header.AddRange([System.BitConverter]::GetBytes([uint16]1))   # wVersion
$header.AddRange([System.BitConverter]::GetBytes([uint16]1))   # wFormatID
$header.AddRange($guidBytes)                                    # fmtid
$headerSize = 24 + $entry.Count
$header.AddRange([System.BitConverter]::GetBytes([uint32]$headerSize))  # cbSize (header + entries)
$header.AddRange([System.BitConverter]::GetBytes([uint32]1))    # version

$block = [System.Collections.Generic.List[byte]]::new()
$block.AddRange($header)
$block.AddRange($entry)

$extra = [System.Collections.Generic.List[byte]]::new()
$extra.AddRange([System.BitConverter]::GetBytes([uint32](8 + $block.Count)))  # blockSize
$extra.AddRange([System.BitConverter]::GetBytes([Convert]::ToUInt32('A0000001', 16)))  # signature
$extra.AddRange($block)

# --- Append the block and the 0x00000000 terminator ---
$output = New-Object byte[] ($pos + $extra.Count + 4)
[System.Array]::Copy($bytes, 0, $output, 0, $pos)
$extraBytes = $extra.ToArray()
[System.Array]::Copy($extraBytes, 0, $output, $pos, $extraBytes.Length)
# terminator already zeroed

[System.IO.File]::WriteAllBytes($ShortcutPath, $output)
Write-Output "Wrote AppUserModelID block ($($extra.Count + 4) bytes) into: $ShortcutPath"
