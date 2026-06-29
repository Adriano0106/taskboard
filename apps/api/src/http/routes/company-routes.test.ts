import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../../app.js'

config({
  path: resolve(process.cwd(), '../../.env'),
})

process.env.DATABASE_URL ??=
  'postgresql://taskboard:taskboard@localhost:5433/taskboard?schema=public'

const prisma = new PrismaClient()
const testCompanyNamePrefix = 'TaskBoard Company Route Test'
const testEmailDomain = 'company-route-test.taskboard.local'

describe('company routes', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterEach(async () => {
    await prisma.company.deleteMany({
      where: {
        name: {
          startsWith: testCompanyNamePrefix,
        },
      },
    })
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: `@${testEmailDomain}`,
        },
      },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('returns the authenticated company workspace with departments and boards', async () => {
    const app = await createTestApp()
    const { company, token } = await registerOwnerSession(app)

    await app.inject({
      method: 'GET',
      url: '/boards/current/kanban',
      headers: createAuthHeader(token),
    })

    const response = await app.inject({
      method: 'GET',
      url: `/companies/${company.id}`,
      headers: createAuthHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: company.id,
      name: company.name,
      role: 'OWNER',
      departments: [
        {
          name: 'Produto',
          boards: [
            {
              key: 'TB',
              name: 'TaskBoard',
            },
          ],
        },
      ],
    })

    await app.close()
  })

  it('allows configured platform admins to list every company', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app, {
      emailPrefix: 'platform-admin',
      platformAdmin: true,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/admin/companies',
      headers: createAuthHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringContaining(testCompanyNamePrefix),
          memberCount: 1,
        }),
      ]),
    )

    await app.close()
  })

  it('blocks platform company listing for regular users', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)

    const response = await app.inject({
      method: 'GET',
      url: '/admin/companies',
      headers: createAuthHeader(token),
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({
      message: 'Platform admin access required',
    })

    await app.close()
  })
})

async function createTestApp() {
  return buildApp({
    jwtSecret: 'test-secret-with-enough-length',
    platformAdminEmails: [`platform-admin@${testEmailDomain}`],
    webOrigin: 'http://localhost:5173',
    prismaClient: prisma,
  })
}

async function registerOwnerSession(
  app: FastifyInstance,
  options: {
    emailPrefix?: string
    platformAdmin?: boolean
  } = {},
) {
  const testId = randomUUID()
  const email = options.platformAdmin
    ? `platform-admin@${testEmailDomain}`
    : `${options.emailPrefix ?? 'owner'}-${testId}@${testEmailDomain}`
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      name: 'Company Route Test Owner',
      email,
      password: 'password123',
      companyName: `${testCompanyNamePrefix} ${testId}`,
    },
  })

  expect(response.statusCode).toBe(201)

  return response.json() as {
    company: {
      id: string
      name: string
    }
    token: string
  }
}

function createAuthHeader(token: string) {
  return {
    authorization: `Bearer ${token}`,
  }
}
