!macro customInstall
  CreateShortCut "$INSTDIR\Cron for Code.lnk" "$INSTDIR\CRON for Code.exe"
!macroend

!macro customUninstall
  Delete "$INSTDIR\Cron for Code.lnk"
!macroend
