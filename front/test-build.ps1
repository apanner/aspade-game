# Test Docker build for frontend
Write-Host "Testing Docker build for frontend..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Make sure you're in the frontend directory." -ForegroundColor Red
    exit 1
}

# List files to verify build context
Write-Host "Build context files:" -ForegroundColor Yellow
Get-ChildItem | Format-Table Name, Length, LastWriteTime

# Test Docker build
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t frontend-test .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker build successful!" -ForegroundColor Green
    Write-Host "Cleaning up test image..." -ForegroundColor Yellow
    docker rmi frontend-test
} else {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
} 