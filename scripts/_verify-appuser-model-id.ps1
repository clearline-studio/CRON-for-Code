$source = @'
using System;
using System.Runtime.InteropServices;
public static class VerifyProp {
  [StructLayout(LayoutKind.Sequential, Pack = 4)] public struct PROPERTYKEY { public Guid fmtid; public uint pid; }
  [StructLayout(LayoutKind.Explicit)] public struct PROPVARIANT { [FieldOffset(0)] public ushort vt; [FieldOffset(8)] public IntPtr pwszVal; }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)] private static extern int SHGetPropertyStoreFromParsingName([MarshalAs(UnmanagedType.LPWStr)] string pszPath, IntPtr pbc, uint flags, ref Guid riid, out IntPtr ppv);
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  private interface IPropertyStore { [PreserveSig] int GetCount(out uint c); [PreserveSig] int GetAt(uint i, out PROPERTYKEY k); [PreserveSig] int GetValue(ref PROPERTYKEY k, out PROPVARIANT v); [PreserveSig] int SetValue(ref PROPERTYKEY k, ref PROPVARIANT v); [PreserveSig] int Commit(); }
  public static string Get(string path) {
    Guid iid = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");
    IntPtr p; int hr = SHGetPropertyStoreFromParsingName(path, IntPtr.Zero, 0, ref iid, out p);
    if (hr != 0) return "ERR " + hr.ToString("X8");
    try { IPropertyStore s = (IPropertyStore)Marshal.GetObjectForIUnknown(p);
      PROPERTYKEY k = new PROPERTYKEY(); k.fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"); k.pid = 5;
      PROPVARIANT v; hr = s.GetValue(ref k, out v);
      if (hr != 0 || v.vt != 31 || v.pwszVal == IntPtr.Zero) return "NOT-SET(" + hr.ToString("X8") + ")";
      return Marshal.PtrToStringUni(v.pwszVal);
    } finally { Marshal.Release(p); }
  }
}
'@
Add-Type -TypeDefinition $source -ErrorAction Stop
foreach ($path in $args) {
    Write-Output "$path -> AppUserModelID = [$([VerifyProp]::Get($path))]"
}
