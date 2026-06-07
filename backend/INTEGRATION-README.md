# 🚀 Backend Integration Guide

## Overview
This branch (`integration/final`) integrates **ads-service** with the team's microservices architecture.

## Architecture
- **Eureka Server**: Service discovery (port 8762)
- **API Gateway**: Single entry point (port 8223)
- **User Service**: Authentication & users (port 8091)
- **Ads Service**: Advertisement management (port 8090)
- **Other Services**: Available but not auto-started to save RAM

## Quick Start (RAM-Conscious)

### 1. Start Integration Environment
```powershell
.\start-integration.ps1
```

This starts:
- ✅ MySQL (shared database)
- ✅ Eureka Server
- ✅ API Gateway
- ✅ User Service (for auth)
- ✅ Ads Service + PostgreSQL + Kafka + Qdrant

**Estimated RAM: ~3-4GB**

### 2. Verify Services
```powershell
# Check all containers
docker ps

# View Eureka dashboard
# Open: http://localhost:8762
```

### 3. Test API Gateway Routing

**Test User Service through Gateway:**
```powershell
curl http://localhost:8223/api/auth/test
```

**Test Ads Service through Gateway:**
```powershell
curl http://localhost:8223/api/plans
```

### 4. Stop Environment
```powershell
.\stop-integration.ps1
```

## Running Additional Services

If you need other team services, start them individually:

```powershell
# Start publication service
docker-compose up -d publication-service

# Start subscription service
docker-compose up -d subscription-service

# etc...
```

## Ads Service - Full Stack (Heavy)

To run ads-service with **ALL** features (Ollama AI, ClickHouse analytics, Grafana monitoring, SonarQube):

```powershell
cd ads-service
docker-compose up -d
```

**⚠️ Warning: This uses ~5-6GB RAM**

## API Gateway Routes

### Ads Service Routes (Added)
- `/api/plans` → ads-service plans API
- `/api/campaigns` → ads-service campaigns API
- `/api/ads` → ads-service ads API
- `/api/rag` → ads-service RAG (AI search) API

### Team Service Routes (Existing)
- `/api/auth/**` → user-service authentication
- `/api/users/**` → user-service users management
- `/api/publications/**` → publication-service
- `/api/comments/**` → comment-service
- `/api/reactions/**` → reaction-service
- `/api/subscriptions/**` → subscription-service
- `/api/promos/**` → promo-service
- `/api/projects/**` → project-service
- `/api/applications/**` → application-service
- `/api/skills/**` → skill-service
- `/api/events/**` → event-service
- `/api/inscriptions/**` → inscription-service
- `/api/activities/**` → activity-service

## Testing Ads Service

### Run Unit Tests with Coverage
```powershell
cd ads-service
mvn clean test
```

### Run Tests + SonarQube Analysis
```powershell
cd ads-service

# Start SonarQube first
docker-compose up -d sonar-db sonarqube

# Wait 1 minute for SonarQube to start
# Then run analysis
mvn clean test sonar:sonar -Dsonar.host.url=http://localhost:9001 -Dsonar.token=YOUR_TOKEN
```

## Troubleshooting

### Service Not Registering with Eureka
- Wait 30-60 seconds for registration
- Check logs: `docker-compose logs -f ads-service`
- Verify Eureka: http://localhost:8762

### Port Conflicts
- Ads-service ports: 8090, 5434 (postgres), 9092 (kafka), 6333 (qdrant)
- If conflicted, stop conflicting services or change ports in docker-compose.integration.yml

### Out of Memory
- Stop unnecessary containers: `docker-compose down`
- Prune unused data: `docker system prune -a`
- Use integration script instead of running all services

## Next Steps

1. ✅ Merge successful - all services integrated
2. ⏭️ Test end-to-end workflows through API Gateway
3. ⏭️ Integrate frontend with new ads-service routes
4. ⏭️ Deploy to staging environment

## Notes

- **No code changes** were made to team services
- **Ads-service routes** added to API Gateway
- **Shared Eureka & Gateway** for service discovery
- **Separate databases** (MySQL for team, PostgreSQL for ads)
- **RAM-conscious** by default
