import {
  type AccessRequestScope,
  type AccessRequestStatus,
  Prisma,
  type PrismaClient,
  type ScopedRole,
} from '@prisma/client'

export class AccessRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccessRequestError'
  }
}

export interface AccessRequestSummary {
  id: string
  scope: AccessRequestScope
  status: AccessRequestStatus
  message: string | null
  decisionMessage: string | null
  requestedRole: ScopedRole
  requester: {
    id: string
    name: string
    email: string
  }
  target: {
    departmentId: string | null
    departmentName: string | null
    boardId: string | null
    boardName: string | null
    epicId: string | null
    epicTitle: string | null
  }
  createdAt: string
  decidedAt: string | null
}

export interface CreateAccessRequestInput {
  boardId?: string | null
  companyId: string
  departmentId?: string | null
  epicId?: string | null
  message?: string | null
  requestedRole: ScopedRole
  requesterId: string
  scope: AccessRequestScope
}

export interface ReviewAccessRequestInput {
  accessRequestId: string
  companyId: string
  decisionMessage?: string | null
  reviewerId: string
}

export async function createAccessRequest(
  prisma: PrismaClient,
  input: CreateAccessRequestInput,
): Promise<AccessRequestSummary> {
  await assertRequesterBelongsToCompany(prisma, input.companyId, input.requesterId)
  const target = await resolveAccessRequestTarget(prisma, input)

  const existingPendingRequest = await prisma.accessRequest.findFirst({
    where: {
      companyId: input.companyId,
      requesterId: input.requesterId,
      status: 'PENDING',
      departmentId: target.departmentId,
      boardId: target.boardId,
      epicId: target.epicId,
    },
    include: accessRequestInclude,
  })

  if (existingPendingRequest) {
    return mapAccessRequest(existingPendingRequest)
  }

  const request = await prisma.accessRequest.create({
    data: {
      scope: input.scope,
      message: input.message?.trim() || null,
      companyId: input.companyId,
      requesterId: input.requesterId,
      departmentId: target.departmentId,
      boardId: target.boardId,
      epicId: target.epicId,
      requestedRole: input.requestedRole,
    },
    include: accessRequestInclude,
  })

  return mapAccessRequest(request)
}

export async function listAccessRequests(
  prisma: PrismaClient,
  input: {
    companyId: string
    userId: string
  },
): Promise<AccessRequestSummary[]> {
  const membership = await assertRequesterBelongsToCompany(prisma, input.companyId, input.userId)

  if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
    const requests = await prisma.accessRequest.findMany({
      where: {
        companyId: input.companyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: accessRequestInclude,
    })

    return requests.map(mapAccessRequest)
  }

  const managedDepartments = await prisma.departmentMember.findMany({
    where: {
      userId: input.userId,
      role: 'MANAGER',
      department: {
        companyId: input.companyId,
      },
    },
    select: {
      departmentId: true,
    },
  })
  const managedDepartmentIds = managedDepartments.map((department) => department.departmentId)

  const requests = await prisma.accessRequest.findMany({
    where: {
      companyId: input.companyId,
      OR: [
        {
          requesterId: input.userId,
        },
        {
          departmentId: {
            in: managedDepartmentIds,
          },
        },
        {
          board: {
            departmentId: {
              in: managedDepartmentIds,
            },
          },
        },
        {
          epic: {
            ownerDepartmentId: {
              in: managedDepartmentIds,
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: accessRequestInclude,
  })

  return requests.map(mapAccessRequest)
}

export async function approveAccessRequest(
  prisma: PrismaClient,
  input: ReviewAccessRequestInput,
): Promise<AccessRequestSummary> {
  return reviewAccessRequest(prisma, input, 'APPROVED')
}

export async function rejectAccessRequest(
  prisma: PrismaClient,
  input: ReviewAccessRequestInput,
): Promise<AccessRequestSummary> {
  return reviewAccessRequest(prisma, input, 'REJECTED')
}

async function reviewAccessRequest(
  prisma: PrismaClient,
  input: ReviewAccessRequestInput,
  status: 'APPROVED' | 'REJECTED',
) {
  const request = await findAccessRequestForReview(prisma, input)

  await assertCanReviewAccessRequest(prisma, {
    companyId: input.companyId,
    departmentId: getReviewDepartmentId(request),
    userId: input.reviewerId,
  })

  const reviewedRequest = await prisma.$transaction(async (transaction) => {
    if (status === 'APPROVED') {
      await grantApprovedAccess(transaction, request)
    }

    return transaction.accessRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status,
        reviewerId: input.reviewerId,
        decisionMessage: input.decisionMessage?.trim() || null,
        decidedAt: new Date(),
      },
      include: accessRequestInclude,
    })
  })

  return mapAccessRequest(reviewedRequest)
}

async function grantApprovedAccess(
  prisma: Prisma.TransactionClient,
  request: AccessRequestForReview,
) {
  if (request.scope === 'BOARD' && request.boardId) {
    await prisma.boardMember.upsert({
      where: {
        boardId_userId: {
          boardId: request.boardId,
          userId: request.requesterId,
        },
      },
      create: {
        boardId: request.boardId,
        userId: request.requesterId,
        role: request.requestedRole,
      },
      update: {
        role: request.requestedRole,
      },
    })
    return
  }

  const departmentId = getReviewDepartmentId(request)

  await prisma.departmentMember.upsert({
    where: {
      departmentId_userId: {
        departmentId,
        userId: request.requesterId,
      },
    },
    create: {
      departmentId,
      userId: request.requesterId,
      role: request.requestedRole,
    },
    update: {
      role: request.requestedRole,
    },
  })
}

async function findAccessRequestForReview(prisma: PrismaClient, input: ReviewAccessRequestInput) {
  const request = await prisma.accessRequest.findFirst({
    where: {
      id: input.accessRequestId,
      companyId: input.companyId,
    },
    include: {
      board: {
        select: {
          departmentId: true,
        },
      },
      epic: {
        select: {
          ownerDepartmentId: true,
        },
      },
    },
  })

  if (!request) {
    throw new AccessRequestError('Access request was not found')
  }

  if (request.status !== 'PENDING') {
    throw new AccessRequestError('Access request has already been reviewed')
  }

  return request
}

async function assertCanReviewAccessRequest(
  prisma: PrismaClient,
  input: {
    companyId: string
    departmentId: string
    userId: string
  },
) {
  const companyMembership = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId: input.userId,
        companyId: input.companyId,
      },
    },
  })

  if (companyMembership?.role === 'OWNER' || companyMembership?.role === 'ADMIN') {
    return
  }

  const departmentMembership = await prisma.departmentMember.findUnique({
    where: {
      departmentId_userId: {
        departmentId: input.departmentId,
        userId: input.userId,
      },
    },
  })

  if (departmentMembership?.role !== 'MANAGER') {
    throw new AccessRequestError(
      'Only company admins or department managers can review access requests',
    )
  }
}

async function assertRequesterBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  userId: string,
) {
  const membership = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  })

  if (!membership) {
    throw new AccessRequestError('User does not belong to the current company')
  }

  return membership
}

async function resolveAccessRequestTarget(prisma: PrismaClient, input: CreateAccessRequestInput) {
  if (input.scope === 'DEPARTMENT') {
    if (!input.departmentId) {
      throw new AccessRequestError('Department access requests require a department')
    }

    const department = await prisma.department.findFirst({
      where: {
        id: input.departmentId,
        companyId: input.companyId,
      },
      select: {
        id: true,
      },
    })

    if (!department) {
      throw new AccessRequestError('Department does not belong to the current company')
    }

    return {
      departmentId: department.id,
      boardId: null,
      epicId: null,
    }
  }

  if (input.scope === 'BOARD') {
    if (!input.boardId) {
      throw new AccessRequestError('Board access requests require a board')
    }

    const board = await prisma.board.findFirst({
      where: {
        id: input.boardId,
        department: {
          companyId: input.companyId,
        },
      },
      select: {
        id: true,
        departmentId: true,
      },
    })

    if (!board) {
      throw new AccessRequestError('Board does not belong to the current company')
    }

    return {
      departmentId: board.departmentId,
      boardId: board.id,
      epicId: null,
    }
  }

  if (!input.epicId) {
    throw new AccessRequestError('Epic access requests require an epic')
  }

  const epic = await prisma.epic.findFirst({
    where: {
      id: input.epicId,
      companyId: input.companyId,
    },
    select: {
      id: true,
      ownerDepartmentId: true,
    },
  })

  if (!epic) {
    throw new AccessRequestError('Epic does not belong to the current company')
  }

  return {
    departmentId: epic.ownerDepartmentId,
    boardId: null,
    epicId: epic.id,
  }
}

function getReviewDepartmentId(request: AccessRequestForReview) {
  const departmentId =
    request.departmentId ?? request.board?.departmentId ?? request.epic?.ownerDepartmentId

  if (!departmentId) {
    throw new AccessRequestError('Access request does not have a review department')
  }

  return departmentId
}

const accessRequestInclude = Prisma.validator<Prisma.AccessRequestInclude>()({
  requester: true,
  department: true,
  board: true,
  epic: true,
})

type AccessRequestWithIncludes = Prisma.AccessRequestGetPayload<{
  include: typeof accessRequestInclude
}>

type AccessRequestForReview = Awaited<ReturnType<typeof findAccessRequestForReview>>

function mapAccessRequest(request: AccessRequestWithIncludes): AccessRequestSummary {
  return {
    id: request.id,
    scope: request.scope,
    status: request.status,
    message: request.message,
    decisionMessage: request.decisionMessage,
    requestedRole: request.requestedRole,
    requester: {
      id: request.requester.id,
      name: request.requester.name,
      email: request.requester.email,
    },
    target: {
      departmentId: request.departmentId,
      departmentName: request.department?.name ?? null,
      boardId: request.boardId,
      boardName: request.board?.name ?? null,
      epicId: request.epicId,
      epicTitle: request.epic?.title ?? null,
    },
    createdAt: request.createdAt.toISOString(),
    decidedAt: request.decidedAt?.toISOString() ?? null,
  }
}
