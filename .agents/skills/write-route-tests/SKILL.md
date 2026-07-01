---
name: write-route-tests
description: Write integration tests for a TaskBoard API route using Vitest, Fastify inject, and a real PostgreSQL test database, following the established test helper patterns.
---

# Skill: Write Route Tests

## Context

The TaskBoard API uses **Vitest** for integration testing. Tests make real HTTP calls via `app.inject()` against a real PostgreSQL database (typically port 5433 for test isolation).

Existing test files:
- `apps/api/src/http/routes/board-routes.test.ts` — most comprehensive, use as reference
- `apps/api/src/http/routes/company-routes.test.ts`
- `apps/api/src/http/routes/auth-routes.test.ts`

## Test File Structure

```ts
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../../app.js'

config({ path: resolve(process.cwd(), '../../.env') })

// Fallback test DB URL (port 5433 to avoid conflict with dev DB)
process.env.DATABASE_URL ??= 'postgresql://taskboard:taskboard@localhost:5433/taskboard?schema=public'

const prisma = new PrismaClient()

// Use a unique prefix+domain to isolate and clean up test data
const testCompanyNamePrefix = 'TaskBoard Test Company'
const testEmailDomain = 'my-feature-test.taskboard.local'
const platformAdminEmail = `platform-admin@${testEmailDomain}`

describe('my feature routes', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterEach(async () => {
    // Clean up all test data created during the test
    await prisma.company.deleteMany({ where: { name: { startsWith: testCompanyNamePrefix } } })
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${testEmailDomain}` } } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('does something successfully', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)

    const response = await app.inject({
      method: 'POST',
      url: '/my-endpoint',
      headers: createAuthHeader(token),
      body: { name: 'Test Item' },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ name: 'Test Item' })
  })
})
```

## Test Helper Functions

Copy and adapt these from `board-routes.test.ts`:

```ts
function createTestApp(options = {}) {
  return buildApp({
    jwtSecret: 'test-secret',
    platformAdminEmails: [platformAdminEmail],
    webOrigin: 'http://localhost:5173',
    ...options,
  })
}

function createAuthHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function registerOwnerSession(app: FastifyInstance) {
  const uniqueSuffix = randomUUID()
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/auth/register',
    body: {
      name: 'Test Owner',
      email: `owner-${uniqueSuffix}@${testEmailDomain}`,
      password: 'password123',
      companyName: `${testCompanyNamePrefix} ${uniqueSuffix}`,
    },
  })
  return registerResponse.json() as { token: string; user: { id: string }; company: { id: string } }
}

async function registerMemberSession(app: FastifyInstance, ownerToken: string) {
  const uniqueSuffix = randomUUID()
  const memberEmail = `member-${uniqueSuffix}@${testEmailDomain}`
  // Create member via owner
  await app.inject({
    method: 'POST',
    url: '/companies/current/members',
    headers: createAuthHeader(ownerToken),
    body: { name: 'Test Member', email: memberEmail, password: 'password123', role: 'MEMBER' },
  })
  // Log in as member
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/auth/login',
    body: { email: memberEmail, password: 'password123' },
  })
  return loginResponse.json() as { token: string; user: { id: string } }
}
```

## Required Test Coverage

Every mutating endpoint should have tests for:

| Scenario | Expected status |
|----------|----------------|
| Successful operation (owner) | 200 or 201 |
| Successful operation (admin) | 200 or 201 |
| Missing/invalid body fields | 400 |
| Unauthenticated request | 401 |
| MEMBER tries admin-only action | 403 or 409 |
| Resource not found | 404 |
| Cross-company access attempt | 403 or 404 |
| Conflict (duplicate, constraint) | 409 |

## Running Tests

```bash
# All tests
npm run test

# Just the API
npm run test --workspace @taskboard/api

# Specific file
cd apps/api && npx vitest run src/http/routes/my-routes.test.ts
```

> Tests require a running PostgreSQL instance. The test DB is typically on port `5433`. Start it with `docker compose up -d postgres`.

## Tips

- Use `randomUUID()` for unique email/company names to avoid test cross-contamination.
- `afterEach` should always clean up by prefix/domain, not by ID (IDs are created dynamically).
- Use `app.inject()` for all HTTP calls — don't import repository functions directly in tests.
- `toMatchObject()` is preferred over `toEqual()` for partial shape assertions.
