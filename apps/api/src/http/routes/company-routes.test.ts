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
      permissions: expect.arrayContaining(['ManageWorkspace', 'ManageColumns']),
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

  it('returns current company members for task assignment', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)

    const response = await app.inject({
      method: 'GET',
      url: '/companies/current/members',
      headers: createAuthHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Company Route Test Owner',
          role: 'OWNER',
        }),
      ]),
    )

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

  it('allows platform admins to open a company workspace without membership', async () => {
    const app = await createTestApp()
    const platformAdminSession = await registerOwnerSession(app, {
      emailPrefix: 'platform-admin',
      platformAdmin: true,
    })
    const targetCompanySession = await registerOwnerSession(app, {
      emailPrefix: 'target-owner',
    })

    await app.inject({
      method: 'GET',
      url: '/boards/current/kanban',
      headers: createAuthHeader(targetCompanySession.token),
    })

    const response = await app.inject({
      method: 'GET',
      url: `/companies/${targetCompanySession.company.id}`,
      headers: createAuthHeader(platformAdminSession.token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: targetCompanySession.company.id,
      role: 'PLATFORM_ADMIN',
      departments: [
        {
          name: 'Produto',
          boards: [
            {
              key: 'TB',
            },
          ],
        },
      ],
    })

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

  it('creates, updates and deletes departments and boards for owners', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)

    const createdDepartmentResponse = await app.inject({
      method: 'POST',
      url: '/companies/current/departments',
      headers: createAuthHeader(token),
      payload: {
        name: 'Engenharia',
      },
    })
    const department = createdDepartmentResponse
      .json()
      .departments.find((workspaceDepartment: { name: string }) => {
        return workspaceDepartment.name === 'Engenharia'
      })
    const createdBoardResponse = await app.inject({
      method: 'POST',
      url: `/companies/current/departments/${department.id}/boards`,
      headers: createAuthHeader(token),
      payload: {
        name: 'Roadmap Produto',
        description: 'Planejamento do trimestre',
      },
    })
    const board = createdBoardResponse
      .json()
      .departments.find((workspaceDepartment: { id: string }) => workspaceDepartment.id === department.id)
      .boards.find((workspaceBoard: { name: string }) => workspaceBoard.name === 'Roadmap Produto')
    const renamedDepartmentResponse = await app.inject({
      method: 'PATCH',
      url: `/companies/current/departments/${department.id}`,
      headers: createAuthHeader(token),
      payload: {
        name: 'Produto e Engenharia',
      },
    })
    const updatedBoardResponse = await app.inject({
      method: 'PATCH',
      url: `/companies/current/boards/${board.id}`,
      headers: createAuthHeader(token),
      payload: {
        name: 'Roadmap atualizado',
        description: 'Novo planejamento',
      },
    })
    const deletedBoardResponse = await app.inject({
      method: 'DELETE',
      url: `/companies/current/boards/${board.id}`,
      headers: createAuthHeader(token),
    })
    const deletedDepartmentResponse = await app.inject({
      method: 'DELETE',
      url: `/companies/current/departments/${department.id}`,
      headers: createAuthHeader(token),
    })

    expect(createdDepartmentResponse.statusCode).toBe(201)
    expect(createdBoardResponse.statusCode).toBe(201)
    expect(board).toMatchObject({
      key: 'RP',
      description: 'Planejamento do trimestre',
    })
    expect(renamedDepartmentResponse.statusCode).toBe(200)
    expect(renamedDepartmentResponse.json().departments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: department.id,
          name: 'Produto e Engenharia',
        }),
      ]),
    )
    expect(updatedBoardResponse.statusCode).toBe(200)
    expect(updatedBoardResponse.json().departments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          boards: expect.arrayContaining([
            expect.objectContaining({
              id: board.id,
              name: 'Roadmap atualizado',
              description: 'Novo planejamento',
            }),
          ]),
        }),
      ]),
    )
    expect(deletedBoardResponse.statusCode).toBe(200)
    expect(deletedDepartmentResponse.statusCode).toBe(200)
    expect(deletedDepartmentResponse.json().departments).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: department.id,
        }),
      ]),
    )

    await app.close()
  })

  it('blocks workspace structure management for members', async () => {
    const app = await createTestApp()
    const ownerSession = await registerOwnerSession(app)
    const memberToken = await createMemberToken(app, ownerSession.company.id)

    const response = await app.inject({
      method: 'POST',
      url: '/companies/current/departments',
      headers: createAuthHeader(memberToken),
      payload: {
        name: 'Bloqueado',
      },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({
      message: 'Only company owners and admins can manage workspace structure',
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

async function createMemberToken(app: FastifyInstance, companyId: string) {
  const testId = randomUUID()
  const user = await prisma.user.create({
    data: {
      name: 'Company Route Test Member',
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
