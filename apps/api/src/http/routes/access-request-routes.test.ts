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
const testCompanyNamePrefix = 'TaskBoard Access Request Test Company'
const testEmailDomain = 'access-request-test.taskboard.local'

describe('access request routes', () => {
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

  it('lets department managers approve board access requests', async () => {
    const app = await createTestApp()
    const ownerSession = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, ownerSession.token)
    const requesterToken = await createCompanyMemberToken(app, ownerSession.company.id, 'Requester')
    const managerToken = await createDepartmentManagerToken(app, {
      boardId: board.id,
      companyId: ownerSession.company.id,
    })

    const createResponse = await app.inject({
      method: 'POST',
      url: '/access-requests',
      headers: createAuthHeader(requesterToken),
      payload: {
        scope: 'BOARD',
        boardId: board.id,
        requestedRole: 'VIEWER',
        message: 'Preciso acompanhar este quadro',
      },
    })
    const listResponse = await app.inject({
      method: 'GET',
      url: '/access-requests',
      headers: createAuthHeader(managerToken),
    })
    const approveResponse = await app.inject({
      method: 'PATCH',
      url: `/access-requests/${createResponse.json().id}/approve`,
      headers: createAuthHeader(managerToken),
      payload: {
        decisionMessage: 'Acesso liberado',
      },
    })
    const boardResponse = await app.inject({
      method: 'GET',
      url: `/companies/${ownerSession.company.id}/boards/${board.id}/kanban`,
      headers: createAuthHeader(requesterToken),
    })

    expect(createResponse.statusCode).toBe(201)
    expect(createResponse.json()).toMatchObject({
      scope: 'BOARD',
      status: 'PENDING',
      requestedRole: 'VIEWER',
      target: {
        boardId: board.id,
      },
    })
    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json()).toEqual([
      expect.objectContaining({
        id: createResponse.json().id,
      }),
    ])
    expect(approveResponse.statusCode).toBe(200)
    expect(approveResponse.json()).toMatchObject({
      status: 'APPROVED',
      decisionMessage: 'Acesso liberado',
    })
    expect(boardResponse.statusCode).toBe(200)

    await app.close()
  })

  it('blocks regular members from reviewing access requests', async () => {
    const app = await createTestApp()
    const ownerSession = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, ownerSession.token)
    const requesterToken = await createCompanyMemberToken(app, ownerSession.company.id, 'Requester')
    const reviewerToken = await createCompanyMemberToken(app, ownerSession.company.id, 'Reviewer')

    const createResponse = await app.inject({
      method: 'POST',
      url: '/access-requests',
      headers: createAuthHeader(requesterToken),
      payload: {
        scope: 'BOARD',
        boardId: board.id,
        requestedRole: 'MEMBER',
      },
    })
    const approveResponse = await app.inject({
      method: 'PATCH',
      url: `/access-requests/${createResponse.json().id}/approve`,
      headers: createAuthHeader(reviewerToken),
      payload: {},
    })

    expect(createResponse.statusCode).toBe(201)
    expect(approveResponse.statusCode).toBe(403)
    expect(approveResponse.json()).toMatchObject({
      message: 'Only company admins or department managers can review access requests',
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
      name: 'Access Request Test Owner',
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
    id: string
  }
}

async function createCompanyMemberToken(
  app: FastifyInstance,
  companyId: string,
  nameSuffix: string,
) {
  const testId = randomUUID()
  const user = await prisma.user.create({
    data: {
      name: `Access Request Test ${nameSuffix}`,
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

async function createDepartmentManagerToken(
  app: FastifyInstance,
  input: {
    boardId: string
    companyId: string
  },
) {
  const testId = randomUUID()
  const board = await prisma.board.findUniqueOrThrow({
    where: {
      id: input.boardId,
    },
    select: {
      departmentId: true,
    },
  })
  const user = await prisma.user.create({
    data: {
      name: 'Access Request Test Manager',
      email: `manager-${testId}@${testEmailDomain}`,
      passwordHash: 'not-used-in-this-test',
      memberships: {
        create: {
          companyId: input.companyId,
          role: 'MEMBER',
        },
      },
      departmentMembers: {
        create: {
          departmentId: board.departmentId,
          role: 'MANAGER',
        },
      },
    },
  })

  return app.jwt.sign({
    userId: user.id,
    email: user.email,
    companyId: input.companyId,
    role: 'MEMBER',
  })
}

function createAuthHeader(token: string) {
  return {
    authorization: `Bearer ${token}`,
  }
}
