---
name: add-repository-function
description: Add a new data access function to the TaskBoard repository layer following established Prisma, permission checking, domain error, and transaction patterns.
---

# Skill: Add Repository Function

## Context

The TaskBoard API uses a **repository pattern** with raw `PrismaClient`. Repositories live in `apps/api/src/repositories/` and are grouped by domain:

| File | Responsibility |
|------|---------------|
| `board-task-repository.ts` | Create, move, update tasks |
| `board-column-repository.ts` | Create, rename, delete, reorder columns |
| `board-query-repository.ts` | Read-only board and task queries |
| `board-repository.ts` | Re-exports from the above three |
| `company-repository.ts` | Company, department, board, member CRUD |
| `task-comment-repository.ts` | Task comments |
| `task-watcher-repository.ts` | Task watchers |
| `task-activity-repository.ts` | Read-only activity queries |
| `task-attachment-repository.ts` | Attachment upload/download/delete |
| `user-repository.ts` | User lookup for auth |

## Function Signature Pattern

```ts
import type { PrismaClient } from '@prisma/client'
import { assertCompanyPermission } from '../permissions.js'
import { BoardError } from './board-types.js'

export interface MyActionInput {
  prisma?: PrismaClient   // sometimes passed by callers; usually injected
  companyId: string
  userId: string
  companyRole: string     // used for permission check
  // ... domain fields
}

export async function myDomainAction(
  prisma: PrismaClient,
  input: MyActionInput,
): Promise<ReturnType> {
  // 1. Assert permission
  assertCompanyPermission(input.companyRole, 'SomePermission', (message) => new BoardError(message))

  // 2. Load and validate target resource
  const resource = await prisma.myModel.findUnique({ where: { id: input.resourceId } })
  if (!resource || resource.companyId !== input.companyId) {
    throw new BoardError('Resource not found')
  }

  // 3. Use $transaction for multi-step writes
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.myModel.update({
      where: { id: resource.id },
      data: { /* ... */ },
    })
    // side effect: activity
    await createTaskActivity(transaction, { /* ... */ })
    return updated
  })
}
```

## Domain Error Classes

- `BoardError` — used in `board-*` repositories
- `CompanyError` — used in `company-repository.ts`

Both extend `Error`. Routes catch them and map to HTTP status codes.

## Permission Checks

Always call `assertCompanyPermission` at the top of mutating functions before any DB access:

```ts
import { assertCompanyPermission } from '../permissions.js'

assertCompanyPermission(input.companyRole, 'CreateTask', (message) => new BoardError(message))
```

Available permissions: `ManageWorkspace`, `DeleteBoard`, `ManageColumns`, `CreateTask`, `EditTask`, `MoveTask`, `CommentTask`, `ManageTaskWatchers`, `ManageTaskAttachments`.

## Activity Logging

After a successful write, log an activity via `createTaskActivity` from `task-activity-writer.ts`:

```ts
import { createTaskActivity } from './task-activity-writer.js'

await createTaskActivity(transaction, {
  taskId: task.id,
  actorId: input.userId,
  type: 'TITLE_CHANGED',     // TaskActivityType enum value
  metadata: { previous: 'Old Title', next: 'New Title' },
})
```

Available `TaskActivityType` values:
`CREATED`, `COMMENTED`, `MOVED`, `TITLE_CHANGED`, `DESCRIPTION_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`, `WATCHER_ADDED`, `WATCHER_REMOVED`, `ATTACHMENT_ADDED`, `ATTACHMENT_REMOVED`.

## Board Query Helpers

Use the shared query helpers from `board-query-repository.ts`:
- `getCompanyKanbanBoard(prisma, input)` — load a board, verify it belongs to the company
- `getOrCreateCompanyKanbanBoard(prisma, input)` — idempotent board creation
- `getKanbanTaskDetail(prisma, input)` — load full task detail
- `boardInclude` — Prisma include spec for full board with columns and tasks
- `mapBoardToKanbanBoard(board)` — maps Prisma board to the `KanbanBoard` return shape

## Company Scope Guard

All repository functions must verify the target resource belongs to the caller's company. Use the pattern:

```ts
if (!resource || resource.companyId !== input.companyId) {
  throw new BoardError('Resource not found')
}
```

Do not leak cross-company data. Never skip this check.

## Transactions

Use `prisma.$transaction(async (tx) => { ... })` for any operation that touches multiple tables or requires atomicity (e.g., creating a task + incrementing `nextTaskNumber`, reordering columns).
