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
const testCompanyNamePrefix = 'TaskBoard Test Company'
const testEmailDomain = 'board-test.taskboard.local'

describe('board routes', () => {
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

  it('creates the initial board automatically for the authenticated company', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)

    const response = await app.inject({
      method: 'GET',
      url: '/boards/current/kanban',
      headers: createAuthHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      key: 'TB',
      name: 'TaskBoard',
      columns: [
        {
          name: 'A fazer',
          position: 1,
        },
        {
          name: 'Em progresso',
          position: 2,
        },
        {
          name: 'Concluido',
          position: 3,
        },
      ],
    })

    await app.close()
  })

  it('creates new tasks only in the first board column', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, token)
    const firstColumn = board.columns[0]
    const secondColumn = board.columns[1]

    const createdTaskResponse = await app.inject({
      method: 'POST',
      url: '/boards/current/tasks',
      headers: createAuthHeader(token),
      payload: {
        title: 'Nova tarefa permitida',
        columnId: firstColumn.id,
      },
    })
    const blockedTaskResponse = await app.inject({
      method: 'POST',
      url: '/boards/current/tasks',
      headers: createAuthHeader(token),
      payload: {
        title: 'Nova tarefa bloqueada',
        columnId: secondColumn.id,
      },
    })

    expect(createdTaskResponse.statusCode).toBe(201)
    expect(createdTaskResponse.json().columns[0].tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Nova tarefa permitida',
        }),
      ]),
    )
    expect(blockedTaskResponse.statusCode).toBe(409)
    expect(blockedTaskResponse.json()).toMatchObject({
      message: 'New tasks can only be created in the first board column',
    })

    await app.close()
  })

  it('reorders columns for company owners', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, token)
    const lastColumn = board.columns[2]

    const response = await app.inject({
      method: 'PATCH',
      url: `/boards/current/columns/${lastColumn.id}/reorder`,
      headers: createAuthHeader(token),
      payload: {
        position: 1,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().columns.map((column: { name: string }) => column.name)).toEqual([
      'Concluido',
      'A fazer',
      'Em progresso',
    ])

    await app.close()
  })

  it('blocks column management for company members', async () => {
    const app = await createTestApp()
    const ownerSession = await registerOwnerSession(app)
    await getCurrentBoard(app, ownerSession.token)
    const memberToken = await createMemberToken(app, ownerSession.company.id)

    const response = await app.inject({
      method: 'POST',
      url: '/boards/current/columns',
      headers: createAuthHeader(memberToken),
      payload: {
        name: 'Bloqueada',
        position: 1,
      },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({
      message: 'Only company owners and admins can manage board columns',
    })

    await app.close()
  })
})

async function createTestApp() {
  return buildApp({
    jwtSecret: 'test-secret-with-enough-length',
    webOrigin: 'http://localhost:5173',
    prismaClient: prisma,
  })
}

async function registerOwnerSession(app: FastifyInstance) {
  const testId = randomUUID()
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      name: 'Board Test Owner',
      email: `owner-${testId}@${testEmailDomain}`,
      password: 'password123',
      companyName: `${testCompanyNamePrefix} ${testId}`,
    },
  })

  expect(response.statusCode).toBe(201)

  return response.json() as {
    company: {
      id: string
    }
    token: string
  }
}

async function getCurrentBoard(app: FastifyInstance, token: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/boards/current/kanban',
    headers: createAuthHeader(token),
  })

  expect(response.statusCode).toBe(200)

  return response.json() as {
    columns: Array<{
      id: string
      name: string
      tasks: Array<{
        title: string
      }>
    }>
  }
}

async function createMemberToken(app: FastifyInstance, companyId: string) {
  const testId = randomUUID()
  const user = await prisma.user.create({
    data: {
      name: 'Board Test Member',
      email: `member-${testId}@${testEmailDomain}`,
      passwordHash: 'not-used-in-this-test',
      memberships: {
        create: {
          companyId,
          role: 'MEMBER',
        },
      },
    },
  })

  return app.jwt.sign({
    userId: user.id,
    email: user.email,
    companyId,
    role: 'MEMBER',
  })
}

function createAuthHeader(token: string) {
  return {
    authorization: `Bearer ${token}`,
  }
}
