import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { UserRepository } from '../../repositories/user/user-repository.js'
import { AuthError, createAuthService } from '../../services/auth-service.js'
import { authenticateRequest } from '../auth-guard.js'

const registerBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
})

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export interface AuthRoutesOptions {
  platformAdminEmails?: string[]
  userRepository: UserRepository
}

export async function authRoutes(app: FastifyInstance, options: AuthRoutesOptions) {
  const authService = createAuthService(options.userRepository, options.platformAdminEmails ?? [])

  app.post('/auth/register', async (request, reply) => {
    const bodyValidation = registerBodySchema.safeParse(request.body)

    if (!bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid registration payload',
        issues: bodyValidation.error.flatten().fieldErrors,
      })
    }

    try {
      const account = await authService.registerAccount(bodyValidation.data)
      const token = app.jwt.sign(account.authenticatedUser)

      return reply.status(201).send({
        user: account.publicUser,
        company: account.publicCompany,
        isPlatformAdmin: account.isPlatformAdmin,
        token,
      })
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(409).send({
          message: error.message,
        })
      }

      throw error
    }
  })

  app.post('/auth/login', async (request, reply) => {
    const bodyValidation = loginBodySchema.safeParse(request.body)

    if (!bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid login payload',
        issues: bodyValidation.error.flatten().fieldErrors,
      })
    }

    try {
      const account = await authService.login(bodyValidation.data)
      const token = app.jwt.sign(account.authenticatedUser)

      return {
        user: account.publicUser,
        company: account.publicCompany,
        isPlatformAdmin: account.isPlatformAdmin,
        token,
      }
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(401).send({
          message: error.message,
        })
      }

      throw error
    }
  })

  app.get('/auth/me', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const account = await authService.getProfile(request.user.userId)

      return {
        user: account.publicUser,
        company: account.publicCompany,
        isPlatformAdmin: account.isPlatformAdmin,
      }
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(401).send({
          message: error.message,
        })
      }

      throw error
    }
  })
}
