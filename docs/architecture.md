# Architecture — Prolance

## Vue d'ensemble

Prolance suit une architecture **microservices** avec un API Gateway centralisé et un registre de services Eureka. Chaque service est indépendant, déployable séparément via Docker, et communique soit via HTTP (REST) soit via Apache Kafka (événements asynchrones).

## Schéma d'architecture général

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│              Angular Frontend (port 4200)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│                    API GATEWAY (8222)                           │
│              Spring Cloud Gateway + JWT Filter                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Service Discovery
┌──────────────────────────▼──────────────────────────────────────┐
│                  EUREKA SERVER (8761)                           │
│                   Service Registry                              │
└──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬─────────────────────┘
   │  │  │  │  │  │  │  │  │  │  │  │  │  │
   ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼
  [Microservices — voir tableau ci-dessous]
```

## Microservices

| Service | Port | Base de données | Rôle |
|---|---|---|---|
| user-service | 8091 | MySQL `dev_users` | Gestion utilisateurs, auth JWT, OAuth2 Google |
| publication-service | 8092 | MySQL `dev_publication` | Publications freelancer + tracing Jaeger |
| commentaire-service | 8093 | MySQL `dev_commentaire` | Commentaires + tracing Jaeger |
| reaction-service | 8094 | MySQL `dev_reaction` | Likes/réactions |
| promo-service | 8095 | MySQL `dev_promo` | Codes promo et offres |
| subscription-service | 8096 | MySQL `dev_subscription` | Abonnements et plans |
| skill-service | 8097 | MySQL `dev_skill` | Compétences freelancers + upload fichiers |
| project-service | 8098 | MySQL `dev_project` | Projets et missions |
| application-service | 8099 | MySQL `dev_application` | Candidatures aux projets |
| event-service | 8100 | MySQL `dev_event` | Événements communautaires |
| activity-service | 8101 | MySQL `dev_activity` | Journal d'activité utilisateur |
| inscription-service | 8102 | MySQL `dev_inscription` | Inscriptions aux événements |
| recommendation-service | 8103 | MySQL `dev_recommandation` | Recommandations IA (OpenAI + engine Python) |
| ads-service | 8090 | PostgreSQL `ads_db` | Annonces IA — LangGraph, Kafka, Qdrant, Ollama |

## Architecture IA — Ads Service (détail)

Le service `ads-service` est le cœur IA de la plateforme :

```
┌──────────────────────────────────────────────────────────┐
│                     ADS SERVICE (8090)                   │
│                                                          │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐  │
│  │  LangGraph  │───▶│  Llama-Guard │   │  Groq API   │  │
│  │  (Agentique)│    │  (Modération)│   │  (Génération│  │
│  └─────────────┘    └──────────────┘   │   d'annonces│  │
│                                        └─────────────┘  │
│  ┌─────────────┐    ┌──────────────┐                    │
│  │   Qdrant    │    │    Ollama    │                    │
│  │  (Vecteurs) │◀──▶│  (RAG local) │                    │
│  └─────────────┘    └──────────────┘                    │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            Apache Kafka (events)                    │ │
│  │  ad-clicks │ ad-hovers │ ad-impressions │ CTR       │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────────┐ │
│  │              ClickHouse (OLAP)                      │ │
│  │        Real-time behavioral analytics               │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Infrastructure de monitoring

| Outil | Port | Rôle |
|---|---|---|
| Grafana | 3000 | Dashboards métriques temps réel |
| SonarQube | 9001 | Qualité du code |
| Jaeger | — | Tracing distribué (publication, commentaire) |
| PgAdmin | 5050 | Administration PostgreSQL |

## Communication inter-services

- **Synchrone (REST/HTTP) :** via l'API Gateway, avec propagation JWT pour l'authentification.
- **Asynchrone (Kafka) :** événements comportementaux (clics, hover, impressions) publiés par le frontend et consommés par ads-service → ClickHouse.

## Flux d'authentification

```
Client → API Gateway → JWT Filter → Microservice cible
                   ↑
         user-service (validation token)
         OAuth2 Google (login social)
```
