@echo off
cd /d "%~dp0"

set "NODE_EXE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE (
  set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if not exist "%NODE_EXE%" (
  echo Node.js could not be found in Windows or the Codex runtime.
  echo Install Node.js from https://nodejs.org/ and then try again.
  pause
  exit /b 1
)

"%NODE_EXE%" server.js --open
if errorlevel 1 pause
