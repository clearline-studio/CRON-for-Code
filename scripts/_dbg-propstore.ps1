$source = @'
using System;
using System.Runtime.InteropServices;

public static class DebugPropStore
{
    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    public struct PROPERTYKEY { public Guid fmtid; public uint pid; }

    [StructLayout(LayoutKind.Explicit)]
    public struct PROPVARIANT
    {
        [FieldOffset(0)] public ushort vt;
        [FieldOffset(8)] public IntPtr pwszVal;
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SHGetPropertyStoreFromParsingName(
        [MarshalAs(UnmanagedType.LPWStr)] string pszPath, IntPtr pbc, uint flags, ref Guid riid, out IntPtr ppv);

    [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPropertyStore
    {
        [PreserveSig] int GetCount(out uint cProps);
        [PreserveSig] int GetAt(uint iProp, out PROPERTYKEY pkey);
        [PreserveSig] int GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
        [PreserveSig] int SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
        [PreserveSig] int Commit();
    }

    public static string Run(string path, string appId)
    {
        Guid iid = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");
        IntPtr storePtr;
        int hr = SHGetPropertyStoreFromParsingName(path, IntPtr.Zero, 0x2, ref iid, out storePtr);
        if (hr != 0) return "GETSTORE=" + hr.ToString("X8");
        string result;
        try
        {
            IPropertyStore store = (IPropertyStore)Marshal.GetObjectForIUnknown(storePtr);
            uint count;
            int hrCount = store.GetCount(out count);
            PROPERTYKEY key = new PROPERTYKEY();
            key.fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");
            key.pid = 5;
            PROPVARIANT pv = new PROPVARIANT();
            pv.vt = 31;
            pv.pwszVal = Marshal.StringToCoTaskMemUni(appId);
            int hrSet = store.SetValue(ref key, ref pv);
            Marshal.FreeCoTaskMem(pv.pwszVal);
            int hrCommit = hrSet == 0 ? store.Commit() : -1;
            result = "COUNT=" + count + " SET=" + hrSet.ToString("X8") + " COMMIT=" + hrCommit.ToString("X8");
        }
        catch (Exception ex)
        {
            result = "EX=" + ex.Message;
        }
        finally
        {
            Marshal.Release(storePtr);
        }
        return result;
    }
}
'@

Add-Type -TypeDefinition $source -ErrorAction Stop
[DebugPropStore]::Run("$env:USERPROFILE\Desktop\CRON for Code Dev.lnk", "com.cron.code.dev")
