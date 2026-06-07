# ============================================================
#  start.ps1  —  Ads-Service + Auth stack
#  Starts: MySQL, Eureka, API Gateway, User Service,
#          Ads Postgres, Kafka, Qdrant, Ollama,
#          ClickHouse, Grafana, Kafka-UI, PgAdmin, Ads-Service
# ============================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Starting Ads-Service + Auth Environment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# [1] Core infrastructure
Write-Host "[1/5] Starting core infrastructure (MySQL, Eureka)..." -ForegroundColor Yellow
docker-compose up -d mysql eureka-server

Write-Host "      Waiting for MySQL and Eureka to be healthy..." -ForegroundColor Gray
docker-compose wait mysql eureka-server 2>$null
Start-Sleep -Seconds 5

# [2] Auth layer
Write-Host "[2/5] Starting API Gateway and User Service..." -ForegroundColor Yellow
docker-compose up -d api-gateway user-service

# [3] Ads infrastructure (DB, Kafka, Qdrant, Ollama)
Write-Host "[3/5] Starting Ads infrastructure (Postgres, Kafka, Qdrant, Ollama)..." -ForegroundColor Yellow
docker-compose up -d ads-db kafka qdrant ollama

Write-Host "      Waiting for Ads Postgres to be healthy..." -ForegroundColor Gray
docker-compose wait ads-db 2>$null
Start-Sleep -Seconds 5

# [4] Analytics + Tooling (ClickHouse, Grafana, Kafka-UI, PgAdmin)
Write-Host "[4/5] Starting analytics and tooling (ClickHouse, Grafana, Kafka-UI, PgAdmin)..." -ForegroundColor Yellow
docker-compose up -d clickhouse grafana kafka-ui pgadmin
Start-Sleep -Seconds 8

# [5] Ads Service
Write-Host "[5/5] Starting Ads Service..." -ForegroundColor Yellow
docker-compose up -d ads-service

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Auth:" -ForegroundColor Cyan
Write-Host "    API Gateway    ->  http://localhost:8222" -ForegroundColor White
Write-Host "    User Service   ->  http://localhost:8091" -ForegroundColor White
Write-Host "    Eureka UI      ->  http://localhost:8762" -ForegroundColor White
Write-Host ""
Write-Host "  Ads-Service:" -ForegroundColor Cyan
Write-Host "    Ads Service    ->  http://localhost:8090" -ForegroundColor White
Write-Host "    Kafka UI       ->  http://localhost:8085" -ForegroundColor White
Write-Host "    Grafana        ->  http://localhost:3000  (admin / admin)" -ForegroundColor White
Write-Host "    PgAdmin        ->  http://localhost:5050  (fawzi-admin@pidev4sae4.com / fawzi)" -ForegroundColor White
Write-Host "    Qdrant         ->  http://localhost:6333" -ForegroundColor White
Write-Host "    Ollama         ->  http://localhost:11435" -ForegroundColor White
Write-Host ""
Write-Host "  To stop everything:" -ForegroundColor Yellow
Write-Host "    docker-compose down" -ForegroundColor White
Write-Host ""

# Show Ollama models
Write-Host "  Ollama models loaded:" -ForegroundColor Cyan
Start-Sleep -Seconds 3
docker exec dev-ollama ollama list 2>$null
Write-Host ""
