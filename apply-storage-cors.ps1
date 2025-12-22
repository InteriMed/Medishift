Write-Host "Applying CORS configuration to Firebase Storage bucket..." -ForegroundColor Yellow

if (-not (Get-Command gsutil -ErrorAction SilentlyContinue)) {
    Write-Host "Error: gsutil is not installed." -ForegroundColor Red
    Write-Host "Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

$storageBucket = $env:FIREBASE_STORAGE_BUCKET
if (-not $storageBucket) {
    $storageBucket = $env:REACT_APP_FIREBASE_STORAGE_BUCKET
}

if (-not $storageBucket -and (Test-Path "frontend/.env")) {
    $envContent = Get-Content "frontend/.env" | Where-Object { $_ -match "^REACT_APP_FIREBASE_STORAGE_BUCKET=" }
    if ($envContent) {
        $storageBucket = ($envContent -split "=")[1].Trim('"').Trim("'")
    }
}

if (-not $storageBucket) {
    Write-Host "Please set FIREBASE_STORAGE_BUCKET or REACT_APP_FIREBASE_STORAGE_BUCKET environment variable" -ForegroundColor Yellow
    Write-Host "Example: `$env:FIREBASE_STORAGE_BUCKET='your-project-id.appspot.com'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using storage bucket: $storageBucket" -ForegroundColor Yellow
gsutil cors set storage.cors.json "gs://$storageBucket"

if ($LASTEXITCODE -eq 0) {
    Write-Host "CORS configuration applied successfully!" -ForegroundColor Green
    Write-Host "Storage bucket now allows requests from localhost:4000" -ForegroundColor Green
} else {
    Write-Host "Failed to apply CORS configuration" -ForegroundColor Red
    exit 1
}

