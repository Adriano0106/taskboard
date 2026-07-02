# TaskBoard — Project Context

TaskBoard is a multi-company work management platform for Kanban boards, tasks, bugs, stories, epics, internal tickets, attachments, comments, notifications, and corporate support.

## Stack

- Monorepo TypeScript.
- `apps/api`: Fastify, Prisma, PostgreSQL, Vitest.
- `apps/web`: React, Vite, TypeScript, SCSS.
- `docs`: project documentation.
- Local database through Docker/PostgreSQL.

## Architecture Summary

Backend flow:

```text
Route -> validation/auth -> service or repository -> Prisma -> domain result/error
```

Frontend flow:

```text
Component -> custom hook -> apps/web/src/api.ts -> API endpoint
```

Rules:

- Routes should stay thin.
- Repositories own database access.
- Hooks own remote state behavior.
- Components should render and delegate behavior.
- Company is the current tenant boundary.

## Domain Hierarchy

```text
Company
Department
Board
BoardColumn
Task
```

Planned/expanding domain:

```text
Epic
EpicTaskLink
TaskComment
TaskAttachment
TaskActivity
Notification
TaskWatcher
AccessRequest
AuditLog
```

## Permissions Direction

The product is moving from global company roles to scoped roles resolved into effective permissions.

Precedence:

```text
PlatformAdmin > CompanyAdmin > DepartmentManager > BoardManager > Member > Viewer
```

Scopes:

- platform
- company
- department
- board
- task/epic when needed

Viewer is read-only.

## Current Important Product Rules

- Task creation starts in the first board column.
- Board columns are configurable by authorized users.
- Friendly task IDs are unique per board.
- Department members inherit access to boards in that department.
- Board members can override/grant board-specific access.
- Epics have an owner department but can link tasks from multiple boards/departments.
- Users assigned to tasks or epics can receive notifications but do not automatically gain administrative permission.

## Documentation Map

- `docs/architecture.md`: architecture boundaries and module direction.
- `docs/database.md`: data model, indexes, migrations.
- `docs/permissions.md`: scoped permission model.
- `docs/api.md`: API route conventions and endpoint structure.
- `docs/kanban.md`: board/task UX behavior.
- `docs/notifications.md`: notification direction.
- `docs/deployment.md`: local/deploy notes.

