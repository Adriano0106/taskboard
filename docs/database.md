# TaskBoard Database

## Current Boundary

Company is the current tenant boundary. Every query exposing business data must be scoped through company, department, board, task, membership, or another resource relation.

## Core Relationships

```text
Company 1 -> N CompanyMember
Company 1 -> N Department
Department 1 -> N DepartmentMember
Department 1 -> N Board
Board 1 -> N BoardColumn
Board 1 -> N BoardMember
Board 1 -> N Task
BoardColumn 1 -> N Task
User 1 -> N assigned Task
```

Expanding relationships:

```text
Department 1 -> N Epic
Epic 1 -> N EpicTaskLink
Task 1 -> N EpicTaskLink
Task 1 -> N TaskComment
Task 1 -> N TaskAttachment
Task 1 -> N TaskActivity
Task 1 -> N TaskWatcher
User 1 -> N AccessRequest
```

## Friendly Task IDs

Tasks use `friendlyId` for display, such as `TB-1`, `DEV-50`, or `SUP-120`.

Rules:

- Internal `id` remains the database identifier.
- `friendlyId` is shown in the UI.
- `friendlyId` is unique per board.
- `sequenceNumber` is unique per board.
- `Board.nextTaskNumber` controls the next sequence.

## Kanban Ordering

- `BoardColumn.position` orders columns inside a board.
- `Task.position` orders tasks inside a column.
- Index tasks by board, column, and position.
- Direct reordering is acceptable for MVP.
- Revisit ranking strategy before scaling to very large boards.

## Scoped Permission Models

Use scoped memberships to avoid relying only on global company roles:

- `CompanyMember`: company relationship and company-level role.
- `DepartmentMember`: department role: `MANAGER`, `MEMBER`, `VIEWER`.
- `BoardMember`: board role: `MANAGER`, `MEMBER`, `VIEWER`.
- `AccessRequest`: request access to board/task/epic.
- `Epic`: owned by a department.
- `EpicTaskLink`: links epics to tasks across boards/departments.

## Index Guidelines

Prefer indexes that match access patterns:

- company membership by `userId` + `companyId`
- department membership by `departmentId` + `userId`
- board membership by `boardId` + `userId`
- boards by `departmentId`
- columns by `boardId` + `position`
- tasks by `boardId`, `columnId`, `position`
- access requests by requester/status/target
- epics by owner department/company
- epic task links by `epicId` and `taskId`
- notifications by `userId`, `readAt`, `createdAt`

## Migration Rules

- Every schema change must include a migration.
- Include backfill for existing data when introducing required relations/roles.
- Avoid destructive changes unless explicitly requested.
- Run Prisma format/generate only when implementing or validating schema changes.
