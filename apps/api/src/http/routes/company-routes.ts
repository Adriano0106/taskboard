import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import {
  CompanyError,
  createBoard,
  createDepartment,
  createCompanyMember,
  deleteBoard,
  deleteCompanyMember,
  deleteDepartment,
  getCompanyWorkspace,
  getCompanyWorkspaceBySlug,
  listCompaniesForPlatformAdmin,
  listCompanyMembers,
  renameDepartment,
  updateBoard,
  updateCompany,
  updateCompanyMemberRole,
} from '../../repositories/company-repository.js'
import { authenticateRequest } from '../auth-guard.js'

const companyParamsSchema = z.object({
  companyId: z.string().min(1),
})

const companySlugParamsSchema = z.object({
  companySlug: z.string().min(1),
})

const departmentParamsSchema = z.object({
  departmentId: z.string().min(1),
})

const boardParamsSchema = z.object({
  boardId: z.string().min(1),
})

const memberParamsSchema = z.object({
  userId: z.string().min(1),
})

const departmentBodySchema = z.object({
  name: z.string().trim().min(2),
})

const boardBodySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
})

const companyBodySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).max(48),
})

const companyRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER'])

const createMemberBodySchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: companyRoleSchema,
})

const updateMemberBodySchema = z.object({
  role: companyRoleSchema,
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

  app.patch('/companies/current', { preHandler: authenticateRequest }, async (request, reply) => {
    const bodyValidation = companyBodySchema.safeParse(request.body)

    if (!bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid company payload',
        issues: bodyValidation.error.flatten().fieldErrors,
      })
    }

    try {
      return await updateCompany(prismaClient, {
        companyId: request.user.companyId,
        userId: request.user.userId,
        name: bodyValidation.data.name,
        slug: bodyValidation.data.slug,
      })
    } catch (error) {
      if (error instanceof CompanyError) {
        return reply.status(getCompanyErrorStatus(error)).send({
          message: error.message,
        })
      }

      throw error
    }
  })

  app.get('/companies/current/members', { preHandler: authenticateRequest }, async (request) => {
    return listCompanyMembers(prismaClient, {
      companyId: request.user.companyId,
      userId: request.user.userId,
    })
  })

  app.post(
    '/companies/current/members',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const bodyValidation = createMemberBodySchema.safeParse(request.body)

      if (!bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid company member payload',
          issues: bodyValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return reply.status(201).send(
          await createCompanyMember(prismaClient, {
            companyId: request.user.companyId,
            userId: request.user.userId,
            name: bodyValidation.data.name,
            email: bodyValidation.data.email,
            password: bodyValidation.data.password,
            role: bodyValidation.data.role,
          }),
        )
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.patch(
    '/companies/current/members/:userId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = memberParamsSchema.safeParse(request.params)
      const bodyValidation = updateMemberBodySchema.safeParse(request.body)

      if (!paramsValidation.success || !bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid company member payload',
          issues: {
            ...paramsValidation.error?.flatten().fieldErrors,
            ...bodyValidation.error?.flatten().fieldErrors,
          },
        })
      }

      try {
        return await updateCompanyMemberRole(prismaClient, {
          companyId: request.user.companyId,
          userId: request.user.userId,
          memberUserId: paramsValidation.data.userId,
          role: bodyValidation.data.role,
        })
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.delete(
    '/companies/current/members/:userId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = memberParamsSchema.safeParse(request.params)

      if (!paramsValidation.success) {
        return reply.status(400).send({
          message: 'Invalid company member params',
          issues: paramsValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return await deleteCompanyMember(prismaClient, {
          companyId: request.user.companyId,
          userId: request.user.userId,
          memberUserId: paramsValidation.data.userId,
        })
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.post(
    '/companies/current/departments',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const bodyValidation = departmentBodySchema.safeParse(request.body)

      if (!bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid department payload',
          issues: bodyValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return reply.status(201).send(
          await createDepartment(prismaClient, {
            companyId: request.user.companyId,
            userId: request.user.userId,
            name: bodyValidation.data.name,
          }),
        )
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.patch(
    '/companies/current/departments/:departmentId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = departmentParamsSchema.safeParse(request.params)
      const bodyValidation = departmentBodySchema.safeParse(request.body)

      if (!paramsValidation.success || !bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid department payload',
          issues: {
            ...paramsValidation.error?.flatten().fieldErrors,
            ...bodyValidation.error?.flatten().fieldErrors,
          },
        })
      }

      try {
        return await renameDepartment(prismaClient, {
          companyId: request.user.companyId,
          userId: request.user.userId,
          departmentId: paramsValidation.data.departmentId,
          name: bodyValidation.data.name,
        })
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.delete(
    '/companies/current/departments/:departmentId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = departmentParamsSchema.safeParse(request.params)

      if (!paramsValidation.success) {
        return reply.status(400).send({
          message: 'Invalid department params',
          issues: paramsValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return await deleteDepartment(prismaClient, {
          companyId: request.user.companyId,
          userId: request.user.userId,
          departmentId: paramsValidation.data.departmentId,
        })
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.post(
    '/companies/current/departments/:departmentId/boards',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = departmentParamsSchema.safeParse(request.params)
      const bodyValidation = boardBodySchema.safeParse(request.body)

      if (!paramsValidation.success || !bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid board payload',
          issues: {
            ...paramsValidation.error?.flatten().fieldErrors,
            ...bodyValidation.error?.flatten().fieldErrors,
          },
        })
      }

      try {
        return reply.status(201).send(
          await createBoard(prismaClient, {
            companyId: request.user.companyId,
            userId: request.user.userId,
            departmentId: paramsValidation.data.departmentId,
            name: bodyValidation.data.name,
            description: bodyValidation.data.description,
          }),
        )
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.patch(
    '/companies/current/boards/:boardId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = boardParamsSchema.safeParse(request.params)
      const bodyValidation = boardBodySchema.safeParse(request.body)

      if (!paramsValidation.success || !bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid board payload',
          issues: {
            ...paramsValidation.error?.flatten().fieldErrors,
            ...bodyValidation.error?.flatten().fieldErrors,
          },
        })
      }

      try {
        return await updateBoard(prismaClient, {
          companyId: request.user.companyId,
          userId: request.user.userId,
          boardId: paramsValidation.data.boardId,
          name: bodyValidation.data.name,
          description: bodyValidation.data.description,
        })
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.delete(
    '/companies/current/boards/:boardId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = boardParamsSchema.safeParse(request.params)

      if (!paramsValidation.success) {
        return reply.status(400).send({
          message: 'Invalid board params',
          issues: paramsValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return await deleteBoard(prismaClient, {
          companyId: request.user.companyId,
          userId: request.user.userId,
          boardId: paramsValidation.data.boardId,
        })
      } catch (error) {
        if (error instanceof CompanyError) {
          return reply.status(getCompanyErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.get('/companies/:companyId', { preHandler: authenticateRequest }, async (request, reply) => {
    const paramsValidation = companyParamsSchema.safeParse(request.params)
    const isPlatformAdmin = platformAdminEmails.has(request.user.email.toLowerCase())

    if (!paramsValidation.success) {
      return reply.status(400).send({
        message: 'Invalid company params',
        issues: paramsValidation.error.flatten().fieldErrors,
      })
    }

    try {
      return await getCompanyWorkspace(prismaClient, {
        allowPlatformAdmin: isPlatformAdmin,
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

  app.get(
    '/companies/by-slug/:companySlug',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = companySlugParamsSchema.safeParse(request.params)
      const isPlatformAdmin = platformAdminEmails.has(request.user.email.toLowerCase())

      if (!paramsValidation.success) {
        return reply.status(400).send({
          message: 'Invalid company slug params',
          issues: paramsValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return await getCompanyWorkspaceBySlug(prismaClient, {
          allowPlatformAdmin: isPlatformAdmin,
          slug: paramsValidation.data.companySlug,
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
    },
  )
}

function getCompanyErrorStatus(error: CompanyError) {
  if (error.message.includes('owners and admins')) {
    return 403
  }

  if (
    error.message.includes('empty departments') ||
    error.message.includes('without open tasks') ||
    error.message.includes('already in use') ||
    error.message.includes('already a company member') ||
    error.message.includes('at least one owner') ||
    error.message.includes('your own role') ||
    error.message.includes('remove yourself')
  ) {
    return 409
  }

  return 404
}
