#Requires -Version 5.1
# Install the `marky` CLI on Windows as a marky.cmd wrapper that launches the
# GUI detached from the calling terminal.
#
# Run after `pnpm tauri dev` (debug binary) or `pnpm tauri build` (release).
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$targetDir = if ($env:MARKY_INSTALL_DIR) { $env:MARKY_INSTALL_DIR } else { Join-Path $HOME ".local\bin" }
$wrapper = Join-Path $targetDir "marky.cmd"

$releaseExe = Join-Path $root "src-tauri\target\release\marky.exe"
$debugExe = Join-Path $root "src-tauri\target\debug\marky.exe"

if (Test-Path $releaseExe) {
    $exe = $releaseExe
    $kind = "release"
} elseif (Test-Path $debugExe) {
    $exe = $debugExe
    $kind = "debug"
} else {
    Write-Host "error: no built marky binary found." -ForegroundColor Red
    Write-Host "  build first with:  pnpm tauri dev   (or: pnpm tauri build)"
    exit 1
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$flags = if ($kind -eq "debug") { " /min" } else { "" }
$content = "@echo off`r`nstart `"`"$flags `"$exe`" %*`r`n"
Set-Content -Path $wrapper -Value $content -Encoding Default

Write-Host "installed wrapper: $wrapper"
Write-Host "  -> $kind ($exe)"
if ($kind -eq "debug") {
    Write-Host "  note: debug builds open a minimized console window; a release build avoids it." -ForegroundColor Yellow
}

$existingPath = (@(
    [Environment]::GetEnvironmentVariable("Path", "User")
    [Environment]::GetEnvironmentVariable("Path", "Machine")
) -join ";") -split ";" | Where-Object { $_ }
if ($existingPath -notcontains $targetDir) {
    Write-Host ""
    Write-Host "warning: $targetDir is not on PATH. Add it with:" -ForegroundColor Yellow
    Write-Host "  [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ';$targetDir', 'User')"
}
