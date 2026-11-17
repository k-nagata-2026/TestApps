$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host 'Type-checking frontend...'
npx tsc -b
Write-Host 'Bundling frontend for release...'
node build-static.mjs

$releaseRoot = Join-Path $PSScriptRoot 'release'
$inputRoot = Join-Path $releaseRoot 'input'
Remove-Item $releaseRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $inputRoot | Out-Null
New-Item -ItemType Directory -Force backend\build | Out-Null

Write-Host 'Compiling backend...'
javac --add-modules jdk.httpserver,java.desktop -d backend\build backend\QuestionServer.java

Write-Host 'Creating application jar...'
jar cfe "$inputRoot\QuestionServer.jar" QuestionServer -C backend\build .
Copy-Item dist $inputRoot -Recurse
Copy-Item backend\data $inputRoot -Recurse

Write-Host 'Creating Windows application image...'
jpackage --type app-image --name JavaBronzeStudy --input $inputRoot --main-jar QuestionServer.jar --main-class QuestionServer --dest $releaseRoot --java-options '--add-modules=jdk.httpserver,java.desktop' --win-console

Write-Host ''
Write-Host 'Release created:'
Write-Host (Join-Path $releaseRoot 'JavaBronzeStudy\JavaBronzeStudy.exe')
