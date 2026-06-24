import type { FastifyInstance } from 'fastify'
import { authenticateRequest } from '../auth-guard.js'

export async function userRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: authenticateRequest }, async (request) => {
    return {
      userId: request.user.userId,
      email: request.user.email,
    }
  })
}
