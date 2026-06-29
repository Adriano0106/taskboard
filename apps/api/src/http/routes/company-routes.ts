import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import {
  CompanyError,
  getCompanyWorkspace,
  listCompaniesForPlatformAdmin,
} from '../../repositories/company-repository.js'
import { authenticateRequest } from '../auth-guard.js'

const companyParamsSchema = z.object({
  companyId: z.string().min(1),
})

interface CompanyRoutesOptions {
  platformAdminEmails?: string[]
  prismaClient?: PrismaClient
}

export async function companyRoutes(app: FastifyInstance, options: CompanyRoutesOptions = {}) {
  const prismaClient = options.prismaClient ?? prisma
  const platformAdminEmails = new Set(
    (options.platformAdminEmails ?? []).map((adminEmail) => adminEmail.toLowerCase()),
  )

  app.get('/admin/companies', { preHandler: authenticateRequest }, async (request, reply) => {
    if (!platformAdminEmails.has(request.user.email.toLowerCase())) {
      return reply.status(403).send({
        message: 'Platform admin access required',
      })
    }

    return listCompaniesForPlatformAdmin(prismaClient)
  })

  app.get('/companies/current', { preHandler: authenticateRequest }, async (request) => {
    return getCompanyWorkspace(prismaClient, {
      companyId: request.user.companyId,
      userId: request.user.userId,
    })
  })

  app.get('/companies/:companyId', { preHandler: authenticateRequest }, async (request, reply) => {
    const paramsValidation = companyParamsSchema.safeParse(request.params)

    if (!paramsValidation.success) {
      return reply.status(400).send({
        message: 'Invalid company params',
        issues: paramsValidation.error.flatten().fieldErrors,
      })
    }

    try {
      return await getCompanyWorkspace(prismaClient, {
        companyId: paramsValidation.data.companyId,
        userId: request.user.userId,
      })
    } catch (error) {
      if (error instanceof CompanyError) {
        return reply.status(404).send({
          message: error.message,
        })
      }

      throw error
    }
  })
}
