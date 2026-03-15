# Management API Client REST Contract

## Overview

This document is the client-facing REST API reference for the Management API in `apps/management-api`.

It is based on the current NestJS controllers, DTOs, services, and e2e coverage in the repository.

Base assumptions:

- Base URL: `http://<host>:<port>`
- Default local port: `3000`
- Swagger UI: `/api/doc`
- Swagger JSON: `/api/doc/json`

Global request validation:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`
- `stopAtFirstError: true`

Practical effect for clients:

- Unknown request body fields are rejected with `400 Bad Request`
- Invalid DTO fields are rejected with `400 Bad Request`

## Authentication And Authorization

### Bearer token

Protected routes expect:

```http
Authorization: Bearer <access_token>
```

If the token is missing or invalid, the API returns `401 Unauthorized`.

### Guards used by the API

- `JwtAuthGuard`: requires a valid authenticated user
- `TeamMemberGuard`: requires the authenticated user to belong to the team in `:teamId`

### Ownership rules

The following ownership rules are currently enforced:

- Team creator (`team.createdBy`) is the only user allowed to:
  - add members to a team
  - remove members from a team
  - rename a team through the update route
  - delete a team
  - create projects in that team
  - remove projects from that team
- The team creator cannot remove themselves from the team
- Regular team members can still access team-scoped resources guarded by `TeamMemberGuard`, but they cannot perform owner-only operations above

## Shared Response DTOs

These are the main response shapes returned by the API.

### `User`

```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

Notes:

- `password` is never exposed in responses

### `SignInDtoResponse`

```json
{
  "access_token": "jwt-string"
}
```

### `Team`

Typical response shape:

```json
{
  "id": "uuid",
  "name": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "createdBy": {
    "id": "uuid",
    "name": "string",
    "email": "string"
  },
  "members": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string"
    }
  ]
}
```

### `TeamListResponse`

```json
{
  "Teams": ["Team"],
  "Count": 1
}
```

### `Project`

Typical response shape:

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### `Monitor`

```json
{
  "id": "uuid",
  "name": "string",
  "target": "https://example.com",
  "method": "GET",
  "frequencySeconds": 60,
  "isLive": true,
  "isActive": true,
  "headers": {},
  "body": "",
  "maintencePeriods": [],
  "expectedStatus": 200,
  "expectedBody": null,
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### `Metric`

```json
{
  "id": "uuid",
  "durationMs": 120,
  "statusCode": 200,
  "breakdown": {
    "dns": 5,
    "tcp": 10,
    "tls": 15,
    "ttfb": 30,
    "spt": 35,
    "ctt": 25
  },
  "dns_response_time_ms": 5,
  "tcp_connection_time_ms": 10,
  "tls_handshake_time_ms": 15,
  "time_to_first_byte_ms": 30,
  "server_processing_time_ms": 35,
  "content_transfer_time_ms": 25,
  "total_time_ms": 120,
  "region": "IN",
  "isSuccess": true,
  "responseBody": "optional",
  "createdAt": "datetime"
}
```

### `Alert`

```json
{
  "id": "uuid",
  "type": "ANOMALY",
  "message": "string",
  "metadata": {},
  "monitor": { "id": "uuid" },
  "metric": { "id": "uuid" },
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### `Analytics`

```json
{
  "id": "uuid",
  "monitor": { "id": "uuid" },
  "region": "EU",
  "rollingAverage": 120.5,
  "rollingStdDev": 15.2,
  "variance": 231.04,
  "p95": 180,
  "p99": 210,
  "anomalyDetected": false,
  "degradingComponent": null,
  "networkRatio": 0.4,
  "backendRatio": 0.6,
  "forecast": {
    "totalPrediction": [125, 130],
    "confidenceUpper": [140, 145],
    "confidenceLower": [110, 115]
  },
  "predictedSlaBreach": false,
  "errorRate": 0.02,
  "trend": "stable",
  "recentMetrics": [],
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### `MonitorAvailability`

```json
{
  "availability": 99.97,
  "downtime": 30000
}
```

Notes:

- `availability` is a percentage from `0` to `100`
- `downtime` is returned in milliseconds

### `Incident`

```json
{
  "id": "uuid",
  "status": "OPEN",
  "severity": "CRITICAL",
  "summary": "string",
  "resolvedAt": null,
  "acknowledgedAt": null,
  "startedAt": "datetime",
  "acknowledgedBy": { "id": "uuid" },
  "monitor": { "id": "uuid" },
  "metric": null,
  "updatedAt": "datetime"
}
```

### `Notification`

```json
{
  "id": "uuid",
  "channel": "SLACK",
  "address": "#alerts",
  "status": "PENDING",
  "message": "string",
  "title": "string",
  "sentAt": "datetime"
}
```

### `AlertPolicy`

```json
{
  "id": "uuid",
  "name": "string",
  "rules": {},
  "notificationChannels": [],
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Common delete responses

Different modules return different delete responses:

- plain boolean: `true` / `false`
- object response for alerts: `{ "deleted": true }`

### Long-poll timeout responses

- Alerts `/poll`: `404 Not Found` with timeout message
- Analytics `/poll`: `404 Not Found` with timeout message
- Metrics `/poll`: `404 Not Found` with timeout message
- Notifications `/poll`: returns `200 OK` with `null` on timeout

## Request DTOs

### Auth DTOs

#### `SignUpDto`

```json
{
  "name": "string, required",
  "email": "string, required, valid email",
  "password": "string, required, min length 6"
}
```

#### `SignInDto`

```json
{
  "email": "string, required, valid email",
  "password": "string, required, min length 6"
}
```

### Teams DTOs

#### `CreateTeamDto`

```json
{
  "name": "string, required"
}
```

#### `UpdateTeamDto`

```json
{
  "name": "string, optional",
  "addUserId": "uuid, optional",
  "removeUserId": "uuid, optional"
}
```

Rules:

- send only one of `addUserId` or `removeUserId` in the same request
- `removeUserId` cannot be the team creator's own user id

### Projects DTOs

#### `CreateProjectDto`

```json
{
  "name": "string, required, min length 3",
  "description": "string, required, max length 255"
}
```

#### `UpdateProjectDto`

Partial of `CreateProjectDto`.

Note:

- `PATCH /teams/:teamId/projects/:id` is currently still a placeholder implementation and returns a string response instead of updating the record.

### Monitors DTOs

#### `CreateMonitorDto`

```json
{
  "name": "string, required",
  "target": "string, required, valid URL",
  "method": "GET | POST | PATCH | DELETE | PUT",
  "frequencySeconds": "integer, required, min 1",
  "isLive": "boolean, optional, default true",
  "isActive": "boolean, optional, default true",
  "headers": "object, optional",
  "body": "string, optional",
  "maintencePeriods": "array<object> | null, optional",
  "expectedStatus": "integer, optional",
  "expectedBody": "object, optional",
  "projectId": "uuid, required",
  "alertPolicyId": "uuid, optional"
}
```

#### `UpdateMonitorDto`

Partial of `CreateMonitorDto`.

Common update use cases:

- pause/enable monitor with `isActive`
- switch runtime behavior with `headers`, `body`, `method`
- change expectations with `expectedStatus` and `expectedBody`
- adjust maintenance windows with `maintencePeriods`

### Metrics DTOs

#### `CreateMetricDto`

```json
{
  "durationMs": "integer",
  "statusCode": "integer",
  "dns_response_time_ms": "integer",
  "tcp_connection_time_ms": "integer",
  "tls_handshake_time_ms": "integer",
  "time_to_first_byte_ms": "integer",
  "server_processing_time_ms": "integer",
  "content_transfer_time_ms": "integer",
  "total_time_ms": "integer",
  "region": "NA | EU | IN | AU",
  "isSuccess": "boolean",
  "monitorId": "uuid"
}
```

#### `UpdateMetricDto`

Partial of `CreateMetricDto`.

### Alerts DTOs

#### `CreateAlertDto`

```json
{
  "type": "ANOMALY | SLA_BREACH | ERROR_RATE | DEGRADATION",
  "message": "string, required",
  "metadata": "object, optional",
  "monitorId": "uuid, required",
  "metricId": "uuid, optional"
}
```

#### `UpdateAlertDto`

Partial of `CreateAlertDto`.

### Analytics DTOs

#### `CreateAnalyticsDto`

```json
{
  "monitorId": "uuid, required",
  "region": "string, required",
  "rollingAverage": "number, optional",
  "rollingStdDev": "number, optional",
  "variance": "number, optional",
  "p95": "number, optional",
  "p99": "number, optional",
  "anomalyDetected": "boolean, optional",
  "degradingComponent": "string | null, optional",
  "networkRatio": "number, optional",
  "backendRatio": "number, optional",
  "forecast": {
    "totalPrediction": ["number"],
    "confidenceUpper": ["number"],
    "confidenceLower": ["number"]
  },
  "predictedSlaBreach": "boolean, optional",
  "errorRate": "number, optional",
  "trend": "string, optional",
  "recentMetrics": []
}
```

#### `UpdateAnalyticsDto`

Partial of `CreateAnalyticsDto`.

### Incident DTOs

#### `CreateIncidentDto`

```json
{
  "status": "OPEN | ACKNOWLEDGED | RESOLVED",
  "severity": "CRITICAL | WARNING",
  "summary": "string, required",
  "resolvedAt": "Date, optional",
  "acknowledgedAt": "Date, optional",
  "startedAt": "Date, optional",
  "acknowledgedBy": "uuid, optional",
  "monitorId": "uuid, required",
  "notifications": ["string"]
}
```

#### `UpdateIncidentDto`

Partial of `CreateIncidentDto`.

Note:

- `PATCH /incidents/:id` is currently a placeholder implementation and returns a string response instead of updating the record.

### Notification DTOs

#### `CreateNotificationDto`

```json
{
  "channel": "string, required",
  "address": "string, required",
  "status": "string, optional",
  "incidentId": "uuid, optional",
  "alertId": "uuid, optional",
  "message": "string, optional",
  "title": "string, optional",
  "projectId": "uuid, required"
}
```

#### `UpdateNotificationDto`

Partial of `CreateNotificationDto`.

### Alert Policy DTOs

#### `CreateAlertPolicyDto`

```json
{
  "name": "string, required",
  "rules": {
    "version": "1.0",
    "rules": [
      {
        "metric": "string",
        "operator": "> | < | = | >= | <=",
        "threshold": "number | boolean",
        "window": "string, optional"
      }
    ],
    "logic": "AND | OR",
    "actions": ["string"],
    "suppression": {
      "cooldown": "string, optional",
      "maintenance": [
        {
          "start": "string",
          "end": "string"
        }
      ]
    }
  },
  "notificationChannels": [
    {
      "channelType": "slack | email | phone | webhook | sms | push | whatsapp",
      "address": "string"
    }
  ]
}
```

#### `UpdateAlertPolicyDto`

Partial of `CreateAlertPolicyDto`.

### User DTOs

#### `UpdateUserDto`

Partial of `CreateUserDto`.

Note:

- `PATCH /users/:id` is currently a placeholder implementation and returns a string response instead of updating the record.

## Endpoint Reference

## Users

### `POST /signup`

- Auth: none
- Body: `SignUpDto`
- Response: `User` (partial, without password)
- Status codes:
  - `201 Created`
- What it does:
  - registers a new user account

### `POST /signin`

- Auth: `LocalAuthGuard`
- Body: `SignInDto`
- Response: `SignInDtoResponse`
- Status codes:
  - `201 Created`
  - `401 Unauthorized`
- What it does:
  - authenticates the user and returns a JWT access token

### `GET /`

- Auth: none
- Query params:
  - `take` integer, max 100
  - `skip` integer
- Response: currently inconsistent; service implementation currently returns `undefined`
- Status codes:
  - `200 OK`
  - `403 Forbidden` when `take > 100`
- What it does:
  - intended to list users, but the current implementation is incomplete

### `GET /users/search`

- Auth: none
- Query params:
  - `name` optional
  - `email` optional
- Response: `User[]`
- Status codes:
  - `200 OK`
- What it does:
  - searches users by partial name or partial email

### `GET /me`

- Auth: JWT required
- Response: `User`
- Status codes:
  - `200 OK`
  - `401 Unauthorized`
- What it does:
  - returns the currently authenticated user

### `GET /users/:id`

- Auth: none
- Response: `User | null`
- Status codes:
  - `200 OK`
- What it does:
  - fetches a user by id

### `PATCH /users/:id`

- Auth: none
- Body: `UpdateUserDto`
- Response: string placeholder
- Status codes:
  - `200 OK`
- What it does:
  - currently not implemented; returns placeholder text

### `DELETE /users/:id`

- Auth: none
- Response: boolean
- Status codes:
  - `200 OK`
- What it does:
  - deletes a user and returns `true` or `false`

## Teams

### `POST /teams`

- Auth: JWT required
- Body: `CreateTeamDto`
- Response: `Team`
- Status codes:
  - `201 Created`
  - `401 Unauthorized`
  - `400 Bad Request`
- What it does:
  - creates a new team
  - automatically sets the authenticated user as `createdBy`
  - automatically adds the authenticated user as a member

### `GET /teams`

- Auth: JWT required
- Response: `TeamListResponse`
- Status codes:
  - `200 OK`
  - `401 Unauthorized`
- What it does:
  - returns all teams the current user belongs to

### `GET /teams/:id`

- Auth: JWT required
- Response: `Team | null`
- Status codes:
  - `200 OK`
  - `401 Unauthorized`
  - `400 Bad Request`
- What it does:
  - returns a team by id

### `PUT /teams/:id/addUser`

- Auth: JWT required
- Body: `UpdateTeamDto`
- Response: `Team`
- Status codes:
  - `200 OK`
  - `400 Bad Request`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
- What it does:
  - renames the team when `name` is sent
  - adds a user when `addUserId` is sent
  - removes a user when `removeUserId` is sent
- Important behavior:
  - only `createdBy` can call this successfully
  - only one of `addUserId` or `removeUserId` should be sent
  - creator cannot remove themselves
  - adding the same member twice is effectively ignored

### `DELETE /teams/:id`

- Auth: JWT required
- Response: boolean
- Status codes:
  - `200 OK`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `400 Bad Request`
- What it does:
  - deletes the team
- Important behavior:
  - only `createdBy` can delete the team

## Projects

All project routes are guarded by both JWT auth and team membership.

### `POST /teams/:teamId/projects`

- Auth: JWT + team membership required
- Body: `CreateProjectDto`
- Response: `Project`
- Status codes:
  - `201 Created`
  - `400 Bad Request`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
- What it does:
  - creates a project inside a team
- Important behavior:
  - user must be a member of the team to pass the guard
  - user must also be the team creator to actually create the project

### `GET /teams/:teamId/projects`

- Auth: JWT + team membership required
- Response: `Project[]`
- Status codes:
  - `200 OK`
  - `401 Unauthorized`
  - `403 Forbidden`
- What it does:
  - lists projects belonging to the team

### `GET /teams/:teamId/projects/:id`

- Auth: JWT + team membership required
- Response: `Project`
- Status codes:
  - `200 OK`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
- What it does:
  - returns a single project by id

### `PATCH /teams/:teamId/projects/:id`

- Auth: JWT + team membership required
- Body: `UpdateProjectDto`
- Response: string placeholder
- Status codes:
  - `200 OK`
- What it does:
  - currently not implemented; returns placeholder text

### `DELETE /teams/:teamId/projects/:id`

- Auth: JWT + team membership required
- Response: boolean
- Status codes:
  - `200 OK`
  - `401 Unauthorized`
  - `403 Forbidden`
- What it does:
  - deletes a project
- Important behavior:
  - only the team creator can remove the project

## Monitors

All monitor routes are guarded by both JWT auth and team membership.

### `POST /teams/:teamId/projects/:projectId/monitors`

- Auth: JWT + team membership required
- Body: `CreateMonitorDto`
- Response: `Monitor`
- Status codes:
  - `201 Created`
  - `400 Bad Request`
  - `401 Unauthorized`
  - `403 Forbidden`
- What it does:
  - creates a monitor under a project
  - publishes a Kafka event to scheduler after successful creation
- Internal event side-effect:
  - topic: `checks.execution.add`
  - payload:

```json
{
  "id": "<created-monitor-id>",
  "frequency": 60
}
```

Notes:

- this is an internal async side-effect; the REST response remains the created `Monitor`
- send `projectId` in body matching `:projectId` from route

### `GET /teams/:teamId/projects/:projectId/monitors`

- Auth: JWT + team membership required
- Response: `Monitor[]`
- Status codes:
  - `200 OK`
- What it does:
  - lists monitors for a project

### `GET /teams/:teamId/projects/:projectId/monitors/:id`

- Auth: JWT + team membership required
- Response: `Monitor | null`
- Status codes:
  - `200 OK`
- What it does:
  - fetches a monitor by id

### `PATCH /teams/:teamId/projects/:projectId/monitors/:id`

- Auth: JWT + team membership required
- Body: `UpdateMonitorDto`
- Response: `Monitor | null`
- Status codes:
  - `200 OK`
- What it does:
  - updates a monitor by id

### `DELETE /teams/:teamId/projects/:projectId/monitors/:id`

- Auth: JWT + team membership required
- Response: boolean
- Status codes:
  - `200 OK`
- What it does:
  - deletes a monitor by id

## Metrics

All metric routes are guarded by both JWT auth and team membership.

### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics`

- Auth: JWT + team membership required
- Body: `CreateMetricDto`
- Response: `Metric`
- Status codes:
  - `201 Created`
  - `400 Bad Request`
  - `401 Unauthorized`
  - `403 Forbidden`
- What it does:
  - stores a new metric sample for a monitor
  - publishes a long-poll update for listeners

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics`

- Auth: JWT + team membership required
- Query:
  - `beginDate`
  - `endDate`
  - `region`
- Response: `Metric[]`
- Status codes:
  - `200 OK`
  - `406 Not Acceptable`
- What it does:
  - lists metrics within a date range for the monitor

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/poll`

- Auth: JWT + team membership required
- Response: `Metric`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`
- What it does:
  - waits for the next metric update for the monitor

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id`

- Auth: currently no `TeamMemberGuard` at method level in controller, but route is nested under JWT controller
- Response: `Metric | null`
- Status codes:
  - `200 OK`
- What it does:
  - gets a metric by id

### `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id`

- Auth: currently no `TeamMemberGuard` at method level in controller, but route is nested under JWT controller
- Body: `UpdateMetricDto`
- Response: `Metric | null`
- Status codes:
  - `200 OK`
- What it does:
  - updates a metric by id

### `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id`

- Auth: currently no `TeamMemberGuard` at method level in controller, but route is nested under JWT controller
- Response: boolean
- Status codes:
  - `200 OK`
- What it does:
  - deletes a metric by id

## Alerts

All alert routes are guarded by both JWT auth and team membership.

### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts`

- Auth: JWT + team membership required
- Body: `CreateAlertDto`
- Response: `Alert`
- Status codes:
  - `201 Created`
  - `400 Bad Request`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `406 Not Acceptable`
- What it does:
  - creates a manual alert record
  - publishes the created alert to long-poll subscribers
- Important behavior:
  - `body.monitorId` must match route `:monitorId`
  - monitor must belong to the given project

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts`

- Response: `Alert[]`
- Status codes:
  - `200 OK`
  - `406 Not Acceptable`
- What it does:
  - lists alerts for the monitor

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/poll`

- Response: `Alert`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`
- What it does:
  - waits for the next alert update for the monitor

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id`

- Response: `Alert`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`
- What it does:
  - returns a single alert by id

### `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id`

- Body: `UpdateAlertDto`
- Response: `Alert`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`
- What it does:
  - updates an alert by id and publishes the new version to subscribers

### `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id`

- Response: `{ "deleted": true }`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`
- What it does:
  - deletes an alert by id and publishes a deletion event to subscribers

## Analytics

All analytics routes are guarded by both JWT auth and team membership.

### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics`

- Body: `CreateAnalyticsDto`
- Response: `Analytics`
- Status codes:
  - `201 Created`
  - `400 Bad Request`
  - `406 Not Acceptable`
- What it does:
  - creates analytics for a monitor and publishes the result to subscribers

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics`

- Response: `Analytics[]`
- Status codes:
  - `200 OK`
  - `406 Not Acceptable`
- What it does:
  - lists analytics rows for the monitor

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/availability`

- Query params (optional, must be sent together):
  - `startTime`: ISO datetime string
  - `endTime`: ISO datetime string
- Response: `MonitorAvailability`
- Status codes:
  - `200 OK`
  - `400 Bad Request`
  - `406 Not Acceptable`
- What it does:
  - returns monitor availability and downtime
  - if both `startTime` and `endTime` are provided, calculates within that time range
  - if no query params are provided, calculates over the monitor's observed timeline

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/poll`

- Response: `Analytics`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`
- What it does:
  - waits for the next analytics update for the monitor

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id`

- Response: `Analytics`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`

### `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id`

- Body: `UpdateAnalyticsDto`
- Response: `Analytics`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`

### `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id`

- Response: `{ "deleted": true }`
- Status codes:
  - `200 OK`
  - `404 Not Found`
  - `406 Not Acceptable`

## Incidents

All incident routes are guarded by both JWT auth and team membership.

### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents`

- Body: `CreateIncidentDto`
- Response: `Incident`
- Status codes:
  - `201 Created`
  - `400 Bad Request`
- What it does:
  - creates an incident record for the monitor

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents`

- Response: `Incident[]`
- Status codes:
  - `200 OK`
- What it does:
  - lists incidents for a monitor

### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id`

- Response: `Incident | null`
- Status codes:
  - `200 OK`
- What it does:
  - returns a single incident by id

### `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id`

- Body: `UpdateIncidentDto`
- Response: string placeholder
- Status codes:
  - `200 OK`
- What it does:
  - currently not implemented; returns placeholder text

### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/acknowledge`

- Body:

```json
{
  "userId": "uuid, optional"
}
```

- Response: TypeORM update result
- Status codes:
  - `200 OK`
- What it does:
  - marks the incident as `ACKNOWLEDGED`
  - uses `body.userId` if provided, otherwise falls back to the authenticated user id

### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/resolve`

- Body: none
- Response: TypeORM update result
- Status codes:
  - `200 OK`
- What it does:
  - marks the incident as `RESOLVED`

### `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id`

- Response: boolean
- Status codes:
  - `200 OK`
- What it does:
  - deletes the incident by id

## Notifications

All notification routes are guarded by both JWT auth and team membership.

### `POST /teams/:teamId/projects/:projectId/notifications`

- Body: `CreateNotificationDto`
- Response: `Notification`
- Status codes:
  - `201 Created`
  - `400 Bad Request`
- What it does:
  - creates a notification record
  - defaults `status` to `PENDING` if omitted
  - publishes a long-poll event when `incidentId` exists

### `GET /teams/:teamId/projects/:projectId/notifications/by-team/:teamIdParam`

- Response: `Notification[]`
- Status codes:
  - `200 OK`
- What it does:
  - lists notifications by team id

### `GET /teams/:teamId/projects/:projectId/notifications/poll`

- Query:
  - `timeout` optional, milliseconds
- Response: `Notification | null`
- Status codes:
  - `200 OK`
- What it does:
  - waits for the next notification event for the project channel
  - returns `null` on timeout instead of returning `404`

### `GET /teams/:teamId/projects/:projectId/notifications`

- Response: `Notification[]`
- Status codes:
  - `200 OK`
- What it does:
  - lists notifications for the project

### `GET /teams/:teamId/projects/:projectId/notifications/:id`

- Response: `Notification`
- Status codes:
  - `200 OK`
  - `404 Not Found`

### `PATCH /teams/:teamId/projects/:projectId/notifications/:id`

- Body: `UpdateNotificationDto`
- Response: `Notification`
- Status codes:
  - `200 OK`
  - `404 Not Found`

### `DELETE /teams/:teamId/projects/:projectId/notifications/:id`

- Response: `Notification`
- Status codes:
  - `200 OK`
  - `404 Not Found`

## Alert Policy

All alert policy routes are guarded by both JWT auth and team membership.

### `POST /teams/:teamId/projects/:projectId/alert-policy`

- Body: `CreateAlertPolicyDto`
- Response: `AlertPolicy`
- Status codes:
  - `201 Created`
  - `400 Bad Request`

### `GET /teams/:teamId/projects/:projectId/alert-policy`

- Response: `AlertPolicy[]`
- Status codes:
  - `200 OK`

### `GET /teams/:teamId/projects/:projectId/alert-policy/:id`

- Response: `AlertPolicy`
- Status codes:
  - `200 OK`

### `PATCH /teams/:teamId/projects/:projectId/alert-policy/:id`

- Body: `UpdateAlertPolicyDto`
- Response: `AlertPolicy`
- Status codes:
  - `200 OK`

### `DELETE /teams/:teamId/projects/:projectId/alert-policy/:id`

- Response: repository delete result / boolean-like deletion behavior depending on implementation
- Status codes:
  - `200 OK`

## Client Walkthroughs

## Walkthrough 1: Sign up, sign in, and create a team

### Step 1: Register

`POST /signup`

```json
{
  "name": "Shatwik",
  "email": "shatwik@example.com",
  "password": "secret123"
}
```

Expected result:

- `201 Created`
- user object returned

### Step 2: Log in

`POST /signin`

```json
{
  "email": "shatwik@example.com",
  "password": "secret123"
}
```

Expected result:

```json
{
  "access_token": "<jwt>"
}
```

### Step 3: Create a team

`POST /teams`

```json
{
  "name": "Platform Team"
}
```

Expected result:

- current user becomes `createdBy`
- current user is added to `members`

## Walkthrough 2: Add a member and create a project

This only works for the team creator.

### Step 1: Add a member

`PUT /teams/:teamId/addUser`

```json
{
  "addUserId": "<other-user-id>"
}
```

Expected result:

- updated `Team` returned
- `members` includes the new user

### Step 2: Create a project

`POST /teams/:teamId/projects`

```json
{
  "name": "Checkout API",
  "description": "Checkout service monitoring project"
}
```

Expected result:

- `201 Created`
- project returned

If a regular team member calls the same endpoint:

- request passes team membership guard
- service returns `403 Forbidden`

## Walkthrough 3: Create a monitor, ingest metrics, and listen for alerts/analytics

### Step 1: Create a monitor

`POST /teams/:teamId/projects/:projectId/monitors`

```json
{
  "name": "Homepage Health",
  "target": "https://example.com/health",
  "method": "GET",
  "frequencySeconds": 60,
  "projectId": "<project-id>"
}
```

### Step 2: Start long-poll listeners

Client A can call:

- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/poll`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/poll`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/poll`

Behavior:

- request stays open until an event arrives or timeout occurs
- metrics/alerts/analytics poll timeouts return `404`

### Step 3: Post a metric

`POST /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics`

```json
{
  "durationMs": 120,
  "statusCode": 200,
  "dns_response_time_ms": 5,
  "tcp_connection_time_ms": 10,
  "tls_handshake_time_ms": 15,
  "time_to_first_byte_ms": 30,
  "server_processing_time_ms": 35,
  "content_transfer_time_ms": 25,
  "total_time_ms": 120,
  "region": "IN",
  "isSuccess": true,
  "monitorId": "<monitor-id>"
}
```

Expected result:

- metric is stored
- metric poll subscribers receive the new metric

### Step 4: Create or update alerts/analytics manually if needed

Manual alert creation:

`POST /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts`

Manual analytics creation:

`POST /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics`

Both endpoints publish events to their `/poll` listeners.

## Known Client-Facing Gaps

These endpoints are currently scaffold or partially implemented and clients should treat them carefully:

- `GET /` user list: current service does not return the queried users properly
- `PATCH /users/:id`: placeholder string response
- `PATCH /teams/:teamId/projects/:id`: placeholder string response
- `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id`: placeholder string response
- Notifications `/poll` ignores the provided timeout value in the service and uses the shared long-poll default

## Recommendation For Client Integrations

- Use the swagger UI for quick payload inspection, but rely on this document for current behavioral details
- Expect strict DTO validation failures as `400`
- Treat owner-only operations separately in the frontend UI
- Build client polling for alerts, analytics, and metrics as timeout-and-retry loops
- For notifications polling, expect `200` with `null` on timeout instead of `404`

## Full Example REST Contract (Request/Response Bodies + API Calls)

This section gives concrete API-call examples for every major REST resource.

Use placeholders:

- `{{BASE_URL}}` example: `http://localhost:3000`
- `{{TOKEN}}` JWT from `/signin`
- `{{TEAM_ID}}`, `{{PROJECT_ID}}`, `{{MONITOR_ID}}`, `{{ID}}` as UUIDs

### 1) Authentication

#### `POST /signup`

Request:

```bash
curl -X POST "{{BASE_URL}}/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shatwik",
    "email": "shatwik@example.com",
    "password": "secret123"
  }'
```

201 Response:

```json
{
  "id": "a8deaa4c-1a1f-4f9d-aed2-8f7f22b9071b",
  "name": "Shatwik",
  "email": "shatwik@example.com",
  "createdAt": "2026-03-14T10:00:00.000Z",
  "updatedAt": "2026-03-14T10:00:00.000Z"
}
```

#### `POST /signin`

Request:

```bash
curl -X POST "{{BASE_URL}}/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "shatwik@example.com",
    "password": "secret123"
  }'
```

201 Response:

```json
{
  "access_token": "<jwt-token>"
}
```

### 2) Teams

#### `POST /teams`

```bash
curl -X POST "{{BASE_URL}}/teams" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Platform Team"}'
```

201 Response:

```json
{
  "id": "{{TEAM_ID}}",
  "name": "Platform Team",
  "createdBy": {
    "id": "b9d8a7f2-7c8d-4b96-82d1-cc601723d8a8",
    "name": "Shatwik",
    "email": "shatwik@example.com"
  },
  "members": [
    {
      "id": "b9d8a7f2-7c8d-4b96-82d1-cc601723d8a8",
      "name": "Shatwik",
      "email": "shatwik@example.com"
    }
  ],
  "createdAt": "2026-03-14T10:01:00.000Z",
  "updatedAt": "2026-03-14T10:01:00.000Z"
}
```

#### `GET /teams`

```bash
curl -X GET "{{BASE_URL}}/teams" \
  -H "Authorization: Bearer {{TOKEN}}"
```

200 Response:

```json
{
  "Teams": [
    {
      "id": "{{TEAM_ID}}",
      "name": "Platform Team"
    }
  ],
  "Count": 1
}
```

#### `PUT /teams/:id/addUser`

```bash
curl -X PUT "{{BASE_URL}}/teams/{{TEAM_ID}}/addUser" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"addUserId":"5f9f0d71-6900-4b0d-9b7d-c2ad567a27ca"}'
```

200 Response: updated `Team` object.

### 3) Projects

#### `POST /teams/:teamId/projects`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Checkout API",
    "description":"Checkout service monitoring project"
  }'
```

201 Response:

```json
{
  "id": "{{PROJECT_ID}}",
  "name": "Checkout API",
  "description": "Checkout service monitoring project",
  "createdAt": "2026-03-14T10:02:00.000Z",
  "updatedAt": "2026-03-14T10:02:00.000Z"
}
```

#### `GET /teams/:teamId/projects/:id`

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

200 Response: `Project`.

### 4) Monitors

#### `POST /teams/:teamId/projects/:projectId/monitors`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Homepage Health",
    "target":"https://example.com/health",
    "method":"GET",
    "frequencySeconds":60,
    "isLive":true,
    "isActive":true,
    "headers":{"x-monitor":"homepage","authorization":"Bearer internal-token"},
    "body":"{\"ping\":true}",
    "maintencePeriods":[{"start":"2026-03-15T01:00:00.000Z","end":"2026-03-15T02:00:00.000Z"}],
    "expectedStatus":200,
    "expectedBody":{"ok":true},
    "projectId":"{{PROJECT_ID}}",
    "alertPolicyId":"0bc4f722-4a55-4f6e-9fc8-4f7de5ccce04"
  }'
```

201 Response:

```json
{
  "id": "{{MONITOR_ID}}",
  "name": "Homepage Health",
  "target": "https://example.com/health",
  "method": "GET",
  "frequencySeconds": 60,
  "isLive": true,
  "isActive": true,
  "headers": {
    "x-monitor": "homepage",
    "authorization": "Bearer internal-token"
  },
  "body": "{\"ping\":true}",
  "maintencePeriods": [
    {
      "start": "2026-03-15T01:00:00.000Z",
      "end": "2026-03-15T02:00:00.000Z"
    }
  ],
  "expectedStatus": 200,
  "expectedBody": {
    "ok": true
  },
  "createdAt": "2026-03-14T10:03:00.000Z",
  "updatedAt": "2026-03-14T10:03:00.000Z"
}
```

Internal side effect (not in response):

```json
{
  "topic": "checks.execution.add",
  "payload": {
    "id": "{{MONITOR_ID}}",
    "frequency": 60
  }
}
```

#### `PATCH /teams/:teamId/projects/:projectId/monitors/:id`

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Homepage Health (Updated)",
    "frequencySeconds":30,
    "isActive":false,
    "headers":{"authorization":"Bearer updated-token"},
    "body":"{\"ping\":false}",
    "expectedStatus":201,
    "expectedBody":{"ok":false}
  }'
```

200 Response: updated `Monitor`.

### 5) Metrics

#### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/metrics" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "durationMs":120,
    "statusCode":200,
    "dns_response_time_ms":5,
    "tcp_connection_time_ms":10,
    "tls_handshake_time_ms":15,
    "time_to_first_byte_ms":30,
    "server_processing_time_ms":35,
    "content_transfer_time_ms":25,
    "total_time_ms":120,
    "region":"IN",
    "isSuccess":true,
    "monitorId":"{{MONITOR_ID}}"
  }'
```

201 Response:

```json
{
  "id": "31f54c2b-e642-4d5e-bd70-88c30f6cb1fb",
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "statusCode": 200,
  "total_time_ms": 120,
  "region": "IN",
  "isSuccess": true,
  "createdAt": "2026-03-14T10:04:00.000Z"
}
```

#### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics`

```bash
curl -G "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/metrics" \
  -H "Authorization: Bearer {{TOKEN}}" \
  --data-urlencode "beginDate=2026-03-14T00:00:00.000Z" \
  --data-urlencode "endDate=2026-03-14T23:59:59.999Z" \
  --data-urlencode "region=IN"
```

200 Response: `Metric[]`.

### 6) Alerts

#### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/alerts" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"ANOMALY",
    "message":"Latency spike detected",
    "metadata":{"p95":450,"threshold":300},
    "monitorId":"{{MONITOR_ID}}"
  }'
```

201 Response:

```json
{
  "id": "41fc2d62-8891-4a3a-ad42-df7c891cb8e1",
  "type": "ANOMALY",
  "message": "Latency spike detected",
  "metadata": {
    "p95": 450,
    "threshold": 300
  },
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "createdAt": "2026-03-14T10:05:00.000Z",
  "updatedAt": "2026-03-14T10:05:00.000Z"
}
```

#### `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id`

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/alerts/{{ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

200 Response:

```json
{
  "deleted": true
}
```

### 7) Analytics

#### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "monitorId":"{{MONITOR_ID}}",
    "region":"IN",
    "rollingAverage":120.5,
    "rollingStdDev":15.2,
    "variance":231.04,
    "p95":180,
    "p99":210,
    "anomalyDetected":false,
    "degradingComponent":null,
    "networkRatio":0.4,
    "backendRatio":0.6,
    "forecast":{
      "totalPrediction":[125,130],
      "confidenceUpper":[140,145],
      "confidenceLower":[110,115]
    },
    "predictedSlaBreach":false,
    "errorRate":0.02,
    "trend":"stable",
    "recentMetrics":[]
  }'
```

201 Response: `Analytics`.

#### `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/availability`

```bash
curl -G "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics/availability" \
  -H "Authorization: Bearer {{TOKEN}}" \
  --data-urlencode "startTime=2026-03-14T00:00:00.000Z" \
  --data-urlencode "endTime=2026-03-14T23:59:59.999Z"
```

200 Response:

```json
{
  "availability": 99.97,
  "downtime": 30000
}
```

### 8) Incidents

#### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"OPEN",
    "severity":"CRITICAL",
    "summary":"Service unreachable",
    "monitorId":"{{MONITOR_ID}}",
    "notifications":["email:oncall@example.com"]
  }'
```

201 Response: `Incident`.

#### `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/acknowledge`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents/{{ID}}/acknowledge" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"userId":"b9d8a7f2-7c8d-4b96-82d1-cc601723d8a8"}'
```

200 Response: TypeORM update result object.

### 9) Notifications

#### `POST /teams/:teamId/projects/:projectId/notifications`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "channel":"SLACK",
    "address":"#ops-alerts",
    "status":"PENDING",
    "incidentId":"c1bc30d9-08df-4f0b-aa66-9e495d729f0d",
    "alertId":"f5db8f9f-995e-4a66-9ef8-c69d287fa774",
    "message":"Incident opened for Homepage Health",
    "title":"Incident Triggered",
    "projectId":"{{PROJECT_ID}}"
  }'
```

201 Response: `Notification`.

#### `GET /teams/:teamId/projects/:projectId/notifications/poll`

```bash
curl -G "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications/poll" \
  -H "Authorization: Bearer {{TOKEN}}" \
  --data-urlencode "timeout=30000"
```

200 Response:

```json
null
```

or a full `Notification` object when an event is available.

### 10) Alert Policy

#### `POST /teams/:teamId/projects/:projectId/alert-policy`

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/alert-policy" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Latency + Availability Policy",
    "rules":{
      "version":"1.0",
      "rules":[
        {
          "metric":"p95",
          "operator":">",
          "threshold":300,
          "window":"5m"
        }
      ],
      "logic":"AND",
      "actions":["create_incident"],
      "suppression":{
        "cooldown":"15m",
        "maintenance":[
          {
            "start":"2026-03-20T00:00:00.000Z",
            "end":"2026-03-20T02:00:00.000Z"
          }
        ]
      }
    },
    "notificationChannels":[
      {
        "channelType":"slack",
        "address":"#ops-alerts"
      },
      {
        "channelType":"email",
        "address":"oncall@example.com"
      }
    ]
  }'
```

201 Response: `AlertPolicy`.

## Complete Endpoint Inventory

All endpoints currently exposed by Management API:

- `POST /signup`
- `POST /signin`
- `GET /`
- `GET /users/search`
- `GET /me`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `POST /teams`
- `GET /teams`
- `GET /teams/:id`
- `PUT /teams/:id/addUser`
- `DELETE /teams/:id`
- `POST /teams/:teamId/projects`
- `GET /teams/:teamId/projects`
- `GET /teams/:teamId/projects/:id`
- `PATCH /teams/:teamId/projects/:id`
- `DELETE /teams/:teamId/projects/:id`
- `POST /teams/:teamId/projects/:projectId/monitors`
- `GET /teams/:teamId/projects/:projectId/monitors`
- `GET /teams/:teamId/projects/:projectId/monitors/:id`
- `PATCH /teams/:teamId/projects/:projectId/monitors/:id`
- `DELETE /teams/:teamId/projects/:projectId/monitors/:id`
- `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/poll`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id`
- `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id`
- `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id`
- `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/poll`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id`
- `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id`
- `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id`
- `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/poll`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/availability`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id`
- `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id`
- `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id`
- `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents`
- `GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id`
- `PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id`
- `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/acknowledge`
- `POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/resolve`
- `DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id`
- `POST /teams/:teamId/projects/:projectId/notifications`
- `GET /teams/:teamId/projects/:projectId/notifications/by-team/:teamIdParam`
- `GET /teams/:teamId/projects/:projectId/notifications/poll`
- `GET /teams/:teamId/projects/:projectId/notifications`
- `GET /teams/:teamId/projects/:projectId/notifications/:id`
- `PATCH /teams/:teamId/projects/:projectId/notifications/:id`
- `DELETE /teams/:teamId/projects/:projectId/notifications/:id`
- `POST /teams/:teamId/projects/:projectId/alert-policy`
- `GET /teams/:teamId/projects/:projectId/alert-policy`
- `GET /teams/:teamId/projects/:projectId/alert-policy/:id`
- `PATCH /teams/:teamId/projects/:projectId/alert-policy/:id`
- `DELETE /teams/:teamId/projects/:projectId/alert-policy/:id`

## Endpoint-By-Endpoint API Examples (All Endpoints)

Use these placeholders in all examples:

- `{{BASE_URL}}` = `http://localhost:3000`
- `{{TOKEN}}` = JWT from `/signin`
- `{{USER_ID}}`, `{{TEAM_ID}}`, `{{PROJECT_ID}}`, `{{MONITOR_ID}}`, `{{METRIC_ID}}`, `{{ALERT_ID}}`, `{{ANALYTICS_ID}}`, `{{INCIDENT_ID}}`, `{{NOTIFICATION_ID}}`, `{{ALERT_POLICY_ID}}` = UUIDs

### Users + Auth

#### POST /signup

```bash
curl -X POST "{{BASE_URL}}/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shatwik",
    "email": "shatwik@example.com",
    "password": "secret123"
  }'
```

```json
{
  "id": "{{USER_ID}}",
  "name": "Shatwik",
  "email": "shatwik@example.com",
  "createdAt": "2026-03-14T10:00:00.000Z",
  "updatedAt": "2026-03-14T10:00:00.000Z"
}
```

#### POST /signin

```bash
curl -X POST "{{BASE_URL}}/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "shatwik@example.com",
    "password": "secret123"
  }'
```

```json
{
  "access_token": "{{TOKEN}}"
}
```

#### GET /

```bash
curl -X GET "{{BASE_URL}}/?take=10&skip=0"
```

```json
[
  {
    "id": "{{USER_ID}}",
    "name": "Shatwik",
    "email": "shatwik@example.com",
    "createdAt": "2026-03-14T10:00:00.000Z",
    "updatedAt": "2026-03-14T10:00:00.000Z"
  }
]
```

#### GET /users/search

```bash
curl -X GET "{{BASE_URL}}/users/search?name=sha&email=example.com"
```

```json
[
  {
    "id": "{{USER_ID}}",
    "name": "Shatwik",
    "email": "shatwik@example.com",
    "createdAt": "2026-03-14T10:00:00.000Z",
    "updatedAt": "2026-03-14T10:00:00.000Z"
  }
]
```

#### GET /me

```bash
curl -X GET "{{BASE_URL}}/me" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{USER_ID}}",
  "name": "Shatwik",
  "email": "shatwik@example.com",
  "createdAt": "2026-03-14T10:00:00.000Z",
  "updatedAt": "2026-03-14T10:00:00.000Z"
}
```

#### GET /users/:id

```bash
curl -X GET "{{BASE_URL}}/users/{{USER_ID}}"
```

```json
{
  "id": "{{USER_ID}}",
  "name": "Shatwik",
  "email": "shatwik@example.com",
  "createdAt": "2026-03-14T10:00:00.000Z",
  "updatedAt": "2026-03-14T10:00:00.000Z"
}
```

#### PATCH /users/:id

```bash
curl -X PATCH "{{BASE_URL}}/users/{{USER_ID}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shatwik Updated",
    "email": "shatwik.updated@example.com",
    "password": "newsecret123"
  }'
```

```json
"This action updates a #{{USER_ID}} user"
```

#### DELETE /users/:id

```bash
curl -X DELETE "{{BASE_URL}}/users/{{USER_ID}}"
```

```json
true
```

### Teams

#### POST /teams

```bash
curl -X POST "{{BASE_URL}}/teams" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Platform Team"}'
```

```json
{
  "id": "{{TEAM_ID}}",
  "name": "Platform Team",
  "createdBy": {
    "id": "{{USER_ID}}",
    "name": "Shatwik",
    "email": "shatwik@example.com"
  },
  "members": [
    {
      "id": "{{USER_ID}}",
      "name": "Shatwik",
      "email": "shatwik@example.com"
    }
  ],
  "createdAt": "2026-03-14T10:01:00.000Z",
  "updatedAt": "2026-03-14T10:01:00.000Z"
}
```

#### GET /teams

```bash
curl -X GET "{{BASE_URL}}/teams" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "Teams": [
    {
      "id": "{{TEAM_ID}}",
      "name": "Platform Team",
      "createdBy": {
        "id": "{{USER_ID}}",
        "name": "Shatwik",
        "email": "shatwik@example.com"
      },
      "members": [
        {
          "id": "{{USER_ID}}",
          "name": "Shatwik",
          "email": "shatwik@example.com"
        }
      ]
    }
  ],
  "Count": 1
}
```

#### GET /teams/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{TEAM_ID}}",
  "name": "Platform Team",
  "createdBy": {
    "id": "{{USER_ID}}",
    "name": "Shatwik",
    "email": "shatwik@example.com"
  },
  "members": [
    {
      "id": "{{USER_ID}}",
      "name": "Shatwik",
      "email": "shatwik@example.com"
    }
  ],
  "createdAt": "2026-03-14T10:01:00.000Z",
  "updatedAt": "2026-03-14T10:01:00.000Z"
}
```

#### PUT /teams/:id/addUser

```bash
curl -X PUT "{{BASE_URL}}/teams/{{TEAM_ID}}/addUser" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Platform Team",
    "addUserId": "4f2e6e6c-62f6-4f74-97d9-b2e2f0f5e5d9"
  }'
```

```json
{
  "id": "{{TEAM_ID}}",
  "name": "Platform Team",
  "createdBy": {
    "id": "{{USER_ID}}"
  },
  "members": [
    {
      "id": "{{USER_ID}}",
      "name": "Shatwik",
      "email": "shatwik@example.com"
    },
    {
      "id": "4f2e6e6c-62f6-4f74-97d9-b2e2f0f5e5d9",
      "name": "SRE User",
      "email": "sre@example.com"
    }
  ],
  "updatedAt": "2026-03-14T10:05:00.000Z"
}
```

#### DELETE /teams/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
true
```

### Projects

#### POST /teams/:teamId/projects

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Checkout API",
    "description":"Checkout service monitoring project"
  }'
```

```json
{
  "id": "{{PROJECT_ID}}",
  "name": "Checkout API",
  "description": "Checkout service monitoring project",
  "createdAt": "2026-03-14T10:02:00.000Z",
  "updatedAt": "2026-03-14T10:02:00.000Z"
}
```

#### GET /teams/:teamId/projects

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
[
  {
    "id": "{{PROJECT_ID}}",
    "name": "Checkout API",
    "description": "Checkout service monitoring project",
    "createdAt": "2026-03-14T10:02:00.000Z",
    "updatedAt": "2026-03-14T10:02:00.000Z"
  }
]
```

#### GET /teams/:teamId/projects/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{PROJECT_ID}}",
  "name": "Checkout API",
  "description": "Checkout service monitoring project",
  "createdAt": "2026-03-14T10:02:00.000Z",
  "updatedAt": "2026-03-14T10:02:00.000Z"
}
```

#### PATCH /teams/:teamId/projects/:id

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Checkout API Updated",
    "description":"Updated description"
  }'
```

```json
"This action updates a #{{PROJECT_ID}} project"
```

#### DELETE /teams/:teamId/projects/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
true
```

### Monitors

#### POST /teams/:teamId/projects/:projectId/monitors

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Homepage Health",
    "target":"https://example.com/health",
    "method":"GET",
    "frequencySeconds":60,
    "isLive":true,
    "isActive":true,
    "headers":{"x-monitor":"homepage","authorization":"Bearer internal-token"},
    "body":"{\"ping\":true}",
    "maintencePeriods":[{"start":"2026-03-15T01:00:00.000Z","end":"2026-03-15T02:00:00.000Z"}],
    "expectedStatus":200,
    "expectedBody":{"ok":true},
    "projectId":"{{PROJECT_ID}}",
    "alertPolicyId":"{{ALERT_POLICY_ID}}"
  }'
```

```json
{
  "id": "{{MONITOR_ID}}",
  "name": "Homepage Health",
  "target": "https://example.com/health",
  "method": "GET",
  "frequencySeconds": 60,
  "isLive": true,
  "isActive": true,
  "headers": {},
  "body": "",
  "maintencePeriods": [],
  "expectedStatus": 200,
  "expectedBody": null,
  "createdAt": "2026-03-14T10:03:00.000Z",
  "updatedAt": "2026-03-14T10:03:00.000Z"
}
```

#### GET /teams/:teamId/projects/:projectId/monitors

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
[
  {
    "id": "{{MONITOR_ID}}",
    "name": "Homepage Health",
    "target": "https://example.com/health",
    "method": "GET",
    "frequencySeconds": 60,
    "isLive": true,
    "isActive": true,
    "createdAt": "2026-03-14T10:03:00.000Z"
  }
]
```

#### GET /teams/:teamId/projects/:projectId/monitors/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{MONITOR_ID}}",
  "name": "Homepage Health",
  "target": "https://example.com/health",
  "method": "GET",
  "frequencySeconds": 60,
  "isLive": true,
  "isActive": true,
  "project": {
    "id": "{{PROJECT_ID}}",
    "name": "Checkout API"
  },
  "alertPolicy": {
    "id": "{{ALERT_POLICY_ID}}",
    "name": "Latency + Availability Policy",
    "rules": {
      "version": "1.0",
      "rules": [],
      "logic": "AND",
      "actions": []
    },
    "notificationChannels": []
  },
  "createdAt": "2026-03-14T10:03:00.000Z"
}
```

#### PATCH /teams/:teamId/projects/:projectId/monitors/:id

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Homepage Health Updated",
    "target":"https://example.com/status",
    "method":"GET",
    "frequencySeconds":30,
    "isActive":false,
    "headers":{"authorization":"Bearer updated-token"},
    "body":"{\"ping\":false}",
    "expectedStatus":201,
    "expectedBody":{"ok":false},
    "projectId":"{{PROJECT_ID}}",
    "alertPolicyId":"{{ALERT_POLICY_ID}}"
  }'
```

```json
{
  "id": "{{MONITOR_ID}}",
  "name": "Homepage Health Updated",
  "target": "https://example.com/status",
  "method": "GET",
  "frequencySeconds": 30,
  "isLive": true,
  "isActive": true,
  "headers": {
    "authorization": "Bearer updated-token"
  },
  "body": "{\"ping\":false}",
  "expectedStatus": 201,
  "expectedBody": {
    "ok": false
  },
  "updatedAt": "2026-03-14T10:04:00.000Z"
}
```

#### DELETE /teams/:teamId/projects/:projectId/monitors/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
true
```

### Metrics

#### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/metrics" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "durationMs":120,
    "statusCode":200,
    "dns_response_time_ms":5,
    "tcp_connection_time_ms":10,
    "tls_handshake_time_ms":15,
    "time_to_first_byte_ms":30,
    "server_processing_time_ms":35,
    "content_transfer_time_ms":25,
    "total_time_ms":120,
    "region":"IN",
    "isSuccess":true,
    "monitorId":"{{MONITOR_ID}}"
  }'
```

```json
{
  "id": "{{METRIC_ID}}",
  "durationMs": 120,
  "statusCode": 200,
  "dns_response_time_ms": 5,
  "tcp_connection_time_ms": 10,
  "tls_handshake_time_ms": 15,
  "time_to_first_byte_ms": 30,
  "server_processing_time_ms": 35,
  "content_transfer_time_ms": 25,
  "total_time_ms": 120,
  "region": "IN",
  "isSuccess": true,
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "createdAt": "2026-03-14T10:06:00.000Z"
}
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics

```bash
curl -G "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/metrics" \
  -H "Authorization: Bearer {{TOKEN}}" \
  --data-urlencode "beginDate=2026-03-14T00:00:00.000Z" \
  --data-urlencode "endDate=2026-03-14T23:59:59.999Z" \
  --data-urlencode "region=IN"
```

```json
[
  {
    "id": "{{METRIC_ID}}",
    "durationMs": 120,
    "statusCode": 200,
    "total_time_ms": 120,
    "region": "IN",
    "isSuccess": true,
    "monitor": {
      "id": "{{MONITOR_ID}}"
    },
    "createdAt": "2026-03-14T10:06:00.000Z"
  }
]
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/poll

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/metrics/poll" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{METRIC_ID}}",
  "durationMs": 120,
  "statusCode": 200,
  "total_time_ms": 120,
  "region": "IN",
  "isSuccess": true,
  "monitorId": "{{MONITOR_ID}}"
}
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/metrics/{{METRIC_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{METRIC_ID}}",
  "durationMs": 120,
  "statusCode": 200,
  "dns_response_time_ms": 5,
  "tcp_connection_time_ms": 10,
  "tls_handshake_time_ms": 15,
  "time_to_first_byte_ms": 30,
  "server_processing_time_ms": 35,
  "content_transfer_time_ms": 25,
  "total_time_ms": 120,
  "region": "IN",
  "isSuccess": true,
  "createdAt": "2026-03-14T10:06:00.000Z"
}
```

#### PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/metrics/{{METRIC_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "durationMs":100,
    "statusCode":200,
    "dns_response_time_ms":3,
    "tcp_connection_time_ms":8,
    "tls_handshake_time_ms":10,
    "time_to_first_byte_ms":25,
    "server_processing_time_ms":30,
    "content_transfer_time_ms":24,
    "total_time_ms":100,
    "region":"IN",
    "isSuccess":true,
    "monitorId":"{{MONITOR_ID}}"
  }'
```

```json
{
  "id": "{{METRIC_ID}}",
  "durationMs": 100,
  "statusCode": 200,
  "total_time_ms": 100,
  "region": "IN",
  "isSuccess": true,
  "updatedAt": "2026-03-14T10:07:00.000Z"
}
```

#### DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/metrics/{{METRIC_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
true
```

### Alerts

#### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/alerts" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"ANOMALY",
    "message":"Latency spike detected",
    "metadata":{"p95":450,"threshold":300},
    "monitorId":"{{MONITOR_ID}}",
    "metricId":"{{METRIC_ID}}"
  }'
```

```json
{
  "id": "{{ALERT_ID}}",
  "type": "ANOMALY",
  "message": "Latency spike detected",
  "metadata": {
    "p95": 450,
    "threshold": 300
  },
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "metric": {
    "id": "{{METRIC_ID}}"
  },
  "createdAt": "2026-03-14T10:08:00.000Z",
  "updatedAt": "2026-03-14T10:08:00.000Z"
}
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/alerts" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
[
  {
    "id": "{{ALERT_ID}}",
    "type": "ANOMALY",
    "message": "Latency spike detected",
    "metadata": {
      "p95": 450,
      "threshold": 300
    },
    "monitor": {
      "id": "{{MONITOR_ID}}"
    },
    "metric": {
      "id": "{{METRIC_ID}}"
    },
    "createdAt": "2026-03-14T10:08:00.000Z"
  }
]
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/poll

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/alerts/poll" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{ALERT_ID}}",
  "type": "ANOMALY",
  "message": "Latency spike detected",
  "metadata": {
    "p95": 450,
    "threshold": 300
  },
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "metric": {
    "id": "{{METRIC_ID}}"
  }
}
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/alerts/{{ALERT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{ALERT_ID}}",
  "type": "ANOMALY",
  "message": "Latency spike detected",
  "metadata": {
    "p95": 450,
    "threshold": 300
  },
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "metric": {
    "id": "{{METRIC_ID}}"
  },
  "createdAt": "2026-03-14T10:08:00.000Z",
  "updatedAt": "2026-03-14T10:08:00.000Z"
}
```

#### PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/alerts/{{ALERT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"ANOMALY",
    "message":"Latency recovered",
    "metadata":{"p95":210,"threshold":300},
    "monitorId":"{{MONITOR_ID}}",
    "metricId":"{{METRIC_ID}}"
  }'
```

```json
{
  "id": "{{ALERT_ID}}",
  "type": "ANOMALY",
  "message": "Latency recovered",
  "metadata": {
    "p95": 210,
    "threshold": 300
  },
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "metric": {
    "id": "{{METRIC_ID}}"
  },
  "updatedAt": "2026-03-14T10:09:00.000Z"
}
```

#### DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/alerts/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/alerts/{{ALERT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "deleted": true
}
```

### Analytics

#### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "monitorId":"{{MONITOR_ID}}",
    "region":"IN",
    "rollingAverage":120.5,
    "rollingStdDev":15.2,
    "variance":231.04,
    "p95":180,
    "p99":210,
    "anomalyDetected":false,
    "degradingComponent":null,
    "networkRatio":0.4,
    "backendRatio":0.6,
    "forecast":{
      "totalPrediction":[125,130],
      "confidenceUpper":[140,145],
      "confidenceLower":[110,115]
    },
    "predictedSlaBreach":false,
    "errorRate":0.02,
    "trend":"stable",
    "recentMetrics":[]
  }'
```

```json
{
  "id": "{{ANALYTICS_ID}}",
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "region": "IN",
  "rollingAverage": 120.5,
  "rollingStdDev": 15.2,
  "variance": 231.04,
  "p95": 180,
  "p99": 210,
  "anomalyDetected": false,
  "degradingComponent": null,
  "networkRatio": 0.4,
  "backendRatio": 0.6,
  "forecast": {
    "totalPrediction": [125, 130],
    "confidenceUpper": [140, 145],
    "confidenceLower": [110, 115]
  },
  "predictedSlaBreach": false,
  "errorRate": 0.02,
  "trend": "stable",
  "recentMetrics": [],
  "createdAt": "2026-03-14T10:10:00.000Z",
  "updatedAt": "2026-03-14T10:10:00.000Z"
}
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics?region=IN" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
[
  {
    "id": "{{ANALYTICS_ID}}",
    "monitor": {
      "id": "{{MONITOR_ID}}"
    },
    "region": "IN",
    "rollingAverage": 120.5,
    "rollingStdDev": 15.2,
    "variance": 231.04,
    "p95": 180,
    "p99": 210,
    "anomalyDetected": false,
    "networkRatio": 0.4,
    "backendRatio": 0.6,
    "forecast": {
      "totalPrediction": [125, 130],
      "confidenceUpper": [140, 145],
      "confidenceLower": [110, 115]
    },
    "predictedSlaBreach": false,
    "errorRate": 0.02,
    "trend": "stable",
    "recentMetrics": []
  }
]
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/poll

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics/poll" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{ANALYTICS_ID}}",
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "region": "IN",
  "rollingAverage": 120.5,
  "rollingStdDev": 15.2,
  "variance": 231.04,
  "p95": 180,
  "p99": 210,
  "anomalyDetected": false,
  "degradingComponent": null,
  "networkRatio": 0.4,
  "backendRatio": 0.6,
  "forecast": {
    "totalPrediction": [125, 130],
    "confidenceUpper": [140, 145],
    "confidenceLower": [110, 115]
  },
  "predictedSlaBreach": false,
  "errorRate": 0.02,
  "trend": "stable",
  "recentMetrics": []
}
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/availability

```bash
curl -G "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics/availability" \
  -H "Authorization: Bearer {{TOKEN}}" \
  --data-urlencode "startTime=2026-03-14T00:00:00.000Z" \
  --data-urlencode "endTime=2026-03-14T23:59:59.999Z"
```

```json
{
  "availability": 99.97,
  "downtime": 30000
}
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics/{{ANALYTICS_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{ANALYTICS_ID}}",
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "region": "IN",
  "rollingAverage": 120.5,
  "rollingStdDev": 15.2,
  "variance": 231.04,
  "p95": 180,
  "p99": 210,
  "anomalyDetected": false,
  "degradingComponent": null,
  "networkRatio": 0.4,
  "backendRatio": 0.6,
  "forecast": {
    "totalPrediction": [125, 130],
    "confidenceUpper": [140, 145],
    "confidenceLower": [110, 115]
  },
  "predictedSlaBreach": false,
  "errorRate": 0.02,
  "trend": "stable",
  "recentMetrics": [],
  "createdAt": "2026-03-14T10:10:00.000Z",
  "updatedAt": "2026-03-14T10:10:00.000Z"
}
```

#### PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics/{{ANALYTICS_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "monitorId":"{{MONITOR_ID}}",
    "region":"IN",
    "rollingAverage":118.2,
    "rollingStdDev":14.5,
    "variance":210.25,
    "p95":170,
    "p99":198,
    "anomalyDetected":false,
    "degradingComponent":null,
    "networkRatio":0.38,
    "backendRatio":0.62,
    "forecast":{
      "totalPrediction":[120,124],
      "confidenceUpper":[132,137],
      "confidenceLower":[108,111]
    },
    "predictedSlaBreach":false,
    "errorRate":0.01,
    "trend":"improving",
    "recentMetrics":[]
  }'
```

```json
{
  "id": "{{ANALYTICS_ID}}",
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "region": "IN",
  "rollingAverage": 118.2,
  "rollingStdDev": 14.5,
  "variance": 210.25,
  "p95": 170,
  "p99": 198,
  "anomalyDetected": false,
  "degradingComponent": null,
  "networkRatio": 0.38,
  "backendRatio": 0.62,
  "forecast": {
    "totalPrediction": [120, 124],
    "confidenceUpper": [132, 137],
    "confidenceLower": [108, 111]
  },
  "predictedSlaBreach": false,
  "errorRate": 0.01,
  "trend": "improving",
  "recentMetrics": [],
  "updatedAt": "2026-03-14T10:11:00.000Z"
}
```

#### DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/analytics/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/analytics/{{ANALYTICS_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "deleted": true
}
```

### Incidents

#### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"OPEN",
    "severity":"CRITICAL",
    "summary":"Service unreachable",
    "resolvedAt": null,
    "acknowledgedAt": null,
    "startedAt":"2026-03-14T10:12:00.000Z",
    "acknowledgedBy": "{{USER_ID}}",
    "monitorId":"{{MONITOR_ID}}",
    "notifications":["email:oncall@example.com","slack:#ops-alerts"]
  }'
```

```json
{
  "id": "{{INCIDENT_ID}}",
  "status": "OPEN",
  "severity": "CRITICAL",
  "summary": "Service unreachable",
  "resolvedAt": null,
  "acknowledgedAt": null,
  "startedAt": "2026-03-14T10:12:00.000Z",
  "acknowledgedBy": {
    "id": "{{USER_ID}}"
  },
  "monitor": {
    "id": "{{MONITOR_ID}}"
  },
  "updatedAt": "2026-03-14T10:12:00.000Z"
}
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
[
  {
    "id": "{{INCIDENT_ID}}",
    "status": "OPEN",
    "severity": "CRITICAL",
    "summary": "Service unreachable",
    "resolvedAt": null,
    "acknowledgedAt": null,
    "startedAt": "2026-03-14T10:12:00.000Z",
    "monitor": {
      "id": "{{MONITOR_ID}}"
    }
  }
]
```

#### GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents/{{INCIDENT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{INCIDENT_ID}}",
  "status": "OPEN",
  "severity": "CRITICAL",
  "summary": "Service unreachable",
  "resolvedAt": null,
  "acknowledgedAt": null,
  "startedAt": "2026-03-14T10:12:00.000Z",
  "acknowledgedBy": {
    "id": "{{USER_ID}}"
  },
  "monitor": {
    "id": "{{MONITOR_ID}}"
  }
}
```

#### PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents/{{INCIDENT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"ACKNOWLEDGED",
    "severity":"WARNING",
    "summary":"Investigating",
    "resolvedAt": null,
    "acknowledgedAt":"2026-03-14T10:13:00.000Z",
    "startedAt":"2026-03-14T10:12:00.000Z",
    "acknowledgedBy":"{{USER_ID}}",
    "monitorId":"{{MONITOR_ID}}",
    "notifications":["email:oncall@example.com"]
  }'
```

```json
"This action updates a #{{INCIDENT_ID}} incident"
```

#### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/acknowledge

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents/{{INCIDENT_ID}}/acknowledge" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"userId":"{{USER_ID}}"}'
```

```json
{
  "generatedMaps": [],
  "raw": [],
  "affected": 1
}
```

#### POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/resolve

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents/{{INCIDENT_ID}}/resolve" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "generatedMaps": [],
  "raw": [],
  "affected": 1
}
```

#### DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/monitors/{{MONITOR_ID}}/incidents/{{INCIDENT_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
true
```

### Notifications

#### POST /teams/:teamId/projects/:projectId/notifications

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "channel":"SLACK",
    "address":"#ops-alerts",
    "status":"PENDING",
    "incidentId":"{{INCIDENT_ID}}",
    "alertId":"{{ALERT_ID}}",
    "message":"Incident opened",
    "title":"Incident Triggered",
    "projectId":"{{PROJECT_ID}}"
  }'
```

```json
{
  "id": "{{NOTIFICATION_ID}}",
  "channel": "SLACK",
  "address": "#ops-alerts",
  "status": "PENDING",
  "incident": {
    "id": "{{INCIDENT_ID}}"
  },
  "alert": {
    "id": "{{ALERT_ID}}"
  },
  "message": "Incident opened",
  "title": "Incident Triggered",
  "sentAt": null,
  "createdAt": "2026-03-14T10:14:00.000Z",
  "updatedAt": "2026-03-14T10:14:00.000Z"
}
```

#### GET /teams/:teamId/projects/:projectId/notifications/by-team/:teamIdParam

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications/by-team/{{TEAM_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
[
  {
    "id": "{{NOTIFICATION_ID}}",
    "channel": "SLACK",
    "address": "#ops-alerts",
    "status": "PENDING",
    "message": "Incident opened",
    "title": "Incident Triggered",
    "sentAt": null,
    "createdAt": "2026-03-14T10:14:00.000Z",
    "updatedAt": "2026-03-14T10:14:00.000Z"
  }
]
```

#### GET /teams/:teamId/projects/:projectId/notifications/poll

```bash
curl -G "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications/poll" \
  -H "Authorization: Bearer {{TOKEN}}" \
  --data-urlencode "timeout=30000"
```

```json
{
  "id": "{{NOTIFICATION_ID}}",
  "channel": "SLACK",
  "address": "#ops-alerts",
  "status": "PENDING",
  "incident": {
    "id": "{{INCIDENT_ID}}"
  },
  "alert": {
    "id": "{{ALERT_ID}}"
  },
  "message": "Incident opened",
  "title": "Incident Triggered",
  "sentAt": null,
  "createdAt": "2026-03-14T10:14:00.000Z",
  "updatedAt": "2026-03-14T10:14:00.000Z"
}
```

#### GET /teams/:teamId/projects/:projectId/notifications

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
[
  {
    "id": "{{NOTIFICATION_ID}}",
    "channel": "SLACK",
    "address": "#ops-alerts",
    "status": "PENDING",
    "incident": {
      "id": "{{INCIDENT_ID}}"
    },
    "alert": {
      "id": "{{ALERT_ID}}"
    },
    "message": "Incident opened",
    "title": "Incident Triggered",
    "sentAt": null,
    "createdAt": "2026-03-14T10:14:00.000Z",
    "updatedAt": "2026-03-14T10:14:00.000Z"
  }
]
```

#### GET /teams/:teamId/projects/:projectId/notifications/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications/{{NOTIFICATION_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{NOTIFICATION_ID}}",
  "channel": "SLACK",
  "address": "#ops-alerts",
  "status": "PENDING",
  "incident": {
    "id": "{{INCIDENT_ID}}"
  },
  "alert": {
    "id": "{{ALERT_ID}}"
  },
  "message": "Incident opened",
  "title": "Incident Triggered",
  "sentAt": null,
  "createdAt": "2026-03-14T10:14:00.000Z",
  "updatedAt": "2026-03-14T10:14:00.000Z"
}
```

#### PATCH /teams/:teamId/projects/:projectId/notifications/:id

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications/{{NOTIFICATION_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "channel":"SLACK",
    "address":"#ops-alerts",
    "status":"SENT",
    "incidentId":"{{INCIDENT_ID}}",
    "alertId":"{{ALERT_ID}}",
    "message":"Incident acknowledged",
    "title":"Incident Update",
    "projectId":"{{PROJECT_ID}}"
  }'
```

```json
{
  "id": "{{NOTIFICATION_ID}}",
  "channel": "SLACK",
  "address": "#ops-alerts",
  "status": "SENT",
  "incident": {
    "id": "{{INCIDENT_ID}}"
  },
  "alert": {
    "id": "{{ALERT_ID}}"
  },
  "message": "Incident acknowledged",
  "title": "Incident Update",
  "sentAt": "2026-03-14T10:15:00.000Z",
  "createdAt": "2026-03-14T10:14:00.000Z",
  "updatedAt": "2026-03-14T10:15:00.000Z"
}
```

#### DELETE /teams/:teamId/projects/:projectId/notifications/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/notifications/{{NOTIFICATION_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{NOTIFICATION_ID}}",
  "channel": "SLACK",
  "address": "#ops-alerts",
  "status": "SENT",
  "incident": {
    "id": "{{INCIDENT_ID}}"
  },
  "alert": {
    "id": "{{ALERT_ID}}"
  },
  "message": "Incident acknowledged",
  "title": "Incident Update",
  "sentAt": "2026-03-14T10:15:00.000Z",
  "createdAt": "2026-03-14T10:14:00.000Z",
  "updatedAt": "2026-03-14T10:15:00.000Z"
}
```

### Alert Policy

#### POST /teams/:teamId/projects/:projectId/alert-policy

```bash
curl -X POST "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/alert-policy" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Latency + Availability Policy",
    "rules":{
      "version":"1.0",
      "rules":[
        {
          "metric":"p95",
          "operator":">",
          "threshold":300,
          "window":"5m"
        }
      ],
      "logic":"AND",
      "actions":["create_incident"],
      "suppression":{
        "cooldown":"15m",
        "maintenance":[
          {
            "start":"2026-03-20T00:00:00.000Z",
            "end":"2026-03-20T02:00:00.000Z"
          }
        ]
      }
    },
    "notificationChannels":[
      {
        "channelType":"slack",
        "address":"#ops-alerts"
      },
      {
        "channelType":"email",
        "address":"oncall@example.com"
      }
    ]
  }'
```

```json
{
  "id": "{{ALERT_POLICY_ID}}",
  "name": "Latency + Availability Policy",
  "rules": {
    "version": "1.0",
    "rules": [
      {
        "metric": "p95",
        "operator": ">",
        "threshold": 300,
        "window": "5m"
      }
    ],
    "logic": "AND",
    "actions": ["create_incident"],
    "suppression": {
      "cooldown": "15m",
      "maintenance": [
        {
          "start": "2026-03-20T00:00:00.000Z",
          "end": "2026-03-20T02:00:00.000Z"
        }
      ]
    }
  },
  "notificationChannels": [
    {
      "channelType": "slack",
      "address": "#ops-alerts"
    },
    {
      "channelType": "email",
      "address": "oncall@example.com"
    }
  ],
  "createdAt": "2026-03-14T10:16:00.000Z",
  "updatedAt": "2026-03-14T10:16:00.000Z"
}
```

#### GET /teams/:teamId/projects/:projectId/alert-policy

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/alert-policy" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
[
  {
    "id": "{{ALERT_POLICY_ID}}",
    "name": "Latency + Availability Policy",
    "rules": {
      "version": "1.0",
      "rules": [
        {
          "metric": "p95",
          "operator": ">",
          "threshold": 300,
          "window": "5m"
        }
      ],
      "logic": "AND",
      "actions": ["create_incident"],
      "suppression": {
        "cooldown": "15m",
        "maintenance": [
          {
            "start": "2026-03-20T00:00:00.000Z",
            "end": "2026-03-20T02:00:00.000Z"
          }
        ]
      }
    },
    "notificationChannels": [
      {
        "channelType": "slack",
        "address": "#ops-alerts"
      },
      {
        "channelType": "email",
        "address": "oncall@example.com"
      }
    ],
    "createdAt": "2026-03-14T10:16:00.000Z",
    "updatedAt": "2026-03-14T10:16:00.000Z"
  }
]
```

#### GET /teams/:teamId/projects/:projectId/alert-policy/:id

```bash
curl -X GET "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/alert-policy/{{ALERT_POLICY_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "id": "{{ALERT_POLICY_ID}}",
  "name": "Latency + Availability Policy",
  "rules": {
    "version": "1.0",
    "rules": [
      {
        "metric": "p95",
        "operator": ">",
        "threshold": 300,
        "window": "5m"
      }
    ],
    "logic": "AND",
    "actions": ["create_incident"],
    "suppression": {
      "cooldown": "15m",
      "maintenance": [
        {
          "start": "2026-03-20T00:00:00.000Z",
          "end": "2026-03-20T02:00:00.000Z"
        }
      ]
    }
  },
  "notificationChannels": [
    {
      "channelType": "slack",
      "address": "#ops-alerts"
    },
    {
      "channelType": "email",
      "address": "oncall@example.com"
    }
  ],
  "createdAt": "2026-03-14T10:16:00.000Z",
  "updatedAt": "2026-03-14T10:16:00.000Z"
}
```

#### PATCH /teams/:teamId/projects/:projectId/alert-policy/:id

```bash
curl -X PATCH "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/alert-policy/{{ALERT_POLICY_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Latency Policy Updated",
    "rules":{
      "version":"1.0",
      "rules":[
        {
          "metric":"p99",
          "operator":">",
          "threshold":450,
          "window":"5m"
        }
      ],
      "logic":"AND",
      "actions":["create_incident"],
      "suppression":{
        "cooldown":"10m",
        "maintenance":[]
      }
    },
    "notificationChannels":[
      {
        "channelType":"slack",
        "address":"#ops-alerts"
      }
    ]
  }'
```

```json
{
  "id": "{{ALERT_POLICY_ID}}",
  "name": "Latency Policy Updated",
  "rules": {
    "version": "1.0",
    "rules": [
      {
        "metric": "p99",
        "operator": ">",
        "threshold": 450,
        "window": "5m"
      }
    ],
    "logic": "AND",
    "actions": ["create_incident"],
    "suppression": {
      "cooldown": "10m",
      "maintenance": []
    }
  },
  "notificationChannels": [
    {
      "channelType": "slack",
      "address": "#ops-alerts"
    }
  ],
  "createdAt": "2026-03-14T10:16:00.000Z",
  "updatedAt": "2026-03-14T10:17:00.000Z"
}
```

#### DELETE /teams/:teamId/projects/:projectId/alert-policy/:id

```bash
curl -X DELETE "{{BASE_URL}}/teams/{{TEAM_ID}}/projects/{{PROJECT_ID}}/alert-policy/{{ALERT_POLICY_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

```json
{
  "affected": 1,
  "raw": []
}
```
