@echo off
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 goto use_path_node
set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%NODE_EXE%" goto launch
echo [Age of Pirates] Node.js was not found. Install Node.js 20 or newer.
pause
exit /b 1
:use_path_node
set "NODE_EXE=node"
:launch
"%NODE_EXE%" launch-game.mjs
if errorlevel 1 pause
