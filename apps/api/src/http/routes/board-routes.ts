import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import {
  BoardError,
  createColumnInCompanyKanbanBoard,
  createTaskInCompanyKanbanBoard,
  deleteColumnFromCompanyKanbanBoard,
  getKanbanTaskDetail,
  getOrCreateCompanyKanbanBoard,
  moveTaskInCompanyKanbanBoard,
  renameColumnInCompanyKanbanBoard,
} from '../../repositories/board-repository.js'
import { authenticateRequest } from '../auth-guard.js'

const createTaskBodySchema = z.object({
  title: z.string().trim().min(2),
  columnId: z.string().min(1),
})

const moveTaskBodySchema = z.object({
  columnId: z.string().min(1),
  position: z.coerce.number().int().min(1),
})

const columnBodySchema = z.object({
  name: z.string().trim().min(2),
})

const taskParamsSchema = z.object({
  taskId: z.string().min(1),
})

const columnParamsSchema = z.object({
  columnId: z.string().min(1),
})

export async function boardRoutes(app: FastifyInstance) {
  app.get('/boards/current/kanban', { preHandler: authenticateRequest }, async (request) => {
    return getOrCreateCompanyKanbanBoard(prisma, {
      companyId: request.user.companyId,
      userId: request.user.userId,
    })
  })

  app.post('/boards/current/tasks', { preHandler: authenticateRequest }, async (request, reply) => {
    const bodyValidation = createTaskBodySchema.safeParse(request.body)

    if (!bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid task payload',
        issues: bodyValidation.error.flatten().fieldErrors,
      })
    }

    try {
      const board = await createTaskInCompanyKanbanBoard(prisma, {
        companyId: request.user.companyId,
        userId: request.user.userId,
        columnId: bodyValidation.data.columnId,
        title: bodyValidation.data.title,
      })

      return reply.status(201).send(board)
    } catch (error) {
      if (error instanceof BoardError) {
        return reply.status(404).send({
          message: error.message,
        })
      }

      throw error
    }
  })

  app.get('/tasks/:taskId', { preHandler: authenticateRequest }, async (request, reply) => {
    const paramsValidation = taskParamsSchema.safeParse(request.params)

    if (!paramsValidation.success) {
      return reply.status(400).send({
        message: 'Invalid task params',
        issues: paramsValidation.error.flatten().fieldErrors,
      })
    }

    try {
      return await getKanbanTaskDetail(prisma, {
        companyId: request.user.companyId,
        taskId: paramsValidation.data.taskId,
      })
    } catch (error) {
      if (error instanceof BoardError) {
        return reply.status(404).send({
          message: error.message,
        })
      }

      throw error
    }
  })

  app.patch('/tasks/:taskId/move', { preHandler: authenticateRequest }, async (request, reply) => {
    const paramsValidation = taskParamsSchema.safeParse(request.params)
    const bodyValidation = moveTaskBodySchema.safeParse(request.body)

    if (!paramsValidation.success || !bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid move payload',
        issues: {
          ...paramsValidation.error?.flatten().fieldErrors,
          ...bodyValidation.error?.flatten().fieldErrors,
        },
      })
    }

    try {
      return await moveTaskInCompanyKanbanBoard(prisma, {
        companyId: request.user.companyId,
        userId: request.user.userId,
        taskId: paramsValidation.data.taskId,
        columnId: bodyValidation.data.columnId,
        position: bodyValidation.data.position,
      })
    } catch (error) {
      if (error instanceof BoardError) {
        return reply.status(404).send({
          message: error.message,
        })
      }

      throw error
    }
  })

  app.post(
    '/boards/current/columns',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const bodyValidation = columnBodySchema.safeParse(request.body)

      if (!bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid column payload',
          issues: bodyValidation.error.flatten().fieldErrors,
        })
      }

      const board = await createColumnInCompanyKanbanBoard(prisma, {
        companyId: request.user.companyId,
        userId: request.user.userId,
        name: bodyValidation.data.name,
      })

      return reply.status(201).send(board)
    },
  )

  app.patch(
    '/boards/current/columns/:columnId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = columnParamsSchema.safeParse(request.params)
      const bodyValidation = columnBodySchema.safeParse(request.body)

      if (!paramsValidation.success || !bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid column payload',
          issues: {
            ...paramsValidation.error?.flatten().fieldErrors,
            ...bodyValidation.error?.flatten().fieldErrors,
          },
        })
      }

      try {
        return await renameColumnInCompanyKanbanBoard(prisma, {
          companyId: request.user.companyId,
          userId: request.user.userId,
          columnId: paramsValidation.data.columnId,
          name: bodyValidation.data.name,
        })
      } catch (error) {
        if (error instanceof BoardError) {
          return reply.status(404).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.delete(
    '/boards/current/columns/:columnId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = columnParamsSchema.safeParse(request.params)

      if (!paramsValidation.success) {
        return reply.status(400).send({
          message: 'Invalid column params',
          issues: paramsValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return await deleteColumnFromCompanyKanbanBoard(prisma, {
          companyId: request.user.companyId,
          userId: request.user.userId,
          columnId: paramsValidation.data.columnId,
        })
      } catch (error) {
        if (error instanceof BoardError) {
          return reply.status(409).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )
}
