# Security Audit Script for Windows
Write-Host "Starting Security Audit..." -ForegroundColor Cyan

# Check Backend
Write-Host "`nChecking Backend Dependencies..." -ForegroundColor Yellow
if (Test-Path "backend") {
    Push-Location "backend"
    npm audit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Backend vulnerabilities found!" -ForegroundColor Red
    } else {
        Write-Host "Backend is clean." -ForegroundColor Green
    }
    Pop-Location
} else {
    Write-Host "Backend directory not found." -ForegroundColor Red
}

# Check Frontend
Write-Host "`nChecking Frontend Dependencies..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    Push-Location "frontend"
    npm audit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Frontend vulnerabilities found!" -ForegroundColor Red
    } else {
        Write-Host "Frontend is clean." -ForegroundColor Green
    }
    Pop-Location
} else {
    Write-Host "Frontend directory not found." -ForegroundColor Red
}

# Basic Secret Scan (Regex)
Write-Host "`nScanning for potential hardcoded secrets (Basic Regex)..." -ForegroundColor Yellow
$secretPatterns = @(
    "api_key\s*[:=]\s*['`"][^'`"]+['`"]",
    "password\s*[:=]\s*['`"][^'`"]+['`"]",
    "secret\s*[:=]\s*['`"][^'`"]+['`"]",
    "token\s*[:=]\s*['`"][^'`"]+['`"]"
)

$searchPaths = @("backend/src", "frontend/src")

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        Write-Host "Scanning $path..." -ForegroundColor Cyan
        Get-ChildItem -Path $path -Recurse -File -Include "*.ts","*.js","*.json" -ErrorAction SilentlyContinue | ForEach-Object {
            $file = $_
            foreach ($pattern in $secretPatterns) {
                try {
                    $content = Get-Content $file.FullName -ErrorAction SilentlyContinue
                    if ($content) {
                        $matches = $content | Select-String -Pattern $pattern
                        if ($matches) {
                            foreach ($match in $matches) {
                                Write-Host "Potential secret found in $($file.FullName):$($match.LineNumber)" -ForegroundColor Red
                                Write-Host "  $($match.Line.Trim())" -ForegroundColor DarkGray
                            }
                        }
                    }
                } catch {
                    Write-Host "Error reading $($file.FullName)" -ForegroundColor DarkGray
                }
            }
        }
    }
}

Write-Host "`nAudit Complete." -ForegroundColor Cyan
