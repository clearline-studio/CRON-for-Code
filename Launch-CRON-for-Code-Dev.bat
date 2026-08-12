@echo off
setlocal
rem CRON for Code - development launcher entry point.
rem Resolves the repository from this file's location and delegates to the silent VBS launcher.
set "BAT_ROOT=%~dp0"
if not exist "%BAT_ROOT%launch-cron-for-code-dev.vbs" (
    echo CRON for Code Dev: launcher VBS not found next to this script.
    exit /b 1
)
start "" wscript.exe "%BAT_ROOT%launch-cron-for-code-dev.vbs"
endlocal
