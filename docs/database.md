# TaskBoard Database

## Current Models

The current Prisma schema contains the MVP foundation:

- `User`
- `Company`
- `CompanyMember`
- `Department`
- `Board`
- `BoardColumn`
- `BoardMember`
- `Task`

The company boundary is the current tenant boundary. Every query that exposes business data must be scoped by company, department, board, or membership.

## Core Relationships

```text
Company 1 -> N CompanyMember
Company 1 -> N Department
Department 1 -> N Board
Board 1 -> N BoardColumn
Board 1 -> N Task
Board 1 -> N BoardMember
BoardColumn 1 -> N Task
User 1 -> N assigned Task
```

## Friendly Task IDs

Tasks use `friendlyId` for display, such as `TB-1`, `DEV-50`, or `SUP-120`.

Rules:

- `id` remains the internal UUID/CUID identifier
- `friendlyId` is shown in the interface
- `friendlyId` is unique per board, not globally
- `sequenceNumber` is unique per board
- `Board.nextTaskNumber` controls the next sequence

This allows multiple boards to have `TB-1` without conflicting in the database.

## Kanban Ordering

Current MVP ordering:

- `BoardColumn.position` orders columns inside a board
- `Task.position` orders tasks inside a column
- `Task` has an index on `boardId`, `columnId`, and `position`

The MVP may reorder affected tasks directly. Before scaling to large boards, evaluate a ranking strategy that avoids updating many rows on each drag, such as decimal positions or lexicographic rank strings.

## Planned Models

Add these models incrementally:

- `TaskComment`
- `TaskAttachment`
- `TaskActivity`
- `AuditLog`
- `Notification`
- `TaskWatcher`
- `Label`
- `Priority`
- `CustomFieldDefinition`
- `CustomFieldValue`
- `Permission`
- `Role`

## Indexing Guidelines

Prefer indexes that match access patterns:

- company membership lookup by `userId` and `companyId`
- boards by `departmentId`
- columns by `boardId` and `position`
- tasks by `boardId`, `columnId`, and `position`
- notifications by `userId`, `readAt`, and `createdAt`
- activities by `taskId` and `createdAt`

Avoid global queries for tenant-scoped data.

## Migration Rules

- Every schema change must include a Prisma migration.
- Run `npm run prisma:generate` after schema changes.
- Local PostgreSQL uses port `5432` by default, with documented fallback to `5433`.
- Apply migrations locally with the `DATABASE_URL` from `.env`.
