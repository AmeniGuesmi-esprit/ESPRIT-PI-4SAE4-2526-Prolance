# Prolance – Smart Freelancing Platform - ESPRIT School of Engineering - PIDEV 4SAE4 2025-2026

## Overview
This project was developed as part of the **PIDEV – 4th Year Engineering Program** at **Esprit School of Engineering** (Academic Year 2025–2026).

**Prolance** is an advanced, AI-driven freelancing ecosystem. It integrates **Agentic AI** for smart moderation and **Real-Time OLAP** tracking to provide deep behavioral analytics. The platform focuses on high-quality advertisement management and secure, identity-aware interactions between freelancers and recruiters.

---

## Features
* **Agentic AI Moderation:** Real-time policy violation detection using **LangGraph** and **Llama-Guard**.
* **Smart Ad Generation:** Local LLM integration with **Ollama** and cloud inference via **Groq**.
* **Real-Time Analytics:** Behavioral event tracking (clicks, hovers, CTR) using **Kafka** and **ClickHouse**.
* **Microservices Architecture:** Scalable services managed by **Eureka**
* **Secure Identity Flow:** Stateless authentication with **JWT propagation** and secure CRUD operations.

---

## Tech Stack

### Frontend
* **Framework:** Angular
* **Deployment:** GitHub Pages

### Backend
* **Framework:** Spring Boot 3.5.5
* **Microservices:** 
* **Messaging:** Apache Kafka

### Artificial Intelligence
* **Framework:** LangGraph (Agentic AI)
* **LLMs:** Ollama (Local/Fine-tuning), Groq (Cloud API)

### Infrastructure & Databases
* **Relational:** MySQL, PostgreSQL
* **OLAP:** ClickHouse (Analytics)
* **DevOps:** Docker, Kubernetes (K8s)

---

## Architecture
The system is divided into three main public repositories:
1.  **Backend:** Core business logic and AI integration.
2.  **Frontend:** Angular user interface.
3.  **Infrastructure:** Eureka Server and API Gateway.



---

## Academic Context
Developed at **Esprit School of Engineering – Tunisia** **PIDEV – 4SAE4 | 2025–2026**

### Mandatory Topics (Tags)
`esprit-school-of-engineering`, `academic-project`, `esprit-PIDEV`, `année-universitaire-2025-2026`, `springboot-3.5.5`, `angular`

---

## Getting Started

### Prerequisites
* Docker & Docker Compose
* Java 17+
* Node.js & Angular CLI

### Installation
1.  **Clone the project:**

2.  **Start Infrastructure:**
  * **Backend:**
    ```bash
    cd backend
    docker-compose up -d
    ```
    * **Frontend:**
    ```bash
    cd Frontend
    rm -rf node_modules package-lock.json
    npm cache clean --force
    npm install --legacy-peer-deps
    ```
3.  **Build and Run:**
    Use `./mvnw clean install` for backend services and `npx ng serve` for the frontend.

---

## Contributors
* **Ameni Guesmi**
* **Farah Chbeb**
* **Marah Mabrouk**
* **Yasmine Chakroun**
* **Farah Amami**
* **Fawzi Saidi**
---

## Acknowledgments
Special thanks to the teaching staff at **Esprit School of Engineering** for their support during the 2025–2026 academic year.
