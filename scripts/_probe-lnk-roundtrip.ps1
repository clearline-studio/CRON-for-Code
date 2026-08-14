# CC diagnostic: verify the LECmd-derived serialized-property-storage layout for
# .lnk AppUserModelID round-trips through the shell's own IPropertyStore.
[CmdletBinding()]
param([string]$SourceShortcut, [string]$ProbeDir)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LnkRoundTrip2 {
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
      if (v.vt == 31 && v.pwszVal != IntPtr.Zero) return "OK:" + Marshal.PtrToStringUni(v.pwszVal);
      return "VT" + v.vt;
    } finally { Marshal.Release(p); }
  }
}
'@ -ErrorAction Stop

function Read-UInt16([byte[]]$b, [int]$o) { return [System.BitConverter]::ToUInt16($b, $o) }
function Read-UInt32([byte[]]$b, [int]$o) { return [System.BitConverter]::ToUInt32($b, $o) }

$fmtid = [System.Guid]::Parse('9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3')
$fmtidBytes = $fmtid.ToByteArray()
$value = 'com.cron.code.dev'
$wideChars = [System.Text.Encoding]::Unicode.GetBytes($value + [char]0)
$charCount = $wideChars.Length / 2

# --- Build the numeric (PKEY) sheet value ---
$val = [System.Collections.Generic.List[byte]]::new()
$val.AddRange([System.BitConverter]::GetBytes([uint32](17 + $wideChars.Length)))  # valueSize incl. itself
$val.AddRange([System.BitConverter]::GetBytes([uint32]5))                          # pid
$val.Add([byte]0)                                                                  # reserved
$val.AddRange([System.BitConverter]::GetBytes([uint16]0x001F))                     # vt = VT_LPWSTR
$val.AddRange([System.BitConverter]::GetBytes([uint16]0))                          # padding
$val.AddRange([System.BitConverter]::GetBytes([uint32]$charCount))                 # chars incl NUL
$val.AddRange($wideChars)                                                          # UTF-16LE + NUL

# --- Build the sheet: size + "1SPS" + fmtid + value + terminator ---
$sheet = [System.Collections.Generic.List[byte]]::new()
$sheet.AddRange([System.BitConverter]::GetBytes([uint32](4 + 4 + 16 + $val.Count + 4)))  # sheetSize incl. itself
$spsVersion = [byte[]](0x31, 0x53, 0x50, 0x53)                                        # "1SPS"
$sheet.AddRange($spsVersion)
$sheet.AddRange($fmtidBytes)
$sheet.AddRange($val)
$sheet.AddRange([System.BitConverter]::GetBytes([uint32]0))                              # terminator

# --- Build the storage: size-prefixed sheet ---
$storage = [System.Collections.Generic.List[byte]]::new()
$storage.AddRange([System.BitConverter]::GetBytes([uint32]$sheet.Count))
$storage.AddRange($sheet)

# --- Build the PropertyStoreDataBlock ---
$block = [System.Collections.Generic.List[byte]]::new()
$block.AddRange([System.BitConverter]::GetBytes([uint32](8 + $storage.Count)))
$block.AddRange([System.BitConverter]::GetBytes([Convert]::ToUInt32('A0000007', 16)))
$block.AddRange($storage)

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
    $out = New-Object byte[] ($pos + $block.Count + 4)
    [System.Array]::Copy($lnkBytes, 0, $out, 0, $pos)
    $bb = $block.ToArray()
    [System.Array]::Copy($bb, 0, $out, $pos, $bb.Length)
    return $out
}

$sourceBytes = [System.IO.File]::ReadAllBytes($SourceShortcut)
$copy = Join-Path $ProbeDir "lec-layout.lnk"
[System.IO.File]::WriteAllBytes($copy, (Append-Block -lnkBytes $sourceBytes -block $block))
"Block: $(8 + $storage.Count) bytes total"
$result = [LnkRoundTrip2]::Get($copy)
"Round-trip via shell IPropertyStore: $result"
