---
name: add-api-route
description: Add a new Fastify API route to the TaskBoard backend following the established patterns for validation, authorization, error handling, and repository delegation.
---

# Skill: Add API Route

## Context

The TaskBoard API is built with **Fastify + Prisma + Zod + TypeScript**.

Routes live in `apps/api/src/http/routes/`. There are two main route files:
- `company-routes.ts` — company, department, board, and member management
- `board-routes.ts` — kanban boards, columns, tasks, comments, watchers, attachments, activities
- `auth-routes.ts` — login, register, current session

Each route file is a Fastify plugin function registered in `apps/api/src/app.ts`.

## Route File Pattern

```ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { SomeDomainError, someDomainFunction } from '../../repositories/some-repository.js'
import { authenticateRequest } from '../auth-guard.js'

// 1. Define Zod schemas for params and body
const myParamsSchema = z.object({
  resourceId: z.string().min(1),
})

const myBodySchema = z.object({
  name: z.string().trim().min(2),
})

// 2. Export as async Fastify plugin
export async function myRoutes(app: FastifyInstance) {
  // 3. Register each endpoint with preHandler for auth
  app.post('/my-resource', { preHandler: authenticateRequest }, async (request, reply) => {
    const bodyValidation = myBodySchema.safeParse(request.body)

    if (!bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid payload',
        issues: bodyValidation.error.flatten().fieldErrors,
      })
    }

    try {
      const result = await someDomainFunction(prisma, {
        userId: request.user.userId,
        companyId: request.user.companyId,
        ...bodyValidation.data,
      })

      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof SomeDomainError) {
        return reply.status(409).send({ message: error.message })
      }
      throw error
    }
  })
}
```

## Error Handling

- Use custom domain error classes (`BoardError`, `CompanyError`) in repositories.
- Routes catch domain errors and return appropriate HTTP status codes.
- Use the `getCompanyErrorStatus()` pattern for 403/409/404 discrimination based on error message content when needed.
- Never `throw` generic errors from routes — only domain-specific ones or re-throw for Fastify's default handler.

## Authorization

- Protected routes must include `{ preHandler: authenticateRequest }`.
- `request.user` exposes `{ userId, companyId, email, companyRole }`.
- Permission checks use `assertCompanyPermission(companyRole, 'PermissionName', createError)` from `apps/api/src/permissions.ts`.
- Route code should not contain inline role string comparisons — always go through the permission helper.

## Repository Delegation

- Routes validate HTTP input only. Business logic lives in repositories.
- Repositories in `apps/api/src/repositories/` are split by domain:
  - `board-task-repository.ts` — CRUD for tasks
  - `board-column-repository.ts` — CRUD for columns
  - `board-query-repository.ts` — read-only queries
  - `company-repository.ts` — company, department, board, member ops
  - `task-comment-repository.ts`, `task-watcher-repository.ts`, `task-activity-repository.ts`, `task-attachment-repository.ts`

## Registration

After creating a new route file, register it in `apps/api/src/app.ts`:

```ts
await app.register(myRoutes)
```

## Testing

Route tests live alongside route files (e.g., `board-routes.test.ts`).
- Use `vitest` with `app.inject()` for HTTP testing.
- Create real DB records in `beforeEach` / `afterEach` using a dedicated test email domain.
- Cover: success case, validation error (400), unauthorized (401), wrong company (403/404), conflict (409).

See `board-routes.test.ts` for the complete test helper setup pattern (`registerOwnerSession`, `createAuthHeader`, `createTestApp`).
