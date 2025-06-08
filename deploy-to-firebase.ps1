Write-Host "Starting complete Firebase deployment (Frontend + Functions)..." -ForegroundColor Yellow

# Build frontend first
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Deploy functions
Write-Host "Installing function dependencies..." -ForegroundColor Yellow
Set-Location functions
npm install

Write-Host "Deploying functions..." -ForegroundColor Yellow
firebase deploy --only functions

if ($LASTEXITCODE -ne 0) {
    Write-Host "Functions deployment failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Deploy hosting
Write-Host "Deploying frontend to Firebase hosting..." -ForegroundColor Yellow
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host "Complete deployment successful!" -ForegroundColor Green
    Write-Host "Your app is now live on Firebase hosting with working functions!" -ForegroundColor Green
} else {
    Write-Host "Hosting deployment failed!" -ForegroundColor Red
    exit 1
} 