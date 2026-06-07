# Ads Service - Eureka & API Gateway Integration Guide

## ✅ Changes Made to ads-service

### 1. **Added Dependencies** (`pom.xml`)
```xml
<properties>
    <spring-cloud.version>2024.0.0</spring-cloud.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
    </dependency>
</dependencies>

<dependencyManagement>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-dependencies</artifactId>
        <version>${spring-cloud.version}</version>
        <type>pom</type>
        <scope>import</scope>
    </dependency>
</dependencyManagement>
```

### 2. **Eureka Configuration** (`application.properties`)
```properties
# Eureka Client Configuration
eureka.client.service-url.defaultZone=http://localhost:8761/eureka/
eureka.instance.prefer-ip-address=true
eureka.instance.instance-id=${spring.application.name}:${server.port}
```

### 3. **Main Application Class** (`AdsServiceApplication.java`)
```java
@SpringBootApplication
@EnableAsync
@EnableDiscoveryClient  // ← Added for Eureka registration
public class AdsServiceApplication { ... }
```

---

## 🔧 Required Changes to API Gateway

### Edit: `api-gateway/src/main/resources/application.yml`

Add these routes **under** `spring.cloud.gateway.routes`:

```yaml
        # ── ADS SERVICE ───────────────────────────────────────────
        - id: ads-service-plans
          uri: lb://ads-service
          predicates: [Path=/api/plans/**]
          filters: [StripPrefix=0]

        - id: ads-service-campaigns
          uri: lb://ads-service
          predicates: [Path=/api/campaigns/**]
          filters: [StripPrefix=0]

        - id: ads-service-ads
          uri: lb://ads-service
          predicates: [Path=/api/ads/**]
          filters: [StripPrefix=0]

        - id: ads-service-swagger
          uri: lb://ads-service
          predicates: [Path=/ads-service/swagger-ui/**,/ads-service/v3/api-docs/**]
          filters: [StripPrefix=0]
```

---

## 🚀 Deployment Steps

### 1. Start Services in Order
```bash
# Terminal 1: Start Eureka Server (port 8761)
cd eureka-server
mvn spring-boot:run

# Terminal 2: Start API Gateway (port 8222)
cd api-gateway
mvn spring-boot:run

# Terminal 3: Start Ads Service (port 8090)
cd ads-service
mvn spring-boot:run
```

### 2. Verify Registration
- **Eureka Dashboard**: http://localhost:8761
- Look for `ADS-SERVICE` in the registered instances

### 3. Test Endpoints Through Gateway
```bash
# Before (direct): http://localhost:8090/ads-service/api/campaigns/active
# After (gateway): http://localhost:8222/api/campaigns/active
```

---

## 📌 Important Notes

### CORS Configuration
The API Gateway **already has CORS configured** for `http://localhost:4200`:
```yaml
globalcors:
  cors-configurations:
    '[/**]':
      allowedOrigins: ["http://localhost:4200"]
      allowedMethods: [GET, POST, PUT, DELETE, OPTIONS]
      allowedHeaders: ["*"]
      allowCredentials: true
```

### Security
- JWT tokens should be sent in `Authorization` header
- Ads service validates JWT on its own (no changes needed)
- Gateway routes all requests with headers intact

### Context Path
- Ads service has context path: `/ads-service`
- Gateway strips this automatically via route configuration
- Frontend only needs base path changes (see below)

---

## 🌐 Frontend Integration Changes

### Environment Configuration

**Before (Direct Service):**
```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8090/ads-service/api'
};
```

**After (API Gateway):**
```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8222/api'  // ← Changed to gateway
};
```

### No Other Changes Required!
All existing Angular service calls work automatically:
```typescript
// Existing code works as-is
this.http.get(`${environment.apiUrl}/campaigns/active`)
this.http.post(`${environment.apiUrl}/campaigns/validate`, data)
this.http.get(`${environment.apiUrl}/ads/${id}/contact`)
```

---

## 🧪 Testing Checklist

- [ ] Eureka shows `ADS-SERVICE` as UP
- [ ] Gateway routes work: `http://localhost:8222/api/campaigns/active`
- [ ] Swagger accessible: `http://localhost:8222/ads-service/swagger-ui/index.html`
- [ ] CORS allows requests from Angular (localhost:4200)
- [ ] JWT authentication still works through gateway
- [ ] Kafka events still fire (check logs)
- [ ] Ollama moderation still functions

---

## 🔍 Troubleshooting

### Service Not Registering with Eureka
- Check Eureka is running on port 8761
- Verify `eureka.client.service-url.defaultZone` in ads-service
- Check ads-service logs for connection errors

### Gateway Returns 503 Service Unavailable
- Ensure ads-service is registered in Eureka
- Check service name matches: `spring.application.name=ads-service`
- Verify `lb://ads-service` URI in gateway routes

### CORS Errors
- Ensure `allowCredentials: true` in gateway CORS config
- Check `allowedOrigins` includes your Angular app URL
- Verify no duplicate CORS configs (remove from ads-service if any)

---

## 📦 Complete Service Startup Command

```bash
# Start all services with proper order
cd ~/OneDrive/Bureau/PI\ 4A/PI-4A-4SAE4-BACKEND

# Terminal 1
cd eureka-server && mvn spring-boot:run

# Terminal 2 (wait 10 seconds)
cd api-gateway && mvn spring-boot:run

# Terminal 3 (wait 10 seconds)
cd ads-service && mvn spring-boot:run
```

---

## ✨ Benefits of This Architecture

1. **Single Entry Point**: Frontend only talks to gateway (port 8222)
2. **Load Balancing**: Gateway can distribute requests across multiple instances
3. **Service Discovery**: Services find each other via Eureka (no hardcoded URLs)
4. **Centralized CORS**: Managed in one place (gateway)
5. **Easy Scaling**: Add more service instances without frontend changes
