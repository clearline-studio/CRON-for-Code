# Tests serialized-property-storage layout variants against the shell's .lnk
# property store: writes each variant into a COPY of the shortcut and reads it
# back with IPropertyStore::GetValue until one round-trips the AppUserModelID.
[CmdletBinding()]
param([string]$SourceShortcut, [string]$ProbeDir)

$ErrorActionPreference = 'Stop'

$sourceBytes = [System.IO.File]::ReadAllBytes($SourceShortcut)

$interop = @'
using System;
using System.Runtime.InteropServices;
public static class LinkPropProbe {
  [StructLayout(LayoutKind.Sequential, Pack = 4)] public struct PROPERTYKEY { public Guid fmtid; public uint pid; }
  [StructLayout(LayoutKind.Explicit)] public struct PROPVARIANT { [FieldOffset(0)] public ushort vt; [FieldOffset(8)] public IntPtr pwszVal; }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)] private static extern int SHGetPropertyStoreFromParsingName([MarshalAs(UnmanagedType.LPWStr)] string pszPath, IntPtr pbc, uint flags, ref Guid riid, out IntPtr ppv);
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  private interface IPropertyStore { [PreserveSig] int GetCount(out uint c); [PreserveSig] int GetAt(uint i, out PROPERTYKEY k); [PreserveSig] int GetValue(ref PROPERTYKEY k, out PROPVARIANT v); [PreserveSig] int SetValue(ref PROPERTYKEY k, ref PROPVARIANT v); [PreserveSig] int Commit(); }
  public static string Get(string path) {
    Guid iid = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");
    IntPtr p; int hr = SHGetPropertyStoreFromParsingName(path, IntPtr.Zero, 0, ref iid, out p);
    if (hr != 0) return "ERR-" + hr.ToString("X8");
    try { IPropertyStore s = (IPropertyStore)Marshal.GetObjectForIUnknown(p);
      PROPERTYKEY k = new PROPERTYKEY(); k.fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"); k.pid = 5;
      PROPVARIANT v; hr = s.GetValue(ref k, out v);
      if (hr == 1) return "S_FALSE";
      if (hr != 0) return "ERR-" + hr.ToString("X8");
      if (v.vt == 31 && v.pwszVal != IntPtr.Zero) return Marshal.PtrToStringUni(v.pwszVal);
      return "VT" + v.vt;
    } finally { Marshal.Release(p); }
  }
}
'@
Add-Type -TypeDefinition $interop -ErrorAction Stop

function Read-UInt16([byte[]]$b, [int]$o) { return [System.BitConverter]::ToUInt16($b, $o) }
function Read-UInt32([byte[]]$b, [int]$o) { return [System.BitConverter]::ToUInt32($b, $o) }

function Build-Block([int]$wFormatId, [int]$headerVersion, [int]$valueOffsetBase, [int]$trailingPad) {
    $fmtid = [System.Guid]::Parse('9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3')
    $guidBytes = $fmtid.ToByteArray()
    $wideChars = [System.Text.Encoding]::Unicode.GetBytes('com.cron.code.dev' + [char]0)
    $charCount = $wideChars.Length / 2
    $valueSize = 2 + $wideChars.Length
    $pad = (4 - ($valueSize % 4)) % 4
    $entry = [System.Collections.Generic.List[byte]]::new()
    $entry.AddRange([System.BitConverter]::GetBytes([uint32](20 + $valueSize + $pad)))
    $entry.AddRange([System.BitConverter]::GetBytes([uint32]1))
    $entry.AddRange([System.BitConverter]::GetBytes([uint32]5))
    $entry.AddRange([System.BitConverter]::GetBytes([uint32]31))
    $entry.AddRange([System.BitConverter]::GetBytes([uint32]$valueOffsetBase))
    $entry.AddRange([System.BitConverter]::GetBytes([uint16]$charCount))
    $entry.AddRange($wideChars)
    $entry.AddRange((New-Object byte[] $pad))
    if ($trailingPad -gt 0) { $entry.AddRange((New-Object byte[] $trailingPad)) }
    $header = [System.Collections.Generic.List[byte]]::new()
    $header.AddRange([System.BitConverter]::GetBytes([uint16]1))
    $header.AddRange([System.BitConverter]::GetBytes([uint16]$wFormatId))
    $header.AddRange($guidBytes)
    $header.AddRange([System.BitConverter]::GetBytes([uint32](24 + $entry.Count)))
    $header.AddRange([System.BitConverter]::GetBytes([uint32]$headerVersion))
    $block = [System.Collections.Generic.List[byte]]::new()
    $block.AddRange($header)
    $block.AddRange($entry)
    return $block
}

function Append-Block([byte[]]$lnkBytes, [System.Collections.Generic.List[byte]]$block) {
    $pos = 76
    $linkFlags = Read-UInt32 $lnkBytes 20
    if (($linkFlags -band 0x1) -ne 0) { $pos += 2 + (Read-UInt16 $lnkBytes $pos) }
    if (($linkFlags -band 0x2) -ne 0) { $pos += Read-UInt32 $lnkBytes $pos }
    foreach ($flag in 0x4, 0x8, 0x10, 0x20, 0x40) {
        if (($linkFlags -band $flag) -eq 0) { continue }
        $cc = Read-UInt16 $lnkBytes $pos
        $pos += 2 + $cc * $(if (($linkFlags -band 0x80) -ne 0) { 2 } else { 1 })
    }
    while ($true) {
        $sz = Read-UInt32 $lnkBytes $pos
        if ($sz -eq 0) { break }
        $pos += $sz
    }
    $extra = [System.Collections.Generic.List[byte]]::new()
    $extra.AddRange([System.BitConverter]::GetBytes([uint32](8 + $block.Count)))
    $extra.AddRange([System.BitConverter]::GetBytes([Convert]::ToUInt32('A0000001', 16)))
    $extra.AddRange($block)
    $out = New-Object byte[] ($pos + $extra.Count + 4)
    [System.Array]::Copy($lnkBytes, 0, $out, 0, $pos)
    $eb = $extra.ToArray()
    [System.Array]::Copy($eb, 0, $out, $pos, $eb.Length)
    return $out
}

$variants = @(
    @{ wFormatId = 1; headerVersion = 1; valueOffsetBase = 20; trailingPad = 0 },
    @{ wFormatId = 0; headerVersion = 1; valueOffsetBase = 20; trailingPad = 0 },
    @{ wFormatId = 1; headerVersion = 2; valueOffsetBase = 20; trailingPad = 0 },
    @{ wFormatId = 1; headerVersion = 1; valueOffsetBase = 48; trailingPad = 0 },
    @{ wFormatId = 1; headerVersion = 1; valueOffsetBase = 20; trailingPad = 4 }
)

$i = 0
foreach ($v in $variants) {
    $i++
    $block = Build-Block -wFormatId $v.wFormatId -headerVersion $v.headerVersion -valueOffsetBase $v.valueOffsetBase -trailingPad $v.trailingPad
    $bytes = Append-Block -lnkBytes $sourceBytes -block $block
    $copy = Join-Path $ProbeDir "probe$i.lnk"
    [System.IO.File]::WriteAllBytes($copy, $bytes)
    $result = [LinkPropProbe]::Get($copy)
    Write-Output "variant $i (fmt=$($v.wFormatId) ver=$($v.headerVersion) voff=$($v.valueOffsetBase) pad=$($v.trailingPad)) -> $result"
}
