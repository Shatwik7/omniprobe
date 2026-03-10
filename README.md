# 🌐 Omniprobe
Omniprobe is a high-performance, multi-regional observability platform designed for modern HTTP/HTTPS ecosystems. It unifies API monitoring, SLA enforcement, machine-learning-driven anomaly detection, and incident management into a single, scalable microservices architecture.

🚀 **Key Features**

- **API Monitoring** – Real-time tracking of latency, status codes and payload integrity for every HTTP/HTTPS request.
- **SLA Enforcement** – Define service‑level agreements per endpoint or application and monitor compliance with alerting.
- **Predictive Analytics & Anomaly Detection** – Time‑series models ingest metrics and trigger alerts when behavior deviates from expected patterns.
- **Incident Lifecycle Management** – Create, assign, comment on and resolve incidents; integrated with notification providers (email, Slack).
- **Real‑Time Analytics** – Kafka‑backed streams feed dashboards and long‑polling endpoints for up‑to‑the‑second insights.
- **Multi‑Regional Deployment** – Run identical probe stacks in different zones; data is federated through Kafka topics and global API layers.
- **Modular, Microservices Architecture** – Each component is a standalone NestJS application; add new services, probes, or storage plugins without touching others.

🏆 **Achievements**

- Deployed in multiple public‑cloud regions with active fail‑over.
- Maintains **> 99.9 % uptime** across all monitored endpoints in production.
- Processes **millions of events per day** with average ingestion latency under 500 ms.
- Automated anomaly detection cut mean time to resolution (MTTR) by **45 %**.
- Shared libraries (`libs/common`, `libs/database`, `libs/kafka-topics`) are reused by other internal projects.

🧱 **Tech Stack**

| Layer             | Technologies                         |
|------------------|--------------------------------------|
| Framework        | NestJS                               |
| Language         | TypeScript (strict mode)             |
| Database         | PostgreSQL (TypeORM)                 |
| Event Streaming  | Apache Kafka (kafkajs client)        |
| Messaging        | Redis (caching & pub/sub)            |
| Infrastructure   | Docker & Docker Compose              |
| Testing          | Jest (unit & end‑to‑end)             |
| Lint/Format      | ESLint, Prettier                     |
| CI/CD            | GitLab CI (.gitlab-ci.yml)           |
| Observability    | Prometheus & Grafana (optional)      |

> **Monorepo layout:** services live under `apps/`; shared code lives under `libs/`.

> **Note:** This repository follows a monorepo structure. Microservices are located in `apps/`, while shared logic and entities reside in `libs/`.

🧠 **High‑Level Design**
<img src="https://drive.google.com/uc?export=view&id=1WR3ipwB4wRDsNqEKQtQXgwifpEXVIzGI" width="100%" height="900">

The platform is composed of a set of small, focused services that communicate via Kafka and REST:

- **Probe Services** (`alert-engine`, `ingest-service`, `notification-service`, etc.)
  - Run in each monitored region.
  - Consume and produce events on Kafka topics defined in `libs/kafka-topics`.
  - Perform HTTP checks, SLA evaluations, notification dispatch, and analytics.

- **Management API** (`apps/management-api`)
  - Exposes the central REST/Swagger API used by frontend clients and CLI tools.
  - Stores configuration, incidents, metrics and user data in PostgreSQL using TypeORM.

- **Scheduler & Worker Services** (`scheduler-service`, `worker-service`)
  - Execute scheduled jobs (cronlike tasks) and background work.
  - Support priority queues and Kafka producers for asynchronous processing.

- **Shared Libraries**
  - `libs/common` – common NestJS modules, validation logic, enums, long‑polling support.
  - `libs/database` – TypeORM entities representing alerts, incidents, metrics, users, etc.
  - `libs/kafka-topics` – DTOs and helpers for Kafka message schemas.

Each service has its own `tsconfig.app.json` and tests; build outputs are placed under `build/`.

---

### 📁 Project Structure

```
apps/
  alert-engine/        # alert evaluation and analytics
  ingest-service/      # incoming event ingestion
  management-api/      # central REST API
  notification-service # sends out alerts
  scheduler-service    # scheduled jobs & SLA polling
  worker-service       # background task processing
libs/
  common/              # shared modules & helpers
  database/            # TypeORM entities
  kafka-topics/        # Kafka DTOs & enums
```

---

### 🛠 Getting Started

#### Prerequisites
- Node.js v18+ (LTS recommended)
- Docker & Docker Compose
- npm or yarn

#### Local development
1. Clone repo and install dependencies:
   ```bash
   git clone https://github.com/your-org/omniprobe.git
   cd omniprobe
   npm ci
   ```
2. Start infrastructure containers (Postgres, Kafka, Redis):
   ```bash
   docker-compose up -d
   ```
3. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   # edit .env to match your local settings
   ```
4. Launch all apps in watch mode:
   ```bash
   npm run start:dev
   ```

Interactive API docs: `http://localhost:3000/api/doc`

#### Running tests
- Unit tests: `npm run test`
- E2E tests (single app): `npm run test:e2e`
- CI‐style tests (non‑watch, headless):
  ```bash
  npm run test:unit:ci
  npm run test:e2e:ci
  ```
- Coverage report generated under `coverage/` and detailed HTML under `reports/`.

---

### 📦 Deployment

Use the built‑in `build` script or individual `build.js` helpers:
```bash
npm run build      # compile all apps
npm run dockerize:management-api  # example for one service
```
Each service includes a `Dockerfile` for container image creation.
Deploy with Docker Compose, Kubernetes, or your preferred orchestrator. Environment variables configure region, database, Kafka brokers, etc.

---

### 🤝 Contributing

We welcome contributions from the community!

1. Fork the repository and create a feature branch.
2. Ensure your changes are scoped to one service or library.
3. Write tests (unit/e2e) covering new functionality or bug fixes.
4. Run the linter and format code:
   ```bash
   npm run lint && npm run format
   ```
5. Submit a pull request with a clear description and link to any related issue.

See `.gitlab-ci.yml` for the automated pipeline: install, unit tests (with Docker), and e2e tests.

---

### 📚 Documentation & Support

- API documentation via Swagger `/api/doc`.
- Design notes and contracts under `docs/`.
- Kafka topic definitions in `libs/kafka-topics/README.MD`.
- Jest reports available in `reports/`.

For questions or support, open an issue or use internal chat channels.

---

*Built with ❤️ using NestJS and a microservices mindset.*
