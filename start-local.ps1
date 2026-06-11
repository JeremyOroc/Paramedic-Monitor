$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDir = Join-Path $root '.node-portable\node-v24.14.0-win-x64'
$npm = Join-Path $nodeDir 'npm.cmd'

$env:Path = "$nodeDir;$env:Path"
Set-Location $root

& $npm run dev
