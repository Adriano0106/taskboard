import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import {
  AccessRequestError,
  approveAccessRequest,
  createAccessRequest,
  listAccessRequests,
  rejectAccessRequest,
} from '../../repositories/access-request/access-request-repository.js'
import { authenticateRequest } from '../auth-guard.js'

const accessRequestBodySchema = z
  .object({
    scope: z.enum(['DEPARTMENT', 'BOARD', 'EPIC']),
    departmentId: z.string().min(1).optional(),
    boardId: z.string().min(1).optional(),
    epicId: z.string().min(1).optional(),
    requestedRole: z.enum(['MANAGER', 'MEMBER', 'VIEWER']).default('VIEWER'),
    message: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (value.scope === 'DEPARTMENT' && !value.departmentId) {
      context.addIssue({
        code: 'custom',
        message: 'Department is required',
        path: ['departmentId'],
      })
    }

    if (value.scope === 'BOARD' && !value.boardId) {
      context.addIssue({
        code: 'custom',
        message: 'Board is required',
        path: ['boardId'],
      })
    }

    if (value.scope === 'EPIC' && !value.epicId) {
      context.addIssue({
        code: 'custom',
        message: 'Epic is required',
        path: ['epicId'],
      })
    }
  })

const accessRequestParamsSchema = z.object({
  accessRequestId: z.string().min(1),
})

const reviewBodySchema = z.object({
  decisionMessage: z.string().trim().max(1000).optional(),
})

interface AccessRequestRoutesOptions {
  prismaClient?: PrismaClient
}

export async function accessRequestRoutes(
  app: FastifyInstance,
  options: AccessRequestRoutesOptions = {},
) {
  const prismaClient = options.prismaClient ?? prisma

  app.get('/access-requests', { preHandler: authenticateRequest }, async (request) => {
    return listAccessRequests(prismaClient, {
      companyId: request.user.companyId,
      userId: request.user.userId,
    })
  })

  app.post('/access-requests', { preHandler: authenticateRequest }, async (request, reply) => {
    const bodyValidation = accessRequestBodySchema.safeParse(request.body)

    if (!bodyValidation.success) {
      return reply.status(400).send({
        message: 'Invalid access request payload',
        issues: bodyValidation.error.flatten().fieldErrors,
      })
    }

    try {
      return reply.status(201).send(
        await createAccessRequest(prismaClient, {
          ...bodyValidation.data,
          companyId: request.user.companyId,
          requesterId: request.user.userId,
        }),
      )
    } catch (error) {
      if (error instanceof AccessRequestError) {
        return reply.status(getAccessRequestErrorStatus(error)).send({
          message: error.message,
        })
      }

      throw error
    }
  })

  app.patch(
    '/access-requests/:accessRequestId/approve',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      return reviewRequest(request.params, request.body, reply, async (accessRequestId, body) => {
        return approveAccessRequest(prismaClient, {
          accessRequestId,
          companyId: request.user.companyId,
          reviewerId: request.user.userId,
          decisionMessage: body.decisionMessage,
        })
      })
    },
  )

  app.patch(
    '/access-requests/:accessRequestId/reject',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      return reviewRequest(request.params, request.body, reply, async (accessRequestId, body) => {
        return rejectAccessRequest(prismaClient, {
          accessRequestId,
          companyId: request.user.companyId,
          reviewerId: request.user.userId,
          decisionMessage: body.decisionMessage,
        })
      })
    },
  )
}

async function reviewRequest(
  params: unknown,
  body: unknown,
  reply: FastifyReply,
  review: (accessRequestId: string, body: z.infer<typeof reviewBodySchema>) => Promise<unknown>,
) {
  const paramsValidation = accessRequestParamsSchema.safeParse(params)
  const bodyValidation = reviewBodySchema.safeParse(body)

  if (!paramsValidation.success || !bodyValidation.success) {
    return reply.status(400).send({
      message: 'Invalid access request review payload',
      issues: {
        ...paramsValidation.error?.flatten().fieldErrors,
        ...bodyValidation.error?.flatten().fieldErrors,
      },
    })
  }

  try {
    return await review(paramsValidation.data.accessRequestId, bodyValidation.data)
  } catch (error) {
    if (error instanceof AccessRequestError) {
      return reply.status(getAccessRequestErrorStatus(error)).send({
        message: error.message,
      })
    }

    throw error
  }
}

function getAccessRequestErrorStatus(error: AccessRequestError) {
  if (
    error.message.includes('Only company admins') ||
    error.message.includes('User does not belong')
  ) {
    return 403
  }

  if (error.message.includes('already been reviewed')) {
    return 409
  }

  return 404
}
