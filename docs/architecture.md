# TaskBoard Architecture

TaskBoard is a multi-company work management platform for Kanban boards, tasks, bugs, stories, epics, internal tickets, and corporate support.

## Monorepo

```text
apps/api   Fastify + Prisma + PostgreSQL
apps/web   React + Vite + TypeScript + SCSS
docs       versioned documentation
scripts    local development helpers
```

## Backend Boundary

Preferred flow:

```text
HTTP route
  -> auth + Zod validation
  -> service/repository
  -> Prisma
  -> DTO or domain error
```

Responsibilities:

- Routes: HTTP validation, auth, status codes, request/response mapping.
- Services: orchestration/business rules when needed.
- Repositories: Prisma queries and persistence.
- Permission helpers: effective permission resolution and authorization decisions.
- Domain errors: explicit business failures.

Routes should not contain complex permission rules or direct Prisma access.

## Frontend Boundary

Preferred flow:

```text
Component
  -> custom hook
  -> apps/web/src/api.ts
  -> API endpoint
```

Responsibilities:

- Components render UI and receive explicit props.
- Hooks own remote state and user actions.
- `api.ts` owns HTTP calls and response parsing.
- SCSS owns presentation.

`App.tsx` should remain orchestration-oriented and should not absorb entire features indefinitely.

## Domain Hierarchy

```text
Company
  Department
    Board
      BoardColumn
      Task
```

Company is the current tenant boundary. Code should avoid global business queries that skip company/resource scoping.

## Target Modules

Backend modules should evolve incrementally toward:

- auth
- companies
- departments
- boards
- tasks
- comments
- attachments
- activities
- notifications
- permissions
- access requests
- epics
- audit
- realtime
- storage

## Event-Oriented Evolution

Future side effects should use internal domain events rather than direct coupling:

- `TaskCreated`
- `TaskUpdated`
- `TaskMoved`
- `CommentCreated`
- `AttachmentCreated`
- `NotificationCreated`
- `BoardColumnReordered`
- `EpicLinkedToTask`
- `AccessRequestCreated`

Consumers can later feed notifications, audit logs, realtime updates, and automation rules.

## MVP Boundaries

Keep the MVP incremental:

- authentication
- active company context
- departments and boards
- configurable columns
- task creation in first column
- card movement between columns
- task detail drawer
- route tests for sensitive board/task behavior
- scoped permissions introduced by slices
