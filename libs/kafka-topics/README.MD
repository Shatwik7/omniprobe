# Kafka Event Pipeline & Data Models

This lib contains the Data Transfer Objects (DTOs) and event schemas for the Monitoring Service. The architecture handles asynchronous HTTP health checks across a distributed Kafka pipeline.

---

## Pipeline Architecture

The system follows a reactive flow. An execution is requested, processed by a worker, and the outcome is routed to specific topics based on the result status.

### Event Flow Diagram
```text
       [ API / Scheduler ]
                |
                | (Topic: checks.execution.requested)
                v
       +------------------+
       |   Kafka Broker   |
       +---------+--------+
                 |
        _________v_________
       |                   |
       |  Execution Worker | ----> [ External Target URL ]
       |___________________|
                |
      __________|______________________________
     |                                         |
     | IF SUCCESS                              | IF FAILURE
     v                                         v
(Topic: checks.execution.completed)    (Topic: checks.execution.failed)
     |                                         |
     |---> [ Stats Service ]                   |---> [ Alerting Service ]
     |                                         |---> [ Incident Manager ]
```
## 🚦 Kafka Topics

| Enum Constant | Kafka Topic Name | Description |
| :--- | :--- | :--- |
| `CHECK_EXECUTION_REQUESTED` | `checks.execution.requested` | The initial task containing URL and config. |
| `CHECK_EXECUTION_COMPLETED` | `checks.execution.completed` | Emitted on 2xx-5xx responses with metrics. |
| `CHECK_EXECUTION_FAILED` | `checks.execution.failed` | Emitted on network/protocol level crashes. |
| `ALERTS_TRIGGERED` | `alerts.triggered` | Secondary event for threshold violations. |

---
