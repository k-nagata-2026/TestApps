$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

New-Item -ItemType Directory -Force backend\build | Out-Null
javac --add-modules jdk.httpserver,java.desktop -d backend\build backend\QuestionServer.java

Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', "Set-Location '$PSScriptRoot\backend'; java --add-modules jdk.httpserver,java.desktop -cp build QuestionServer"

npm run dev -- --host 0.0.0.0
