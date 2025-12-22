# Security Audit Script for Windows
# Run from project root: .\scripts\security-audit.ps1
#
# Tools used:
#   - npm audit: Built-in npm vulnerability scanner
#   - OSV Scanner: Google's Open Source Vulnerabilities database scanner
#   - Secretlint: Secret detection in source code
#   - ESLint + security plugin: Static code analysis for security issues
#
# Optional (CI/CD only):
#   - Semgrep: Advanced static analysis (requires Docker on Windows)

param(
    [switch]$Fix,
    [switch]$Verbose,
    [switch]$SkipOSV
)

$ErrorCount = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HomeTracker Security Audit" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check Backend Dependencies (npm audit)
Write-Host "`n[1/6] Checking Backend Dependencies (npm audit)..." -ForegroundColor Yellow
if (Test-Path "backend") {
    Push-Location "backend"
    if ($Fix) {
        npm audit fix
    } else {
        npm audit
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ! Backend vulnerabilities found!" -ForegroundColor Red
        $ErrorCount++
    } else {
        Write-Host "  ✓ Backend dependencies are clean." -ForegroundColor Green
    }
    Pop-Location
} else {
    Write-Host "  ! Backend directory not found." -ForegroundColor Red
    $ErrorCount++
}

# 2. Check Frontend Dependencies (npm audit)
Write-Host "`n[2/6] Checking Frontend Dependencies (npm audit)..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    Push-Location "frontend"
    if ($Fix) {
        npm audit fix
    } else {
        npm audit
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ! Frontend vulnerabilities found!" -ForegroundColor Red
        $ErrorCount++
    } else {
        Write-Host "  ✓ Frontend dependencies are clean." -ForegroundColor Green
    }
    Pop-Location
} else {
    Write-Host "  ! Frontend directory not found." -ForegroundColor Red
    $ErrorCount++
}

# 3. OSV Scanner (Google's Open Source Vulnerabilities)
Write-Host "`n[3/6] Running OSV Scanner..." -ForegroundColor Yellow
if (-not $SkipOSV) {
    try {
        $osvResult = osv-scanner --lockfile frontend/package-lock.json --lockfile backend/package-lock.json 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ! OSV Scanner found vulnerabilities:" -ForegroundColor Red
            Write-Host $osvResult -ForegroundColor DarkGray
            $ErrorCount++
        } else {
            Write-Host "  ✓ No OSV vulnerabilities found." -ForegroundColor Green
        }
    } catch {
        Write-Host "  - OSV Scanner not installed. Run: winget install Google.OSVScanner" -ForegroundColor Gray
    }
} else {
    Write-Host "  - Skipped (use without -SkipOSV to enable)" -ForegroundColor Gray
}

# 4. Secret Scanning with Secretlint
Write-Host "`n[4/6] Running Secretlint..." -ForegroundColor Yellow
try {
    $secretlintResult = npx secretlint "backend/src/**/*" "frontend/src/**/*" --secretlintrc .secretlintrc.json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ! Secrets detected by secretlint:" -ForegroundColor Red
        Write-Host $secretlintResult -ForegroundColor DarkGray
        $ErrorCount++
    } else {
        Write-Host "  ✓ No secrets detected by secretlint." -ForegroundColor Green
    }
} catch {
    Write-Host "  ! Secretlint not installed. Run: npm install -D @secretlint/quick-start" -ForegroundColor Red
    $ErrorCount++
}

# 5. ESLint Security Scan (if available)
Write-Host "`n[5/6] Running ESLint Security Checks..." -ForegroundColor Yellow
$eslintIssues = 0

if (Test-Path "frontend/.eslintrc.json") {
    Push-Location "frontend"
    try {
        $eslintResult = npm run lint 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ! Frontend ESLint issues found" -ForegroundColor Yellow
            if ($Verbose) { Write-Host $eslintResult -ForegroundColor DarkGray }
            $eslintIssues++
        } else {
            Write-Host "  ✓ Frontend ESLint passed." -ForegroundColor Green
        }
    } catch {
        Write-Host "  - Frontend ESLint not configured." -ForegroundColor Gray
    }
    Pop-Location
}

if (Test-Path "backend/.eslintrc.json") {
    Push-Location "backend"
    try {
        $eslintResult = npm run lint 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ! Backend ESLint issues found" -ForegroundColor Yellow
            if ($Verbose) { Write-Host $eslintResult -ForegroundColor DarkGray }
            $eslintIssues++
        } else {
            Write-Host "  ✓ Backend ESLint passed." -ForegroundColor Green
        }
    } catch {
        Write-Host "  - Backend ESLint not configured." -ForegroundColor Gray
    }
    Pop-Location
}

if ($eslintIssues -gt 0) {
    Write-Host "  ! $eslintIssues ESLint check(s) have issues (warnings only)" -ForegroundColor Yellow
}

# 6. Check for common security misconfigurations
Write-Host "`n[6/6] Checking Security Configuration..." -ForegroundColor Yellow
$configIssues = 0

# Check .env.example exists
if (-not (Test-Path "backend/.env.example")) {
    Write-Host "  ! Missing backend/.env.example template" -ForegroundColor Yellow
    $configIssues++
}

# Check .gitignore includes sensitive files
$gitignore = Get-Content ".gitignore" -ErrorAction SilentlyContinue
if ($gitignore -and $gitignore -match "\.env") {
    Write-Host "  ✓ .env files are gitignored." -ForegroundColor Green
} else {
    Write-Host "  ! .env files may not be gitignored!" -ForegroundColor Red
    $ErrorCount++
}

# Check secretlint config exists
if (Test-Path ".secretlintrc.json") {
    Write-Host "  ✓ Secretlint configured." -ForegroundColor Green
} else {
    Write-Host "  ! Missing .secretlintrc.json" -ForegroundColor Yellow
    $configIssues++
}

# Check husky pre-commit
if (Test-Path ".husky/pre-commit") {
    Write-Host "  ✓ Pre-commit hooks configured." -ForegroundColor Green
} else {
    Write-Host "  ! Missing pre-commit hooks" -ForegroundColor Yellow
    $configIssues++
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($ErrorCount -eq 0) {
    Write-Host "  ✓ Security Audit PASSED" -ForegroundColor Green
    Write-Host "    No critical issues found." -ForegroundColor Gray
} else {
    Write-Host "  ! Security Audit FAILED" -ForegroundColor Red
    Write-Host "    $ErrorCount critical issue(s) found." -ForegroundColor Gray
}
Write-Host "========================================" -ForegroundColor Cyan

exit $ErrorCount
