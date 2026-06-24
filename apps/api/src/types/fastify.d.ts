import type { AuthenticatedUser } from './auth.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUser
    user: AuthenticatedUser
  }
}
