import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import {
  BoardError,
  createTaskInCompanyKanbanBoard,
  getOrCreateCompanyKanbanBoard,
} from '../../repositories/board-repository.js'
import { authenticateRequest } from '../auth-guard.js'

const createTaskBodySchema = z.object({
  title: z.string().trim().min(2),
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
}
