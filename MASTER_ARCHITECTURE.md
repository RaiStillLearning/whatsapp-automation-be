# WhatsApp Automation SaaS — Master Architecture

## Overview

A WhatsApp automation SaaS platform for Indonesian small businesses and online sellers.

Core goals:
- automate repetitive replies
- reduce manual chat handling
- simplify customer workflows
- provide operational reliability

---

# Product Philosophy

The product should prioritize:
- simplicity
- reliability
- operational clarity
- fast onboarding
- low technical friction

Avoid:
- enterprise complexity
- premature scaling
- overengineering
- AI-first architecture

---

# Core Product Flow

Landing
↓
Signup/Login
↓
Onboarding
↓
Connect WhatsApp
↓
Create Automation
↓
Automation Active
↓
Dashboard & Activity

---

# Core Automation Flow

Incoming Message
↓
Normalize Message
↓
Store Raw Event
↓
Push Queue Job
↓
Worker Processes Automation
↓
Execute Action
↓
Send Reply
↓
Store Logs

---

# Tech Stack

## Frontend
- Next.js
- TypeScript
- TailwindCSS
- React Query
- Zustand (minimal usage)

## Backend
- Node.js
- Fastify
- Prisma
- PostgreSQL

## Queue
- Redis
- BullMQ

## WhatsApp
- whatsapp-web.js

---

# Architecture Principles

The system should:
- remain monolithic initially
- prioritize reliability
- isolate user sessions
- process heavy tasks asynchronously
- avoid hidden abstractions

---

# Important Constraints

DO NOT:
- introduce microservices early
- overbuild AI systems
- create unnecessary abstractions
- optimize prematurely

PRIORITIZE:
- maintainability
- operational stability
- observability
- predictable architecture

---

# Multi-User Architecture

Each user must have:
- isolated WhatsApp sessions
- isolated automations
- isolated message processing

Avoid:
- global singleton clients
- shared session state

---

# Session Architecture

The system should:
- support QR authentication
- persist sessions
- restore sessions on restart
- reconnect safely
- handle disconnect gracefully

Detailed reference:
`/docs/infrastructure/SESSION_ARCHITECTURE.md`

---

# Authentication

Authentication strategy:
- JWT
- HTTP-only cookies
- protected dashboard routes
- middleware-based redirects

Detailed reference:
`/docs/backend/AUTH_FLOW.md`

---

# Frontend Standards

Frontend priorities:
- predictable architecture
- feature-based structure
- reusable components
- typed API communication

Detailed reference:
`/docs/frontend/FRONTEND_STANDARDS.md`

---

# Backend Standards

Backend priorities:
- service/repository separation
- queue-first async processing
- centralized logging
- schema validation

Detailed reference:
`/docs/backend/BACKEND_STANDARDS.md`

---

# Automation Engine

Automation system supports:
- keyword matching
- scheduled automation
- trigger/action workflows

Detailed reference:
`/docs/automation/AUTOMATION_ENGINE.md`

---

# Queue Processing

Queues are responsible for:
- message processing
- retries
- scheduled jobs
- failed job handling

Heavy processing should NEVER happen inside request handlers.

---

# Reliability & Observability

The system must support:
- structured logging
- reconnect tracking
- failed job tracking
- queue monitoring
- session health monitoring

Detailed reference:
`/docs/observability/MONITORING.md`

---

# Failure Modes

The system should handle:
- WhatsApp disconnects
- duplicate events
- queue failures
- Redis downtime
- DB connection exhaustion
- worker crashes

Detailed reference:
`/docs/infrastructure/FAILURE_MODES.md`

---

# API Standards

All APIs should:
- use typed contracts
- use consistent response shapes
- validate external input

Detailed reference:
`/docs/api/API_CONTRACT.md`

---

# AI Agent Rules

AI agents working on this project must:
- follow architecture constraints
- avoid overengineering
- respect feature boundaries
- follow frontend/backend standards
- avoid introducing unnecessary abstractions
- maintain consistent naming conventions

---

# Engineering Philosophy

The goal is NOT:
- trendy architecture
- artificial complexity
- AI hype systems

The goal IS:
- simple reliable automation
- operational clarity
- maintainable systems
- fast iteration
- strong product usability