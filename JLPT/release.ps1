$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$javaBin = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin' } else { $null }
if ($javaBin -and (Test-Path $javaBin)) {
	$env:Path = "$javaBin;$env:Path"
}

if (-not (Get-Command javac -ErrorAction SilentlyContinue)) {
	throw "javac not found. Check JAVA_HOME=$env:JAVA_HOME"
}
if (-not (Get-Command jar -ErrorAction SilentlyContinue)) {
	throw "jar not found. Check JAVA_HOME=$env:JAVA_HOME"
}
if (-not (Get-Command jpackage -ErrorAction SilentlyContinue)) {
	throw "jpackage not found. Check JAVA_HOME=$env:JAVA_HOME"
}

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
jpackage --type app-image --name JapaneseStudyApp --input $inputRoot --main-jar QuestionServer.jar --main-class QuestionServer --dest $releaseRoot --java-options '--add-modules=jdk.httpserver,java.desktop' --win-console

Write-Host ''
Write-Host 'Release created:'
Write-Host (Join-Path $releaseRoot 'JapaneseStudyApp\JapaneseStudyApp.exe')
