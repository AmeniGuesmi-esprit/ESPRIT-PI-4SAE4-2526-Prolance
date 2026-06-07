# Architecture — Prolance

## Overview

Prolance follows a **microservices architecture** with a centralized API Gateway and a Eureka service registry. Each service is independent, separately deployable via Docker, and communicates either via HTTP (REST) or Apache Kafka (asynchronous events).

## General Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                │
│                Angular Frontend (port 4200)                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│                    API GATEWAY (8222)                           │
│              Spring Cloud Gateway + JWT Filter                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Service Discovery
┌──────────────────────────▼──────────────────────────────────────┐
│                   EUREKA SERVER (8761)                          │
│                      Service Registry                           │
└──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬─────────────────────┘
   │  │  │  │  │  │  │  │  │  │  │  │  │  │
   ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼
  [Microservices — see table below]
```

## Microservices

| Service | Port | Database | Role |
|---|---|---|---|
| user-service | 8091 | MySQL `dev_users` | User management, JWT auth, Google OAuth2 |
| publication-service | 8092 | MySQL `dev_publication` | Freelancer publications + Jaeger tracing |
| commentaire-service | 8093 | MySQL `dev_commentaire` | Comments + Jaeger tracing |
| reaction-service | 8094 | MySQL `dev_reaction` | Likes / reactions |
| promo-service | 8095 | MySQL `dev_promo` | Promo codes and offers |
| subscription-service | 8096 | MySQL `dev_subscription` | Subscriptions and plans |
| skill-service | 8097 | MySQL `dev_skill` | Freelancer skills + file uploads |
| project-service | 8098 | MySQL `dev_project` | Projects and missions |
| application-service | 8099 | MySQL `dev_application` | Project applications |
| event-service | 8100 | MySQL `dev_event` | Community events |
| activity-service | 8101 | MySQL `dev_activity` | User activity log |
| inscription-service | 8102 | MySQL `dev_inscription` | Event registrations |
| recommendation-service | 8103 | MySQL `dev_recommandation` | AI recommendations (OpenAI + Python engine) |
| ads-service | 8090 | PostgreSQL `ads_db` | AI ads — LangGraph, Kafka, Qdrant, Ollama |

## AI Architecture — Ads Service (detail)

The `ads-service` is the AI core of the platform:

```
┌──────────────────────────────────────────────────────────┐
│                    ADS SERVICE (8090)                    │
│                                                          │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐  │
│  │  LangGraph  │───▶│  Llama-Guard │   │  Groq API   │  │
│  │  (Agentic)  │    │ (Moderation) │   │  (Ad gener- │  │
│  └─────────────┘    └──────────────┘   │   ation)    │  │
│                                        └─────────────┘  │
│  ┌─────────────┐    ┌──────────────┐                    │
│  │   Qdrant    │    │    Ollama    │                    │
│  │  (Vectors)  │◀──▶│  (RAG local) │                    │
│  └─────────────┘    └──────────────┘                    │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Apache Kafka (events)                  │ │
│  │  ad-clicks │ ad-hovers │ ad-impressions │ CTR       │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────────┐ │
│  │              ClickHouse (OLAP)                      │ │
│  │        Real-time behavioral analytics               │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Monitoring Infrastructure

| Tool | Port | Role |
|---|---|---|
| Grafana | 3000 | Real-time metrics dashboards |
| SonarQube | 9001 | Code quality analysis |
| Jaeger | — | Distributed tracing (publication, commentaire) |
| PgAdmin | 5050 | PostgreSQL administration |

## Inter-Service Communication

- **Synchronous (REST/HTTP):** via the API Gateway, with JWT propagation for authentication.
- **Asynchronous (Kafka):** behavioral events (clicks, hovers, impressions) published by the frontend and consumed by ads-service → ClickHouse.

## Authentication Flow

```
Client → API Gateway → JWT Filter → Target Microservice
                   ↑
         user-service (token validation)
         Google OAuth2 (social login)
```