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
const platformAdminEmail = `platform-admin@${testEmailDomain}`

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

  it('loads a company board by its public route ids', async () => {
    const app = await createTestApp()
    const { company, token } = await registerOwnerSession(app)
    const currentBoard = await getCurrentBoard(app, token)

    const response = await app.inject({
      method: 'GET',
      url: `/companies/${company.id}/boards/${currentBoard.id}/kanban`,
      headers: createAuthHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: currentBoard.id,
      key: 'TB',
      name: 'TaskBoard',
    })

    await app.close()
  })

  it('allows platform admins to load a company board without membership', async () => {
    const app = await createTestApp()
    const { company, token } = await registerOwnerSession(app)
    const currentBoard = await getCurrentBoard(app, token)
    const platformAdminToken = await createPlatformAdminToken(app, company.id)

    const response = await app.inject({
      method: 'GET',
      url: `/companies/${company.id}/boards/${currentBoard.id}/kanban`,
      headers: createAuthHeader(platformAdminToken),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: currentBoard.id,
      key: 'TB',
    })

    await app.close()
  })

  it('creates new tasks only in the first board column', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, token)
    const firstColumn = getBoardColumn(board, 0)
    const secondColumn = getBoardColumn(board, 1)

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

  it('creates tasks with description and priority metadata', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, token)
    const firstColumn = getBoardColumn(board, 0)

    const createdTaskResponse = await app.inject({
      method: 'POST',
      url: '/boards/current/tasks',
      headers: createAuthHeader(token),
      payload: {
        title: 'Tarefa urgente com detalhes',
        description: 'Descricao inicial da tarefa',
        priority: 'URGENT',
        columnId: firstColumn.id,
      },
    })

    expect(createdTaskResponse.statusCode).toBe(201)

    const createdTask = createdTaskResponse
      .json()
      .columns[0].tasks.find(
        (task: { title: string }) => task.title === 'Tarefa urgente com detalhes',
      )

    expect(createdTask).toMatchObject({
      title: 'Tarefa urgente com detalhes',
      priority: 'URGENT',
    })

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/tasks/${createdTask.id}`,
      headers: createAuthHeader(token),
    })

    expect(detailResponse.statusCode).toBe(200)
    expect(detailResponse.json()).toMatchObject({
      description: 'Descricao inicial da tarefa',
      priority: 'URGENT',
    })

    await app.close()
  })

  it('updates task editable metadata', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, token)
    const firstColumn = getBoardColumn(board, 0)
    const createdTaskResponse = await app.inject({
      method: 'POST',
      url: '/boards/current/tasks',
      headers: createAuthHeader(token),
      payload: {
        title: 'Tarefa para editar',
        description: 'Descricao antes',
        priority: 'LOW',
        columnId: firstColumn.id,
      },
    })
    const createdTask = createdTaskResponse
      .json()
      .columns[0].tasks.find((task: { title: string }) => task.title === 'Tarefa para editar')

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/tasks/${createdTask.id}`,
      headers: createAuthHeader(token),
      payload: {
        title: 'Tarefa editada',
        description: 'Descricao depois',
        priority: 'HIGH',
        assigneeId: null,
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    expect(updateResponse.json().task).toMatchObject({
      id: createdTask.id,
      title: 'Tarefa editada',
      description: 'Descricao depois',
      priority: 'HIGH',
      assigneeId: null,
      assigneeName: null,
    })
    expect(updateResponse.json().board.columns[0].tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdTask.id,
          title: 'Tarefa editada',
          priority: 'HIGH',
          assigneeName: null,
        }),
      ]),
    )

    await app.close()
  })

  it('creates and lists task comments', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, token)
    const firstColumn = getBoardColumn(board, 0)
    const createdTaskResponse = await app.inject({
      method: 'POST',
      url: '/boards/current/tasks',
      headers: createAuthHeader(token),
      payload: {
        title: 'Tarefa com comentario',
        columnId: firstColumn.id,
      },
    })
    const createdTask = createdTaskResponse
      .json()
      .columns[0].tasks.find((task: { title: string }) => task.title === 'Tarefa com comentario')

    const createdCommentResponse = await app.inject({
      method: 'POST',
      url: `/tasks/${createdTask.id}/comments`,
      headers: createAuthHeader(token),
      payload: {
        content: 'Primeiro comentario da tarefa',
      },
    })
    const listCommentsResponse = await app.inject({
      method: 'GET',
      url: `/tasks/${createdTask.id}/comments`,
      headers: createAuthHeader(token),
    })

    expect(createdCommentResponse.statusCode).toBe(201)
    expect(createdCommentResponse.json()).toMatchObject({
      content: 'Primeiro comentario da tarefa',
      authorName: 'Board Test Owner',
    })
    expect(listCommentsResponse.statusCode).toBe(200)
    expect(listCommentsResponse.json()).toEqual([
      expect.objectContaining({
        content: 'Primeiro comentario da tarefa',
      }),
    ])

    await app.close()
  })

  it('adds, lists and removes task watchers', async () => {
    const app = await createTestApp()
    const { company, token } = await registerOwnerSession(app)
    const watcherToken = await createMemberToken(app, company.id)
    const watcherPayload = app.jwt.decode<{ userId: string }>(watcherToken)
    const board = await getCurrentBoard(app, token)
    const firstColumn = getBoardColumn(board, 0)
    const createdTaskResponse = await app.inject({
      method: 'POST',
      url: '/boards/current/tasks',
      headers: createAuthHeader(token),
      payload: {
        title: 'Tarefa com observador',
        columnId: firstColumn.id,
      },
    })
    const createdTask = createdTaskResponse
      .json()
      .columns[0].tasks.find((task: { title: string }) => task.title === 'Tarefa com observador')

    const addWatcherResponse = await app.inject({
      method: 'POST',
      url: `/tasks/${createdTask.id}/watchers`,
      headers: createAuthHeader(token),
      payload: {
        userId: watcherPayload?.userId,
      },
    })
    const listWatchersResponse = await app.inject({
      method: 'GET',
      url: `/tasks/${createdTask.id}/watchers`,
      headers: createAuthHeader(token),
    })
    const removeWatcherResponse = await app.inject({
      method: 'DELETE',
      url: `/tasks/${createdTask.id}/watchers/${watcherPayload?.userId}`,
      headers: createAuthHeader(token),
    })

    expect(addWatcherResponse.statusCode).toBe(201)
    expect(addWatcherResponse.json()).toEqual([
      expect.objectContaining({
        userId: watcherPayload?.userId,
        name: 'Board Test Member',
      }),
    ])
    expect(listWatchersResponse.statusCode).toBe(200)
    expect(listWatchersResponse.json()).toHaveLength(1)
    expect(removeWatcherResponse.statusCode).toBe(200)
    expect(removeWatcherResponse.json()).toEqual([])

    await app.close()
  })

  it('reorders columns for company owners', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, token)
    const lastColumn = getBoardColumn(board, 2)

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

  it('prevents deleting protected initial columns', async () => {
    const app = await createTestApp()
    const { token } = await registerOwnerSession(app)
    const board = await getCurrentBoard(app, token)
    const protectedColumns = board.columns.filter((column) =>
      ['A fazer', 'Concluido'].includes(column.name),
    )

    for (const protectedColumn of protectedColumns) {
      const response = await app.inject({
        method: 'DELETE',
        url: `/boards/current/columns/${protectedColumn.id}`,
        headers: createAuthHeader(token),
      })

      expect(response.statusCode).toBe(409)
      expect(response.json()).toMatchObject({
        message: 'Protected board columns cannot be deleted',
      })
    }

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
    platformAdminEmails: [platformAdminEmail],
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

interface TestBoard {
  id: string
  columns: TestBoardColumn[]
}

interface TestBoardColumn {
  id: string
  name: string
  tasks: Array<{
    title: string
  }>
}

async function getCurrentBoard(app: FastifyInstance, token: string): Promise<TestBoard> {
  const response = await app.inject({
    method: 'GET',
    url: '/boards/current/kanban',
    headers: createAuthHeader(token),
  })

  expect(response.statusCode).toBe(200)

  return response.json() as TestBoard
}

function getBoardColumn(board: TestBoard, columnIndex: number) {
  const column = board.columns[columnIndex]

  expect(column).toBeDefined()

  return column as TestBoardColumn
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

async function createPlatformAdminToken(app: FastifyInstance, companyId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'Board Test Platform Admin',
      email: platformAdminEmail,
      passwordHash: 'not-used-in-this-test',
    },
  })

  return app.jwt.sign({
    userId: user.id,
    email: user.email,
    companyId,
    role: 'PLATFORM_ADMIN',
  })
}

function createAuthHeader(token: string) {
  return {
    authorization: `Bearer ${token}`,
  }
}
