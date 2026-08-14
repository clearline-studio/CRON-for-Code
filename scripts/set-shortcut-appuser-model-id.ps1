# CRON for Code - set System.AppUserModel.ID on a shortcut (.lnk) by writing the
# PropertyStoreDataBlock (MS-SHLLINK extra-data signature 0xA0000007) directly.
#
# NOTE (2026-08-13, verified on this Windows 11 build): this property-store
# approach is NOT what groups classic-exe taskbar buttons on this OS. Windows
# writes an icon-path blob into pinned shortcuts instead of an AppUserModelID
# property, and IPropertyStore refuses SetValue (0x80030005) on .lnk files, and
# the shell does not round-trip AppUserModelID from written blocks. The working
# fix for CRON for Code is the direct electron.exe shortcut target
# (see create-code-dev-shortcut.ps1) + implicit AUMID in main.mjs.
# This script remains as the CORRECT layout (verified against the LECmd parser,
# which mirrors MS-SHLLINK/MS-PROPSTORE) for systems where the property store
# IS honoured.
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

function Read-UInt16([byte[]]$b, [int]$offset) {
    return [System.BitConverter]::ToUInt16($b, $offset)
}
function Read-UInt32([byte[]]$b, [int]$offset) {
    return [System.BitConverter]::ToUInt32($b, $offset)
}

# --- Parse the .lnk to locate the ExtraData section (MS-SHLLINK) ---
if ($bytes.Length -lt 76) { throw 'Shortcut file is too small to be a valid .lnk' }

$linkFlags = Read-UInt32 $bytes 20

$pos = 76
if (($linkFlags -band 0x1) -ne 0) {
    if ($pos + 2 -gt $bytes.Length) { throw 'Truncated ID list' }
    $pos += 2 + (Read-UInt16 $bytes $pos)
}
if (($linkFlags -band 0x2) -ne 0) {
    if ($pos + 4 -gt $bytes.Length) { throw 'Truncated link info' }
    $linkInfoSize = Read-UInt32 $bytes $pos
    if ($linkInfoSize -lt 4) { throw 'Invalid link info size' }
    $pos += $linkInfoSize
}
foreach ($flag in 0x4, 0x8, 0x10, 0x20, 0x40) {
    if (($linkFlags -band $flag) -eq 0) { continue }
    if ($pos + 2 -gt $bytes.Length) { throw 'Truncated string data' }
    $charCount = Read-UInt16 $bytes $pos
    $bytesForChars = $charCount * $(if (($linkFlags -band 0x80) -ne 0) { 2 } else { 1 })
    $pos += 2 + $bytesForChars
}
while ($true) {
    if ($pos + 4 -gt $bytes.Length) { throw 'Shortcut has no extra-data terminator' }
    $blockSize = Read-UInt32 $bytes $pos
    if ($blockSize -eq 0) { break }
    $pos += $blockSize
}

# --- Build the numeric (PKEY) serialized property storage ---
# Verified layout (LECmd/ExtensionBlocks parser, MS-SHLLINK 2.4.4 + MS-PROPSTORE):
#   storage   : [DWORD sheetSize][sheet]
#   sheet     : [DWORD sheetSize]["1SPS"][fmtid GUID][value][DWORD 0 terminator]
#   value     : [DWORD valueSize][DWORD pid][BYTE reserved][WORD vt][WORD pad]
#               [DWORD charCount incl NUL][UTF-16LE string]
$fmtid = [System.Guid]::Parse('9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3')
$fmtidBytes = $fmtid.ToByteArray()
$wideChars = [System.Text.Encoding]::Unicode.GetBytes($AppUserModelId + [char]0)
$charCount = $wideChars.Length / 2

$val = [System.Collections.Generic.List[byte]]::new()
$val.AddRange([System.BitConverter]::GetBytes([uint32](17 + $wideChars.Length)))  # valueSize incl. itself
$val.AddRange([System.BitConverter]::GetBytes([uint32]5))                          # pid
$val.Add([byte]0)                                                                  # reserved
$val.AddRange([System.BitConverter]::GetBytes([uint16]0x001F))                      # vt = VT_LPWSTR
$val.AddRange([System.BitConverter]::GetBytes([uint16]0))                           # padding
$val.AddRange([System.BitConverter]::GetBytes([uint32]$charCount))                  # chars incl NUL
$val.AddRange($wideChars)                                                           # UTF-16LE + NUL

$spsVersion = [byte[]](0x31, 0x53, 0x50, 0x53)                                      # "1SPS"
$sheet = [System.Collections.Generic.List[byte]]::new()
$sheet.AddRange([System.BitConverter]::GetBytes([uint32](4 + 4 + 16 + $val.Count + 4)))  # sheetSize incl. itself
$sheet.AddRange($spsVersion)
$sheet.AddRange($fmtidBytes)
$sheet.AddRange($val)
$sheet.AddRange([System.BitConverter]::GetBytes([uint32]0))                              # terminator

$storage = [System.Collections.Generic.List[byte]]::new()
$storage.AddRange([System.BitConverter]::GetBytes([uint32]$sheet.Count))
$storage.AddRange($sheet)

$block = [System.Collections.Generic.List[byte]]::new()
$block.AddRange([System.BitConverter]::GetBytes([uint32](8 + $storage.Count)))
$block.AddRange([System.BitConverter]::GetBytes([Convert]::ToUInt32('A0000007', 16)))   # PropertyStoreDataBlock
$block.AddRange($storage)

$output = New-Object byte[] ($pos + $block.Count + 4)
[System.Array]::Copy($bytes, 0, $output, 0, $pos)
$blockBytes = $block.ToArray()
[System.Array]::Copy($blockBytes, 0, $output, $pos, $blockBytes.Length)

[System.IO.File]::WriteAllBytes($ShortcutPath, $output)
Write-Output "Wrote AppUserModelID block ($($block.Count + 4) bytes) into: $ShortcutPath"
