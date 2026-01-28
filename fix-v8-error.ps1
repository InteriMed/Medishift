# PowerShell script to fix V8 Fatal Error
Write-Host "Fixing V8 Fatal Error - Cleaning build artifacts and dependencies..." -ForegroundColor Cyan

$ErrorActionPreference = "Continue"

Write-Host "`n1. Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}

Write-Host "2. Removing build directory..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
}

Write-Host "3. Removing .cache directories..." -ForegroundColor Yellow
Get-ChildItem -Path . -Directory -Recurse -Filter ".cache" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path . -Directory -Recurse -Filter ".next" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "4. Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "5. Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
}

Write-Host "6. Clearing webpack cache..." -ForegroundColor Yellow
if (Test-Path ".webpack-cache") {
    Remove-Item -Recurse -Force ".webpack-cache"
}
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
}

Write-Host "7. Reinstalling dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n8. Verifying Node.js version..." -ForegroundColor Yellow
node --version

Write-Host "`n✅ Cleanup complete! Try running 'npm start' again." -ForegroundColor Green
Write-Host "`nIf the error persists, try:" -ForegroundColor Yellow
Write-Host "  - Update Node.js to latest LTS version (18.x or 20.x)"
Write-Host "  - Increase Node.js memory: `$env:NODE_OPTIONS='--max-old-space-size=4096'; npm start"
Write-Host "  - Check for native module compatibility issues"

