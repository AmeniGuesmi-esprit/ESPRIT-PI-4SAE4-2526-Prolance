# ============================================================
# build_5sur6.ps1
# Builds Docker images for all team services (excluding
# ads-service & user-service) using docker compose build.
# Optionally starts selected services afterwards.
# Run from the root of PI-4A-4SAE4-BACKEND
# ============================================================

# Resolve root: works both when run as a script and from the console
$Root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent (Resolve-Path ".\docker-compose.yml") }

# docker-compose service names (as defined in docker-compose.yml)
$Services = @(
    "publication-service",
    "commentaire-service",
    "reaction-service",
    "promo-service",
    "subscription-service",
    "skill-service",
    "project-service",
    "application-service",
    "event-service",
    "activity-service",
    "inscription-service",
    "recommandation-service"
)

# ── STEP 1: Build each service image ────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Building 12 team service Docker images   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$Failed = @()
$Built  = @()

Set-Location $Root
foreach ($svc in $Services) {
    Write-Host "  Building $svc ..." -ForegroundColor White
    & docker compose build $svc
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host "  [OK]   $svc" -ForegroundColor Green
        $Built += $svc
    }
    else {
        Write-Host "  [FAIL] $svc - build failed (exit $exitCode)" -ForegroundColor Red
        $Failed += $svc
    }
    Write-Host ""
}

# ── Summary ─────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Build Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Built:  $($Built.Count) / $($Services.Count)" -ForegroundColor Green
if ($Failed.Count -gt 0) {
    Write-Host "  Failed: $($Failed -join ', ')" -ForegroundColor Red
}

if ($Built.Count -eq 0) {
    Write-Host ""
    Write-Host "Nothing was built successfully. Exiting." -ForegroundColor Red
    exit 1
}

# ── STEP 2: Optionally start services ───────────────────────
Write-Host ""
$launch = Read-Host "Do you want to start any of the built services? (y/n)"
if ($launch -ne "y") {
    Write-Host "Done. No containers started." -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "Built services:" -ForegroundColor Cyan
for ($i = 0; $i -lt $Built.Count; $i++) {
    Write-Host "  [$($i+1)] $($Built[$i])" -ForegroundColor White
}
Write-Host "  [A] All of the above" -ForegroundColor White
Write-Host "  [0] Cancel" -ForegroundColor White
Write-Host ""

$userInput = Read-Host "Enter numbers separated by commas (e.g. 1,3,5), A for all, or 0 to cancel"

if ($userInput -eq "0" -or $userInput -eq "") {
    Write-Host "No containers started." -ForegroundColor Cyan
    exit 0
}

$ToStart = @()

if ($userInput -eq "A" -or $userInput -eq "a") {
    $ToStart = $Built
}
else {
    foreach ($part in ($userInput -split ",")) {
        $idx = $part.Trim()
        if ($idx -match "^\d+$") {
            $n = [int]$idx
            if ($n -ge 1 -and $n -le $Built.Count) {
                $ToStart += $Built[$n - 1]
            }
            else {
                Write-Host "  [WARN] Index $n out of range, skipped." -ForegroundColor Yellow
            }
        }
    }
}

if ($ToStart.Count -eq 0) {
    Write-Host "No valid services selected. Exiting." -ForegroundColor Yellow
    exit 0
}

# Make sure infrastructure is up first
Write-Host ""
Write-Host "Ensuring infrastructure is running (mysql, eureka-server, api-gateway)..." -ForegroundColor Cyan
& docker compose up -d mysql eureka-server api-gateway

Write-Host ""
Write-Host "Starting selected services..." -ForegroundColor Cyan

# Expand array into individual arguments for docker compose
& docker compose up -d @ToStart

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Started services:" -ForegroundColor Cyan
foreach ($svc in $ToStart) {
    Write-Host "  - $svc  (container: dev-$svc)" -ForegroundColor Green
}
Write-Host ""
Write-Host "  Eureka dashboard : http://localhost:8762" -ForegroundColor White
Write-Host "  API Gateway      : http://localhost:8222" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan