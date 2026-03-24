# Telemetry Ingestion Service - Requirements

## 1. Functional Requirements

### 1.1 OTEL Data Ingestion
- **Endpoints:**
    - `POST /v1/traces`
    - `POST /v1/metrics`
    - `POST /v1/logs`
- **Supported Content Types:**
    - `application/json` (mandatory)
    - `application/x-protobuf` (optional, future)

### 1.2 Multi-Tenant Support
- **Required Header:** `x-api-key`
- **Mapping:** API key → Project → User
- **Attach Metadata:**
    - `projectId`
    - `service.name` (from OTEL payload)

### 1.3 Data Forwarding
- **Kafka Topics:**
    - `otel-traces`
    - `otel-metrics`
    - `otel-logs`
- **Preservation:** Original payload (minimal transformation)
- **Added Metadata:**
    - `receivedAt`
    - `region`
    - `apiKey`/`projectId`

### 1.4 Lightweight Validation
- Validate required headers
- Basic payload structure validation
- Return appropriate HTTP status codes

### 1.5 Authentication & Authorization
- API key-based authentication
- Key management: enable/disable, rotate
- Optional: Rate limiting per API key

### 1.6 Health & Readiness
- `GET /health`
- `GET /ready` (includes Kafka connectivity check)

---

## 2. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Throughput** | Thousands of requests/sec |
| **Latency** | < 50ms ingestion (excluding network) |
| **Scalability** | Horizontally scalable, Kubernetes-ready |
| **Reliability** | Zero data loss, Kafka retry logic |
| **Idempotency** | Optional (traceId + spanId deduplication) |

---

## 3. Security Requirements

- **TLS Enforcement:** HTTPS only
- **API Key Authentication:** Required for all ingestion endpoints
- **Rate Limiting:** Per-key limits (requests/sec, payload size)
- **Payload Limits:** Max 1–5 MB per request

---

## 4. Data Handling

- **Enrichment:** Add `receivedAt`, `ingestionRegion`, `projectId`
- **Kafka Partition Key:** `projectId + service.name`
- **Stream Processing:** Non-blocking for large batches

---

## 5. Observability

### Metrics
- Requests/sec
- Error rate
- Kafka publish latency
- Payload size distribution

### Logging
- Errors and rejected requests
- Kafka failures

### Tracing
- Instrument using OTEL (dogfooding)

---

## 6. Failure Handling

| Scenario | Response |
|----------|----------|
| **Invalid Payload** | `400 Bad Request` |
| **Unauthorized** | `401 Unauthorized` |
| **Kafka Failure** | Retry with fallback/buffer or fail request |

---

## 7. Performance Optimizations

- **Framework:** Fastify (not Express)
- **Features:** Keep-alive, compression (optional)
- **Avoid:** Deep JSON parsing, blocking operations

---

## 8. Future Requirements

- Protobuf support (full OTLP compatibility)
- Sampling (drop low-value telemetry)
- Smart routing (per project/region)
- Backpressure handling (Kafka overload → throttle)


---

