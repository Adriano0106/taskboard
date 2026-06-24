import type { FastifyInstance } from 'fastify'
import { authenticateRequest } from '../auth-guard.js'

export async function companyRoutes(app: FastifyInstance) {
  app.get('/companies/current', { preHandler: authenticateRequest }, async (request) => {
    return {
      companyId: request.user.companyId,
      role: request.user.role,
    }
  })
}
