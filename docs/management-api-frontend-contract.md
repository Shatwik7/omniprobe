# Management API Frontend Contract

## 1) Overview

This document describes the current Management API behavior from the actual NestJS controllers/services and e2e tests.

- Service: Management API
- Main module: [apps/management-api/src/management-api.module.ts](apps/management-api/src/management-api.module.ts)
- Bootstrap: [apps/management-api/src/main.ts](apps/management-api/src/main.ts)
- Swagger UI: /api/doc
- Swagger JSON: /api/doc/json
- Global validation:
  - whitelist: true
  - forbidNonWhitelisted: true
  - transform: true
  - stopAtFirstError: true

Important implication: unknown body fields are rejected with 400, and DTO validation errors return 400.

---

## 2) Auth and Access Model

### 2.1 JWT auth

- Guard: [apps/management-api/src/auth/guards/jwt-auth.guard.ts](apps/management-api/src/auth/guards/jwt-auth.guard.ts)
- Strategy: [apps/management-api/src/auth/strategies/jwt.strategy.ts](apps/management-api/src/auth/strategies/jwt.strategy.ts)
- Token source: Authorization header as Bearer token

Expected header format:

- Authorization: Bearer <access_token>

If missing/invalid, protected endpoints return 401 Unauthorized.

### 2.2 Team membership auth

- Guard: [apps/management-api/src/auth/guards/teamMember.guard.ts](apps/management-api/src/auth/guards/teamMember.guard.ts)
- Applied on team-scoped routes.

Behavior:
- 400 Bad Request if teamId route param is missing/invalid UUID
- 403 Forbidden if authenticated user is not a creator/member of the team

### 2.3 Local login auth

- Guard: [apps/management-api/src/auth/guards/local-auth.guard.ts](apps/management-api/src/auth/guards/local-auth.guard.ts)
- Strategy: [apps/management-api/src/auth/strategies/local.strategy.ts](apps/management-api/src/auth/strategies/local.strategy.ts)

Behavior:
- Reads email/password from request body
- 401 Unauthorized if credentials are invalid

---

## 3) Shared Data Shapes (Response Entities)

These are common response shapes returned by services.

### User
Source: [libs/database/src/entity/user.entity.ts](libs/database/src/entity/user.entity.ts)

- id: string (uuid)
- email: string
- name: string
- createdAt: string (datetime)
- updatedAt: string (datetime)
- password is excluded from response

### Team
Source: [libs/database/src/entity/team.entity.ts](libs/database/src/entity/team.entity.ts)

- id: string (uuid)
- name: string
- createdAt: string (datetime)
- updatedAt: string (datetime)

### Project
Source: [libs/database/src/entity/project.entity.ts](libs/database/src/entity/project.entity.ts)

- id: string (uuid)
- name: string
- description: string | null
- createdAt: string (datetime)
- updatedAt: string (datetime)

### Monitor
Source: [libs/database/src/entity/monitor.entity.ts](libs/database/src/entity/monitor.entity.ts)

- id: string (uuid)
- name: string
- target: string (url)
- method: GET | POST | PATCH | DELETE | PUT
- frequencySeconds: number
- isLive: boolean
- isActive: boolean
- headers: object | null
- body: string | null
- maintencePeriods: array | null
- expectedStatus: number
- expectedBody: object | null
- createdAt: string (datetime)
- updatedAt: string (datetime)

### Metric
Source: [libs/database/src/entity/metric.entity.ts](libs/database/src/entity/metric.entity.ts)

- id: string (uuid)
- durationMs: number
- statusCode: number
- breakdown: object
- dns_response_time_ms: number
- tcp_connection_time_ms: number
- tls_handshake_time_ms: number
- time_to_first_byte_ms: number
- server_processing_time_ms: number
- content_transfer_time_ms: number
- total_time_ms: number
- region: NA | EU | IN | AU
- isSuccess: boolean
- responseBody: string (stored as create date column in current code)
- createdAt: string (datetime)

### Incident
Source: [libs/database/src/entity/incident.entity.ts](libs/database/src/entity/incident.entity.ts)

- id: string (uuid)
- status: OPEN | ACKNOWLEDGED | RESOLVED
- severity: CRITICAL | WARNING
- summary: string | null
- resolvedAt: string | null
- acknowledgedAt: string | null
- acknowledgedBy: User | null
- monitor: Monitor
- metric: Metric | null
- notifications: Notification[]
- startedAt: string (datetime)
- updatedAt: string (datetime)

### Notification
Source: [libs/database/src/entity/notification.entity.ts](libs/database/src/entity/notification.entity.ts)

- id: string (uuid)
- channel: string
- recipient: string
- status: PENDING | SENT | FAILED | SEEN
- incident: Incident | null
- message: string | null
- title: string | null
- sentAt: string (datetime)

### AlertPolicy
Source: [libs/database/src/entity/alert-policy.entity.ts](libs/database/src/entity/alert-policy.entity.ts)

- id: string (uuid)
- name: string
- rules: object
- notificationChannels: object | null
- createdAt: string (datetime)
- updatedAt: string (datetime)

---

## 4) DTO Contracts (Request Bodies)

### Auth

#### SignUpDto
Source: [apps/management-api/src/auth/dto/signup.dto.ts](apps/management-api/src/auth/dto/signup.dto.ts)

{
  "name": "string (required, non-empty)",
  "email": "string (required, email)",
  "password": "string (required, min length 6)"
}

#### SignInDto
Source: [apps/management-api/src/auth/dto/sign-in.dto.ts](apps/management-api/src/auth/dto/sign-in.dto.ts)

{
  "email": "string (required, email)",
  "password": "string (required, min length 6)"
}

#### SignInDtoResponse
Source: [apps/management-api/src/auth/dto/sign-in-response.dto.ts](apps/management-api/src/auth/dto/sign-in-response.dto.ts)

{
  "access_token": "string"
}

### Teams

#### CreateTeamDto
Source: [apps/management-api/src/teams/dto/create-team.dto.ts](apps/management-api/src/teams/dto/create-team.dto.ts)

{
  "name": "string (required)"
}

#### UpdateTeamDto
Source: [apps/management-api/src/teams/dto/update-team.dto.ts](apps/management-api/src/teams/dto/update-team.dto.ts)

Partial of CreateTeamDto.

### Projects

#### CreateProjectDto
Source: [apps/management-api/src/projects/dto/create-project.dto.ts](apps/management-api/src/projects/dto/create-project.dto.ts)

{
  "name": "string (required, min length 3)",
  "description": "string (required, max length 255)"
}

#### UpdateProjectDto
Source: [apps/management-api/src/projects/dto/update-project.dto.ts](apps/management-api/src/projects/dto/update-project.dto.ts)

Partial of CreateProjectDto.

### Monitors

#### CreateMonitorDto
Source: [apps/management-api/src/monitors/dto/create-monitor.dto.ts](apps/management-api/src/monitors/dto/create-monitor.dto.ts)

{
  "name": "string (required)",
  "target": "string (required, URL)",
  "method": "GET | POST | PATCH | DELETE | PUT",
  "frequencySeconds": "number (int)",
  "projectId": "string (uuid)",
  "alertPolicyId": "string (optional)"
}

#### UpdateMonitorDto
Source: [apps/management-api/src/monitors/dto/update-monitor.dto.ts](apps/management-api/src/monitors/dto/update-monitor.dto.ts)

Partial of CreateMonitorDto.

### Metrics

#### CreateMetricDto
Source: [apps/management-api/src/metrics/dto/create-metric.dto.ts](apps/management-api/src/metrics/dto/create-metric.dto.ts)

{
  "durationMs": "number (int)",
  "statusCode": "number (int)",
  "dns_response_time_ms": "number (int)",
  "tcp_connection_time_ms": "number (int)",
  "tls_handshake_time_ms": "number (int)",
  "time_to_first_byte_ms": "number (int)",
  "server_processing_time_ms": "number (int)",
  "content_transfer_time_ms": "number (int)",
  "total_time_ms": "number (int)",
  "region": "NA | EU | IN | AU",
  "isSuccess": "boolean",
  "monitorId": "string (uuid)"
}

#### UpdateMetricDto
Source: [apps/management-api/src/metrics/dto/update-metric.dto.ts](apps/management-api/src/metrics/dto/update-metric.dto.ts)

Partial of CreateMetricDto.

### Incidents

#### CreateIncidentDto
Source: [apps/management-api/src/incidents/dto/create-incident.dto.ts](apps/management-api/src/incidents/dto/create-incident.dto.ts)

{
  "status": "OPEN | ACKNOWLEDGED | RESOLVED",
  "severity": "CRITICAL | WARNING",
  "summary": "string",
  "resolvedAt": "Date (optional)",
  "acknowledgedAt": "Date (optional)",
  "startedAt": "Date (optional)",
  "acknowledgedBy": "string (uuid, optional)",
  "monitorId": "string (uuid)",
  "notifications": "string[]"
}

#### UpdateIncidentDto
Source: [apps/management-api/src/incidents/dto/update-incident.dto.ts](apps/management-api/src/incidents/dto/update-incident.dto.ts)

Partial of CreateIncidentDto.

### Notifications

#### CreateNotificationDto
Source: [apps/management-api/src/notifications/dto/create-notification.dto.ts](apps/management-api/src/notifications/dto/create-notification.dto.ts)

{
  "channel": "string",
  "recipient": "string",
  "status": "string (optional)",
  "incidentId": "string (uuid)"
}

#### UpdateNotificationDto
Source: [apps/management-api/src/notifications/dto/update-notification.dto.ts](apps/management-api/src/notifications/dto/update-notification.dto.ts)

Empty DTO (no fields currently defined).

### Alert policy

#### CreateAlertPolicyDto
Source: [apps/management-api/src/alert-policy/dto/create-alert-policy.dto.ts](apps/management-api/src/alert-policy/dto/create-alert-policy.dto.ts)

Empty DTO (no fields currently defined).

#### UpdateAlertPolicyDto
Source: [apps/management-api/src/alert-policy/dto/update-alert-policy.dto.ts](apps/management-api/src/alert-policy/dto/update-alert-policy.dto.ts)

Empty DTO (no fields currently defined).

---

## 5) Endpoint-by-Endpoint Contract

## 5.1 Auth + Users
Controller: [apps/management-api/src/users/users.controller.ts](apps/management-api/src/users/users.controller.ts)

### POST /signup
- Auth: Public
- Body: SignUpDto
- Success:
  - 201 Created
  - Body: Partial User (without password)
- Errors:
  - 400 validation errors
  - 401 when email already exists (message: User already exists)

### POST /signin
- Auth: LocalAuthGuard (email/password)
- Body: SignInDto
- Success:
  - 201 Created
  - Body: SignInDtoResponse
- Errors:
  - 401 invalid credentials

### GET /
- Auth: Public in current code
- Query:
  - take: number (ParseIntPipe), default 10
  - skip: number (ParseIntPipe), default 0
- Success:
  - 200 OK
  - Body: currently undefined due to service bug in findAll implementation
- Errors:
  - 403 if take > 100
  - 400 if take/skip are not numeric

### GET /me
- Auth: JWT
- Success:
  - 200 OK
  - Body: User
- Errors:
  - 401 invalid/missing token

### GET /users/:id
- Auth: Public in current code
- Params:
  - id: uuid
- Success:
  - 200 OK
  - Body: User | null
- Errors:
  - 400 invalid UUID

### PATCH /users/:id
- Auth: Public in current code
- Body: UpdateUserDto
- Success:
  - 200 OK
  - Body text: This action updates a #NaN user (placeholder implementation)

### DELETE /users/:id
- Auth: Public in current code
- Success:
  - 200 OK
  - Body: "true" or "false" (stringified boolean)

## 5.2 Teams
Controller: [apps/management-api/src/teams/teams.controller.ts](apps/management-api/src/teams/teams.controller.ts)

### POST /teams
- Auth: JWT
- Body: CreateTeamDto
- Success:
  - 201 Created
  - Body: Team
- Errors:
  - 401 invalid/missing token
  - 400 validation

### GET /teams
- Auth: JWT
- Success:
  - 200 OK
  - Body:
    {
      "Teams": Team[],
      "Count": number
    }
- Errors:
  - 401 invalid/missing token

### GET /teams/:id
- Auth: JWT
- Params: id uuid
- Success: 200 with Team | null
- Errors:
  - 401 invalid/missing token
  - 400 invalid UUID

### PUT /teams/:id/addUser
- Auth: JWT
- Body: UpdateTeamDto (partial)
- Success:
  - 200 OK
  - Body: TypeORM UpdateResult (example has affected: 1)

### DELETE /teams/:id
- Auth: JWT
- Success:
  - 200 OK
  - Body: "true" or "false"

## 5.3 Projects
Controller: [apps/management-api/src/projects/projects.controller.ts](apps/management-api/src/projects/projects.controller.ts)

Base path: /teams/:teamId/projects

All endpoints are JWT + TeamMemberGuard.

### POST /teams/:teamId/projects
- Body: CreateProjectDto
- Success:
  - 201 Created
  - Body: Project
- Errors:
  - 401 unauthorized
  - 403 not a team member
  - 400 validation / invalid UUID

### GET /teams/:teamId/projects
- Success:
  - 200 OK
  - Body: Project[]

### GET /teams/:teamId/projects/:id
- Success:
  - 200 OK
  - Body: Project (includes selected team and monitors relations)
- Errors:
  - 404 Project not found

### PATCH /teams/:teamId/projects/:id
- Body: UpdateProjectDto
- Success:
  - 200 OK
  - Body text: This action updates a #NaN project (placeholder)

### DELETE /teams/:teamId/projects/:id
- Success:
  - 200 OK
  - Body: "true" or "false"
- Errors:
  - 401 if not owner when deleting existing project

## 5.4 Monitors
Controller: [apps/management-api/src/monitors/monitors.controller.ts](apps/management-api/src/monitors/monitors.controller.ts)

Base path: /teams/:teamId/projects/:projectId/monitors

All endpoints are JWT, and all handlers apply TeamMemberGuard.

### POST /teams/:teamId/projects/:projectId/monitors
- Body: CreateMonitorDto
- Success:
  - 201 Created
  - Body: Monitor

### GET /teams/:teamId/projects/:projectId/monitors
- Success:
  - 200 OK
  - Body: Monitor[] (selected fields)

### GET /teams/:teamId/projects/:projectId/monitors/:id
- Success:
  - 200 OK
  - Body: Monitor | null (includes project and alertPolicy selected fields)

### PATCH /teams/:teamId/projects/:projectId/monitors/:id
- Body: UpdateMonitorDto
- Success:
  - 200 OK
  - Body: updated Monitor | null

### DELETE /teams/:teamId/projects/:projectId/monitors/:id
- Success:
  - 200 OK
  - Body: "true" or "false"

## 5.5 Metrics (includes long polling)
Controller: [apps/management-api/src/metrics/metrics.controller.ts](apps/management-api/src/metrics/metrics.controller.ts)

Base path: /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics

All endpoints are JWT; create/findAll/poll also require TeamMemberGuard.

### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics
- Body: CreateMetricDto
- Success:
  - 201 Created
  - Body: Metric
- Side-effect:
  - Publishes update into long polling channel by monitorId

### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics
- Query params:
  - beginDate: ISO string/date
  - endDate: ISO string/date
  - region: string
- Success:
  - 200 OK
  - Body: Metric[]
- Errors:
  - 406 if monitor does not belong to project

### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/poll
- Purpose: long-poll endpoint for near-real-time metric updates
- Success:
  - 200 OK
  - Body: update payload published by POST metrics (CreateMetricDto-like object)
- Errors:
  - 404 Long polling timed out
  - 406 if monitor does not belong to project

### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id
- Success: 200 with Metric | null

### PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id
- Body: UpdateMetricDto
- Success: 200 with updated Metric | null

### DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id
- Success: 200 with "true" or "false"

## 5.6 Incidents
Controller: [apps/management-api/src/incidents/incidents.controller.ts](apps/management-api/src/incidents/incidents.controller.ts)

Base path: /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents

All endpoints are JWT. All handlers use TeamMemberGuard.

### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents
- Body: CreateIncidentDto
- Success: 201 with Incident

### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents
- Success: 200 with Incident[]

### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id
- Success: 200 with Incident | null (includes acknowledgedBy, monitor, metric, notifications)

### PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id
- Body: UpdateIncidentDto
- Success:
  - 200 with text: This action updates a #NaN incident (placeholder)

### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/acknowledge
- Body (optional):
  {
    "userId": "uuid (optional)"
  }
- Success: 200 with UpdateResult
- Effect:
  - status -> ACKNOWLEDGED
  - acknowledgedAt set
  - acknowledgedBy set from body.userId or token user

### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/resolve
- Success: 200 with UpdateResult
- Effect:
  - status -> RESOLVED
  - resolvedAt set

### DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id
- Success: 200 with "true" or "false"

## 5.7 Notifications
Controller: [apps/management-api/src/notifications/notifications.controller.ts](apps/management-api/src/notifications/notifications.controller.ts)

Base path: /teams/:teamId/projects/:projectId/notifications

All endpoints use JWT + TeamMemberGuard.

Current implementation status:
- Methods are scaffold placeholders that return strings, not real Notification entities.

### POST /teams/:teamId/projects/:projectId/notifications
- Body: CreateNotificationDto
- Success: 201 with text message placeholder

### GET /teams/:teamId/projects/:projectId/notifications
- Success: 200 with text placeholder

### GET /teams/:teamId/projects/:projectId/notifications/:id
- Success: 200 with text placeholder

### PATCH /teams/:teamId/projects/:projectId/notifications/:id
- Body: UpdateNotificationDto (empty)
- Success: 200 with text placeholder

### DELETE /teams/:teamId/projects/:projectId/notifications/:id
- Success: 200 with text placeholder

## 5.8 Alert Policy
Controller: [apps/management-api/src/alert-policy/alert-policy.controller.ts](apps/management-api/src/alert-policy/alert-policy.controller.ts)

Base path: /alert-policy

All endpoints use JWT + TeamMemberGuard.

Current implementation status:
- Methods are scaffold placeholders that return strings, not real AlertPolicy entities.

### POST /alert-policy
- Body: CreateAlertPolicyDto (empty)
- Success: 201 with text placeholder

### GET /alert-policy
- Success: 200 with text placeholder

### GET /alert-policy/:id
- Success: 200 with text placeholder

### PATCH /alert-policy/:id
- Body: UpdateAlertPolicyDto (empty)
- Success: 200 with text placeholder

### DELETE /alert-policy/:id
- Success: 200 with text placeholder

---

## 6) Long Polling Details (Frontend Integration)

Long polling component exists in metrics flow:

- Controller usage: [apps/management-api/src/metrics/metrics.controller.ts](apps/management-api/src/metrics/metrics.controller.ts)
- Service implementation: [libs/common/src/long-polling/long-polling.service.ts](libs/common/src/long-polling/long-polling.service.ts)
- Module wiring: [apps/management-api/src/metrics/metrics.module.ts](apps/management-api/src/metrics/metrics.module.ts)

### Flow
1. Frontend calls GET /metrics/poll for a monitor.
2. Backend waits up to 30 seconds for update (Redis pub/sub channel updates:monitor:{monitorId}).
3. If metric POST arrives, backend responds 200 immediately with payload.
4. If timeout, backend responds 404 with message Long polling timed out.

### Frontend recommended polling pattern
- Issue poll request immediately after previous poll resolves.
- On 200: process payload and instantly reconnect.
- On 404 timeout: reconnect immediately (or with tiny backoff).
- On 401/403: stop polling and re-auth/re-authorize.
- On 406: monitor/project mismatch; refresh selected monitor context.

---

## 7) Known Contract Gaps / Caveats (Important for frontend)

1. Placeholder endpoints
- Users PATCH, Projects PATCH, Incidents PATCH return placeholder text strings.
- Notifications and AlertPolicy modules are scaffold responses (string messages only).

2. Boolean responses are plain text
- Several DELETE endpoints return "true" / "false" text instead of JSON boolean.

3. Root GET /
- Current users list endpoint uses take/skip validation but service returns undefined.

4. Inconsistent route auth
- Some user routes are public in current code (GET /users/:id, PATCH/DELETE /users/:id, GET /).
- If frontend assumes strict auth everywhere, align with backend team before production.

5. UUID casting issues in placeholders
- Some patch handlers cast uuid to number internally, causing placeholder text with NaN.

---

## 8) Error Envelope Reference

Typical Nest error format:

{
  "statusCode": 400,
  "message": ["validation message"],
  "error": "Bad Request"
}

Other common statuses in this API:
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 406 Not Acceptable

---

## 9) Quick Frontend Checklist

- Use Bearer token for all protected endpoints.
- Treat DELETE responses as text values "true" / "false".
- For long polling, use GET /metrics/poll loop with timeout retry.
- Handle placeholder endpoints as temporary contracts (string responses).
- Validate UUID route params client-side to reduce 400s.
- For team-scoped routes, expect 403 if user is not in team.

---

## 10) Source Index

Controllers:
- [apps/management-api/src/users/users.controller.ts](apps/management-api/src/users/users.controller.ts)
- [apps/management-api/src/teams/teams.controller.ts](apps/management-api/src/teams/teams.controller.ts)
- [apps/management-api/src/projects/projects.controller.ts](apps/management-api/src/projects/projects.controller.ts)
- [apps/management-api/src/monitors/monitors.controller.ts](apps/management-api/src/monitors/monitors.controller.ts)
- [apps/management-api/src/metrics/metrics.controller.ts](apps/management-api/src/metrics/metrics.controller.ts)
- [apps/management-api/src/incidents/incidents.controller.ts](apps/management-api/src/incidents/incidents.controller.ts)
- [apps/management-api/src/notifications/notifications.controller.ts](apps/management-api/src/notifications/notifications.controller.ts)
- [apps/management-api/src/alert-policy/alert-policy.controller.ts](apps/management-api/src/alert-policy/alert-policy.controller.ts)

DTOs:
- [apps/management-api/src/auth/dto](apps/management-api/src/auth/dto)
- [apps/management-api/src/teams/dto](apps/management-api/src/teams/dto)
- [apps/management-api/src/projects/dto](apps/management-api/src/projects/dto)
- [apps/management-api/src/monitors/dto](apps/management-api/src/monitors/dto)
- [apps/management-api/src/metrics/dto](apps/management-api/src/metrics/dto)
- [apps/management-api/src/incidents/dto](apps/management-api/src/incidents/dto)
- [apps/management-api/src/notifications/dto](apps/management-api/src/notifications/dto)
- [apps/management-api/src/alert-policy/dto](apps/management-api/src/alert-policy/dto)

Entities:
- [libs/database/src/entity](libs/database/src/entity)

E2E behavior references:
- [apps/management-api/test/users.e2e-spec.ts](apps/management-api/test/users.e2e-spec.ts)
- [apps/management-api/test/teams.e2e-spec.ts](apps/management-api/test/teams.e2e-spec.ts)
- [apps/management-api/test/projects.e2e-spec.ts](apps/management-api/test/projects.e2e-spec.ts)
- [apps/management-api/test/monitors.e2e-spec.ts](apps/management-api/test/monitors.e2e-spec.ts)
- [apps/management-api/test/metrics.e2e-spec.ts](apps/management-api/test/metrics.e2e-spec.ts)
- [apps/management-api/test/incidents.e2e-spec.ts](apps/management-api/test/incidents.e2e-spec.ts)
