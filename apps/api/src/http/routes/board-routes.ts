import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import {
  BoardError,
  createColumnInCompanyKanbanBoard,
  createTaskComment,
  createTaskInCompanyKanbanBoard,
  deleteColumnFromCompanyKanbanBoard,
  getCompanyKanbanBoard,
  getKanbanTaskDetail,
  getOrCreateCompanyKanbanBoard,
  listTaskComments,
  moveTaskInCompanyKanbanBoard,
  renameColumnInCompanyKanbanBoard,
  reorderColumnInCompanyKanbanBoard,
  updateTaskInCompanyKanbanBoard,
} from '../../repositories/board-repository.js'
import { authenticateRequest } from '../auth-guard.js'

const createTaskBodySchema = z.object({
  title: z.string().trim().min(2),
  columnId: z.string().min(1),
  description: z.string().trim().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().min(1).optional(),
})

const moveTaskBodySchema = z.object({
  columnId: z.string().min(1),
  position: z.coerce.number().int().min(1),
})

const updateTaskBodySchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assigneeId: z.string().min(1).nullable().optional(),
})

const createTaskCommentBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
})

const columnBodySchema = z.object({
  name: z.string().trim().min(2),
})

const createColumnBodySchema = columnBodySchema.extend({
  position: z.coerce.number().int().min(1),
})

const reorderColumnBodySchema = z.object({
  position: z.coerce.number().int().min(1),
})

const taskParamsSchema = z.object({
  taskId: z.string().min(1),
})

const companyBoardParamsSchema = z.object({
  companyId: z.string().min(1),
  boardId: z.string().min(1),
})

const columnParamsSchema = z.object({
  columnId: z.string().min(1),
})

interface BoardRoutesOptions {
  platformAdminEmails?: string[]
  prismaClient?: PrismaClient
}

export async function boardRoutes(app: FastifyInstance, options: BoardRoutesOptions) {
  const prismaClient = options.prismaClient ?? prisma
  const platformAdminEmails = new Set(
    (options.platformAdminEmails ?? []).map((adminEmail) => adminEmail.toLowerCase()),
  )

  app.get('/boards/current/kanban', { preHandler: authenticateRequest }, async (request) => {
    return getOrCreateCompanyKanbanBoard(prismaClient, {
      companyId: request.user.companyId,
      userId: request.user.userId,
    })
  })

  app.get(
    '/companies/:companyId/boards/:boardId/kanban',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = companyBoardParamsSchema.safeParse(request.params)
      const isPlatformAdmin = platformAdminEmails.has(request.user.email.toLowerCase())

      if (!paramsValidation.success) {
        return reply.status(400).send({
          message: 'Invalid board params',
          issues: paramsValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return await getCompanyKanbanBoard(prismaClient, {
          allowPlatformAdmin: isPlatformAdmin,
          companyId: paramsValidation.data.companyId,
          userId: request.user.userId,
          boardId: paramsValidation.data.boardId,
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

  app.post('/boards/current/tasks', { preHandler: authenticateRequest }, async (request, reply) => {
    const bodyValidation = createTaskBodySchema.safeParse(request.body)

    if (!bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid task payload',
        issues: bodyValidation.error.flatten().fieldErrors,
      })
    }

    try {
      const board = await createTaskInCompanyKanbanBoard(prismaClient, {
        companyId: request.user.companyId,
        userId: request.user.userId,
        columnId: bodyValidation.data.columnId,
        title: bodyValidation.data.title,
        description: bodyValidation.data.description,
        priority: bodyValidation.data.priority,
        assigneeId: bodyValidation.data.assigneeId,
      })

      return reply.status(201).send(board)
    } catch (error) {
      if (error instanceof BoardError) {
        return reply.status(409).send({
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
      return await getKanbanTaskDetail(prismaClient, {
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

  app.patch('/tasks/:taskId', { preHandler: authenticateRequest }, async (request, reply) => {
    const paramsValidation = taskParamsSchema.safeParse(request.params)
    const bodyValidation = updateTaskBodySchema.safeParse(request.body)

    if (!paramsValidation.success || !bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid task payload',
        issues: {
          ...paramsValidation.error?.flatten().fieldErrors,
          ...bodyValidation.error?.flatten().fieldErrors,
        },
      })
    }

    try {
      return await updateTaskInCompanyKanbanBoard(prismaClient, {
        companyId: request.user.companyId,
        userId: request.user.userId,
        taskId: paramsValidation.data.taskId,
        title: bodyValidation.data.title,
        description: bodyValidation.data.description,
        priority: bodyValidation.data.priority,
        assigneeId: bodyValidation.data.assigneeId,
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

  app.get(
    '/tasks/:taskId/comments',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = taskParamsSchema.safeParse(request.params)

      if (!paramsValidation.success) {
        return reply.status(400).send({
          message: 'Invalid task params',
          issues: paramsValidation.error.flatten().fieldErrors,
        })
      }

      try {
        return await listTaskComments(prismaClient, {
          companyId: request.user.companyId,
          taskId: paramsValidation.data.taskId,
          userId: request.user.userId,
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

  app.post(
    '/tasks/:taskId/comments',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = taskParamsSchema.safeParse(request.params)
      const bodyValidation = createTaskCommentBodySchema.safeParse(request.body)

      if (!paramsValidation.success || !bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid task comment payload',
          issues: {
            ...paramsValidation.error?.flatten().fieldErrors,
            ...bodyValidation.error?.flatten().fieldErrors,
          },
        })
      }

      try {
        const comment = await createTaskComment(prismaClient, {
          companyId: request.user.companyId,
          taskId: paramsValidation.data.taskId,
          userId: request.user.userId,
          content: bodyValidation.data.content,
        })

        return reply.status(201).send(comment)
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
      return await moveTaskInCompanyKanbanBoard(prismaClient, {
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
      const bodyValidation = createColumnBodySchema.safeParse(request.body)

      if (!bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid column payload',
          issues: bodyValidation.error.flatten().fieldErrors,
        })
      }

      try {
        const board = await createColumnInCompanyKanbanBoard(prismaClient, {
          companyId: request.user.companyId,
          companyRole: request.user.role,
          userId: request.user.userId,
          name: bodyValidation.data.name,
          position: bodyValidation.data.position,
        })

        return reply.status(201).send(board)
      } catch (error) {
        if (error instanceof BoardError) {
          return reply.status(403).send({
            message: error.message,
          })
        }

        throw error
      }
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
        return await renameColumnInCompanyKanbanBoard(prismaClient, {
          companyId: request.user.companyId,
          companyRole: request.user.role,
          userId: request.user.userId,
          columnId: paramsValidation.data.columnId,
          name: bodyValidation.data.name,
        })
      } catch (error) {
        if (error instanceof BoardError) {
          return reply.status(getBoardErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )

  app.patch(
    '/boards/current/columns/:columnId/reorder',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const paramsValidation = columnParamsSchema.safeParse(request.params)
      const bodyValidation = reorderColumnBodySchema.safeParse(request.body)

      if (!paramsValidation.success || !bodyValidation.success) {
        return reply.status(400).send({
          message: 'Invalid column reorder payload',
          issues: {
            ...paramsValidation.error?.flatten().fieldErrors,
            ...bodyValidation.error?.flatten().fieldErrors,
          },
        })
      }

      try {
        return await reorderColumnInCompanyKanbanBoard(prismaClient, {
          companyId: request.user.companyId,
          companyRole: request.user.role,
          userId: request.user.userId,
          columnId: paramsValidation.data.columnId,
          position: bodyValidation.data.position,
        })
      } catch (error) {
        if (error instanceof BoardError) {
          return reply.status(getBoardErrorStatus(error)).send({
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
        return await deleteColumnFromCompanyKanbanBoard(prismaClient, {
          companyId: request.user.companyId,
          companyRole: request.user.role,
          userId: request.user.userId,
          columnId: paramsValidation.data.columnId,
        })
      } catch (error) {
        if (error instanceof BoardError) {
          return reply.status(getBoardErrorStatus(error)).send({
            message: error.message,
          })
        }

        throw error
      }
    },
  )
}

function getBoardErrorStatus(error: BoardError) {
  if (error.message.includes('owners and admins')) {
    return 403
  }

  if (
    error.message.includes('empty columns') ||
    error.message.includes('at least one column') ||
    error.message.includes('Protected board columns')
  ) {
    return 409
  }

  return 404
}
