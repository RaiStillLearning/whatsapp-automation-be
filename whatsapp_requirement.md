# WhatsApp Session & QR Authentication Architecture

## Overview

This document describes the WhatsApp session lifecycle, QR authentication flow, session persistence strategy, reconnect handling, and multi-user architecture for the WhatsApp Automation SaaS platform.

The goal is to build:
- reliable session handling
- isolated multi-user WhatsApp clients
- reconnect-safe architecture
- scalable session management
- maintainable operational flows

---

# Core Architecture

```text
Frontend
↓
Backend API
↓
WhatsApp Manager
↓
WhatsApp Clients
↓
WhatsApp Web
```

---

# Architecture Philosophy

The system should:
- support multiple users
- isolate sessions safely
- persist sessions across restarts
- avoid shared global client state
- minimize reconnect friction
- handle disconnects gracefully

Avoid:
- singleton WhatsApp client architecture
- session mixing between users
- in-memory-only session storage
- tightly coupled session logic

---

# WhatsApp Manager Layer

## Purpose

The WhatsApp Manager is responsible for:
- creating WhatsApp clients
- restoring sessions
- reconnect handling
- destroying invalid sessions
- tracking connection state
- isolating clients per user

The WhatsApp Manager acts as the central orchestration layer for all WhatsApp client lifecycle operations.

---

# Multi-User Session Architecture

Each authenticated user must have:
- isolated WhatsApp sessions
- isolated automation rules
- isolated message processing
- isolated reconnect lifecycle

The system must prevent:
- cross-user session leakage
- shared client state
- global singleton usage
- shared authentication context

---

# Session Lifecycle

## Session States

Possible session states:

```text
initializing
qr_pending
authenticated
disconnected
reconnecting
expired
failed
destroyed
```

---

# Session Lifecycle Flow

```text
User requests connection
↓
WhatsApp client initialized
↓
QR code generated
↓
User scans QR
↓
Session authenticated
↓
Session persisted
↓
Ready for automation processing
```

---

# QR Authentication Flow

## Flow

1. User clicks "Connect WhatsApp"
2. Backend initializes WhatsApp Web client
3. WhatsApp Web generates QR code
4. Backend receives QR payload
5. QR image sent to frontend
6. User scans QR using mobile WhatsApp
7. Session becomes authenticated
8. Session is persisted
9. Frontend updates connection status

---

# QR UX Requirements

The QR connection experience should:
- feel simple
- reduce confusion
- display clear instructions
- show loading states
- handle expiration gracefully

Frontend should display:
- QR loading state
- QR expiration state
- reconnect button
- connection success state

---

# Session Persistence

## Requirements

Authenticated sessions must:
- survive backend restarts
- restore automatically
- avoid unnecessary QR rescans
- maintain stable connectivity

---

# Initial Persistence Strategy

Use:
- `LocalAuth` from `whatsapp-web.js`

Initial storage strategy:
- filesystem-based persistence

---

# Future Storage Considerations

Possible future improvements:
- encrypted session storage
- distributed session storage
- database-backed persistence
- external object storage

DO NOT implement prematurely.

---

# Session Restoration

## Requirements

The system should:
- restore valid sessions automatically
- reconnect existing sessions on startup
- detect invalid sessions
- safely destroy corrupted sessions

---

# Reconnect Handling

## Requirements

The system should:
- automatically reconnect disconnected clients
- limit reconnect retries
- notify frontend of session changes
- handle reconnect failures safely

---

# Reconnect Strategy

```text
Disconnected
↓
Attempt reconnect
↓
If success:
    restore session
Else:
    mark session expired
↓
Request user reconnect
```

---

# Expired Sessions

A session may become expired due to:
- manual logout
- WhatsApp invalidation
- device unlink
- authentication corruption

When expired:
- client must be destroyed safely
- frontend should request re-authentication
- QR reconnect flow should restart

---

# WhatsApp Client Responsibilities

Each WhatsApp client instance should:
- maintain isolated authentication
- process messages for a single user
- emit connection lifecycle events
- emit incoming message events
- support reconnect handling

---

# Message Flow

```text
Incoming WhatsApp Message
↓
WhatsApp Client Event
↓
Backend Event Handler
↓
Store Raw Message
↓
Push Queue Job
↓
Worker Processes Automation
↓
Send Reply
↓
Store Logs
```

---

# Queue Integration

Queue system responsibilities:
- incoming message processing
- retries
- delayed jobs
- scheduled automation
- failed message handling

The WhatsApp client should NEVER process heavy automation logic directly.

Heavy processing must go through queues.

---

# Reliability Requirements

The system must:
- tolerate reconnects
- survive backend restarts
- avoid duplicate processing
- isolate user failures
- recover gracefully

---

# Operational Constraints

DO NOT:
- use global singleton clients
- tightly couple clients to routes
- process automation synchronously
- trust in-memory session state only

PRIORITIZE:
- session isolation
- reconnect safety
- operational simplicity
- maintainability
- observability

---

# Logging Requirements

The system should log:
- client initialization
- QR generation
- successful authentication
- disconnect events
- reconnect attempts
- session expiration
- automation execution
- message failures

---

# Observability

Recommended monitoring:
- session health tracking
- reconnect tracking
- active client count
- failed reconnect metrics
- queue latency
- worker failures

---

# Future Scaling Considerations

Potential future improvements:
- distributed workers
- dedicated WhatsApp worker services
- horizontal scaling
- centralized session orchestration

DO NOT implement before:
- real user growth
- measurable operational bottlenecks

---

# Engineering Philosophy

The goal is NOT:
- advanced distributed architecture
- enterprise complexity
- premature scaling

The goal IS:
- reliable session handling
- stable automation execution
- predictable operational behavior
- simple maintainable systems