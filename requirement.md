# Backend Engineering Standards

Project: WhatsApp Automation SaaS  
Runtime: Node.js  
Framework: Fastify  
Language: TypeScript

---

# Core Philosophy

Backend should prioritize:
- reliability
- predictability
- maintainability
- operational clarity
- explicit architecture

Avoid unnecessary abstractions and premature complexity.

---

# Backend Principles

## REQUIRED
- clear separation of concerns
- typed request/response
- centralized error handling
- structured logging
- queue-first async processing
- explicit business logic
- idempotent operations
- schema validation

## FORBIDDEN
- fat controllers
- random utility dumping
- business logic inside routes
- direct DB queries everywhere
- hidden side effects
- untyped payloads
- silent failures
- premature microservices

---

# Tech Stack

## Runtime
- Node.js

## Framework
- Fastify

## Database
- PostgreSQL

## ORM
- Prisma

## Queue
- Redis
- BullMQ

## Validation
- Zod

## Logging
- Pino

---

# Folder Structure

```text
src/
│
├── modules/
├── routes/
├── services/
├── repositories/
├── workers/
├── queues/
├── middleware/
├── lib/
├── utils/
├── constants/
├── types/
├── schemas/
├── config/
└── plugins/
```

---

# Folder Responsibilities

---

# modules/

Feature-based backend modules.

Example:
```text
modules/
  auth/
  messages/
  automations/
  whatsapp/
```

Each module may contain:
```text
controller.ts
service.ts
repository.ts
schema.ts
types.ts
```

---

# routes/

Route registration only.

DO NOT place:
- business logic
- DB queries
- queue logic

---

# services/

Business logic layer.

Responsibilities:
- orchestration
- workflows
- validations
- queue dispatching
- external integrations

---

# repositories/

Database access layer.

Responsibilities:
- Prisma queries
- DB abstraction
- query composition

Rules:
- DB access only
- no business logic

---

# workers/

Background job processors.

Responsibilities:
- queue job execution
- retries
- scheduled processing
- async workflows

---

# queues/

Queue definitions and queue configuration.

Examples:
```text
message.queue.ts
retry.queue.ts
scheduler.queue.ts
```

---

# middleware/

Request lifecycle middleware.

Examples:
```text
auth.middleware.ts
rate-limit.middleware.ts
```

---

# lib/

Low-level shared infrastructure.

Examples:
```text
prisma.ts
redis.ts
logger.ts
```

---

# Naming Conventions

---

# Files

## Use kebab-case

```text
message.service.ts
automation.repository.ts
```

---

# Classes

Use PascalCase.

```ts
class MessageService
```

---

# Functions

Use camelCase.

```ts
getMessages()
createAutomation()
processIncomingMessage()
```

---

# Boolean Variables

Use explicit naming.

GOOD:
```ts
isConnected
hasSession
canRetry
```

BAD:
```ts
flag
status
check
```

---

# Database Naming

## Tables
Use snake_case plural.

GOOD:
```text
users
message_logs
automation_rules
```

---

## Columns
Use snake_case.

GOOD:
```text
created_at
user_id
retry_count
```

---

# Route Standards

---

# REQUIRED

Routes should:
- validate payloads
- remain thin
- delegate logic to services

---

# GOOD

```ts
fastify.post("/messages", controller.createMessage)
```

---

# BAD

```ts
fastify.post("/messages", async () => {
  // 200 lines of logic
})
```

---

# Controller Rules

Controllers should:
- parse request
- validate input
- call services
- return response

Controllers are NOT:
- workflow engines
- DB access layers
- queue processors

---

# Service Layer Rules

Services contain:
- business logic
- orchestration
- workflow handling

Example:
```ts
messageService.processIncomingMessage()
```

---

# Repository Rules

Repositories should:
- isolate Prisma queries
- centralize DB access
- avoid duplicated queries

---

# FORBIDDEN

DO NOT:
```ts
prisma.user.findMany()
```

everywhere randomly.

---

# Validation Standards

All external input MUST be validated.

Use:
- Zod schemas

---

# REQUIRED

Validate:
- request body
- query params
- headers
- webhook payloads

---

# Example

```ts
const schema = z.object({
  phone: z.string(),
})
```

---

# Error Handling

## REQUIRED

Use centralized error handling.

All errors should:
- have consistent shape
- include error codes
- be loggable

---

# DO NOT

```ts
catch (e) {}
```

Silent failure is forbidden.

---

# Logging Standards

Use structured logging.

Required fields:
```text
request_id
user_id
job_id
event_type
timestamp
```

---

# DO NOT

Use random:
```ts
console.log()
```

in production code.

---

# Queue Standards

---

# Queue Philosophy

Webhook handlers should:
- respond fast
- delegate heavy work to workers

---

# REQUIRED

Use queues for:
- message processing
- retries
- scheduled jobs
- analytics aggregation

---

# Job Requirements

Jobs must support:
- retries
- backoff
- idempotency
- deduplication

---

# Idempotency Rules

System MUST tolerate duplicate events.

Examples:
- duplicate webhooks
- retry storms
- network retries

---

# DO NOT

Assume events arrive exactly once.

Distributed systems do not work that way.

---

# Worker Standards

Workers should:
- process one responsibility
- remain stateless
- be retry-safe

---

# Database Standards

---

# REQUIRED
- transactions where needed
- indexed frequently queried columns
- pagination for large datasets

---

# FORBIDDEN
- SELECT *
- unbounded queries
- N+1 query patterns

---

# Security Standards

## REQUIRED
- rate limiting
- authentication middleware
- input sanitization
- webhook verification
- secure env handling

---

# Secrets

NEVER:
- hardcode credentials
- expose secrets in logs
- commit `.env`

---

# Observability

Backend MUST include:
- structured logs
- queue monitoring
- worker monitoring
- request tracing
- error tracking

Recommended:
- Sentry
- Grafana
- PostHog

---

# Performance Philosophy

DO NOT optimize blindly.

Measure:
- DB latency
- queue latency
- worker throughput
- memory usage
- request timing

---

# Premature Optimization Rules

Avoid:
- unnecessary caching
- unnecessary microservices
- complex event buses
- distributed architecture early

---

# API Standards

## Response Shape

Use consistent API responses.

GOOD:
```json
{
  "success": true,
  "data": {}
}
```

---

# Error Shape

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid payload"
  }
}
```

---

# Async Processing Philosophy

Backend should:
- minimize blocking operations
- push heavy tasks to queues
- remain responsive under load

---

# Engineering Priorities

## PRIORITIZE
- reliability
- observability
- simplicity
- explicit architecture
- operational stability

## AVOID
- architecture cosplay
- abstraction addiction
- hidden complexity
- framework magic dependency

---

# Final Rule

Every backend abstraction must justify:
- operational value
- maintainability
- reduced complexity
- measurable benefit

Otherwise:
DO NOT ADD IT.