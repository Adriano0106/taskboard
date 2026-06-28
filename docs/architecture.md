# TaskBoard Architecture

## Goal

TaskBoard is a multi-company work management platform for tasks, Kanban, bugs, stories, epics, internal tickets, and corporate support.

The product starts simple, but the architecture must support:

- multiple companies
- departments and teams
- multiple boards per department
- configurable columns per board
- lightweight Kanban cards
- task details loaded on demand
- permission-driven administration
- notifications, activity history, audit logs, attachments, realtime updates, and automations in future milestones

## Current Foundation

The current project is a TypeScript monorepo:

- `apps/api`: Fastify, Prisma, PostgreSQL
- `apps/web`: React, Vite, TypeScript, SCSS
- `docs`: versioned project documentation
- `scripts`: local development helpers
- `docker-compose.yml`: PostgreSQL local environment

The API is REST-first. Realtime events, queues, and storage providers are planned extension points, not required for the current MVP.

## Target Domain Modules

Backend domains should evolve toward module folders:

- `auth`
- `companies`
- `departments`
- `boards`
- `tasks`
- `comments`
- `attachments`
- `activities`
- `notifications`
- `permissions`
- `audit`
- `realtime`
- `storage`

Each module should keep clear boundaries:

- routes validate HTTP input and choose status codes
- services own business rules
- repositories own Prisma access
- DTOs define public payload shapes
- events describe side effects without coupling modules directly

## Organizational Hierarchy

The product hierarchy is:

```text
Tenant
Company
Department
Board
BoardColumn
Task
```

For the MVP, `Company` acts as the tenant boundary. Code should still avoid assumptions that would block a future explicit `Tenant` model.

## Event-Oriented Evolution

Future side effects should be emitted as internal events:

- `TaskCreated`
- `TaskUpdated`
- `TaskMoved`
- `CommentCreated`
- `AttachmentCreated`
- `NotificationCreated`
- `BoardColumnReordered`

Event consumers can later feed:

- task activity
- notifications
- WebSocket messages
- audit logs
- automation rules

This avoids direct coupling between task logic and notification, audit, or realtime modules.

## Frontend Architecture

The frontend should evolve toward feature folders:

```text
features/
  auth/
  boards/
  tasks/
  comments/
  notifications/
```

`App.tsx` should stay small and focus on root orchestration. Board and task behavior should live in feature components, hooks, and API helpers.

Remote state should move to TanStack Query before the board grows much further. Drag and drop should use optimistic updates with rollback on API failure.

## MVP Boundaries

The MVP should keep:

- authentication
- one active company per session
- initial department and board
- configurable columns for admins
- task creation only in the first column
- card movement between columns
- task detail drawer
- board route tests

Features such as comments, attachments, notifications, and permissions beyond roles should be introduced incrementally.
