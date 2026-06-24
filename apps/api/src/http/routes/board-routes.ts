import type { FastifyInstance } from 'fastify'
import { prisma } from '../../prisma.js'
import { getOrCreateCompanyKanbanBoard } from '../../repositories/board-repository.js'
import { authenticateRequest } from '../auth-guard.js'

export async function boardRoutes(app: FastifyInstance) {
  app.get('/boards/current/kanban', { preHandler: authenticateRequest }, async (request) => {
    return getOrCreateCompanyKanbanBoard(prisma, {
      companyId: request.user.companyId,
      userId: request.user.userId,
    })
  })
}
