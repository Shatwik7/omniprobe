# 🌐 Omniprobe
Omniprobe is a high-performance, multi-regional observability platform designed for modern HTTP/HTTPS ecosystems. It unifies API monitoring, SLA enforcement, real-time analytics, andomaly detection, and incident management into a single, scalable microservices architecture.

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

> **Monorepo layout:** services live under `apps/`; shared code lives under `libs/`.

> **Note:** This repository follows a monorepo structure. Microservices are located in `apps/`, while shared logic and entities reside in `libs/`.

🧠 **High‑Level Design**
<img src="https://drive.google.com/uc?export=view&id=1SaIrmIe6lNAAUrRzqkxmuFHBkSJuWBYI" width="100%" height="400">

<img src="https://drive.google.com/uc?export=view&id=1WR3ipwB4wRDsNqEKQtQXgwifpEXVIzGI" width="100%" height="900">

The platform is composed of a set of small, focused services that communicate via Kafka and REST. Each numbered component below maps to a microservice in `apps/` or a shared library:

1. **Management API (Control Plane)**
   - Central interface consumed by the React frontend client.
   - Responsibilities: authentication/authorization, monitor & alert policy configuration, incident tracking, metrics querying, and long‑polling APIs for real‑time updates.
   - Communicates with PostgreSQL (persistent data), Redis (caching) and Kafka (event production).

2. **Distributed Scheduler** (`scheduler-service`)
   - Orchestrates monitoring tasks across regions.
   - scheduler accuries lock to populate the Redis Sorted Set.
   - Maintains a schedule in Redis sorted sets (ZSET) keyed by `nextCheckTime`.
   - Uses Redis distributed locks to ensure a single scheduler instance performs work.

3. **Regional Worker Services** (`worker-service`)
   - Deployed in multiple geographic regions (NA, EU, IN, AU, etc.).
   - Consume check‑execution events from Kafka and perform HTTP/HTTPS requests.
   - Record detailed telemetry (DNS, TCP, TLS, TTFB, server processing, transfer time).
   - Produce execution results back to Kafka within an instrumented HTTP client.

4. **Ingest Service** (`ingest-service`)
   - Processes execution results from workers.
   - Persists metrics to PostgreSQL time‑series tables (using time‑series extension).
   - Detects failures and creates incidents for failed checks.
   - Forwards metrics to the Alert Engine for evaluation and generates analytics events.

5. **Alert Engine** (`alert-engine`)
   - Evaluates incoming metrics against alert policies.
   - Performs real‑time analytics and anomaly detection (jitter, component degradation, SLA violation).
   - Supports preemptive alerting (predictive models), jitter detection, and degradation analysis.
   - Triggers alerts and incidents when conditions (latency thresholds, error rates, anomaly scores) are met.

6. **Notification Service** (`notification-service`)
   - Dispatches alert/incident notifications to various channels: webhooks, phone calls, SMS, email, Slack.
   - Consumes notification events from Kafka and handles retries/failures.

7. **Storage Layer**
   - **PostgreSQL**: time‑series optimized tables store metrics, incidents, monitors, alert policies, users, etc.
   - **Redis**: distributed locks, scheduling queues (ZSETs), caching, and cross-service coordination.

Each service has its own `tsconfig.app.json` and tests; build outputs are placed under `build/`.

---

#### Architecture Characteristics

- **Event‑Driven** – Kafka topics decouple services and allow horizontal scaling.
- **Multi‑Regional Monitoring** – Workers simulate global user traffic; scheduling is federated.
- **Distributed Scheduling** – Redis locks and sorted sets ensure only one scheduler runs per region.
- **Real‑Time Analytics** – The Alert Engine processes metrics immediately upon arrival.
- **Incident‑Driven Workflow** – Failures automatically generate incidents, which in turn trigger notifications.

---

### 🛠 Getting Started

#### Prerequisites
- Node.js v24
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
