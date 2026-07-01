import type { PrismaClient, ScopedRole } from '@prisma/client'
import { type CompanyPermission, getCompanyPermissions } from './permissions.js'

export type BoardPermission = CompanyPermission | 'ViewBoard' | 'ManageBoards'

const scopedRoleRank: Record<ScopedRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  MANAGER: 3,
}

const scopedRolePermissions: Record<ScopedRole, BoardPermission[]> = {
  MANAGER: [
    'ViewBoard',
    'ManageBoards',
    'ManageColumns',
    'CreateTask',
    'EditTask',
    'MoveTask',
    'CommentTask',
    'ManageTaskWatchers',
    'ManageTaskAttachments',
  ],
  MEMBER: [
    'ViewBoard',
    'CreateTask',
    'EditTask',
    'MoveTask',
    'CommentTask',
    'ManageTaskWatchers',
    'ManageTaskAttachments',
  ],
  VIEWER: ['ViewBoard'],
}

export class ScopedPermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScopedPermissionError'
  }
}

export interface BoardPermissionContext {
  allowPlatformAdmin?: boolean
  boardId?: string
  columnId?: string
  companyId: string
  companyRole: string
  taskId?: string
  userId: string
}

export async function assertBoardPermission(
  prisma: PrismaClient,
  input: BoardPermissionContext,
  permission: BoardPermission,
  createError: (message: string) => Error = (message) => new ScopedPermissionError(message),
) {
  const permissions = await resolveBoardPermissions(prisma, input)

  if (!permissions.includes(permission)) {
    throw createError(`Missing permission: ${permission}`)
  }
}

export async function resolveBoardPermissions(
  prisma: PrismaClient,
  input: BoardPermissionContext,
): Promise<BoardPermission[]> {
  if (input.allowPlatformAdmin) {
    return allBoardPermissions()
  }

  if (isCompanyAdmin(input.companyRole)) {
    return allBoardPermissions()
  }

  const board = await findBoardPermissionScope(prisma, input)

  if (!board) {
    return []
  }

  const departmentRole = board.department.members[0]?.role ?? null
  const boardRole = board.members[0]?.role ?? null
  const effectiveRole = getHighestScopedRole([departmentRole, boardRole])

  return effectiveRole ? scopedRolePermissions[effectiveRole] : []
}

function allBoardPermissions(): BoardPermission[] {
  return Array.from(
    new Set<BoardPermission>(['ViewBoard', 'ManageBoards', ...getCompanyPermissions('OWNER')]),
  )
}

function isCompanyAdmin(role: string) {
  return role === 'OWNER' || role === 'ADMIN'
}

function getHighestScopedRole(roles: Array<ScopedRole | null>) {
  return roles.reduce<ScopedRole | null>((highestRole, role) => {
    if (!role) {
      return highestRole
    }

    if (!highestRole || scopedRoleRank[role] > scopedRoleRank[highestRole]) {
      return role
    }

    return highestRole
  }, null)
}

async function findBoardPermissionScope(prisma: PrismaClient, input: BoardPermissionContext) {
  const boardWhere = input.boardId
    ? {
        id: input.boardId,
        department: {
          companyId: input.companyId,
        },
      }
    : input.columnId
      ? {
          columns: {
            some: {
              id: input.columnId,
            },
          },
          department: {
            companyId: input.companyId,
          },
        }
      : input.taskId
        ? {
            tasks: {
              some: {
                id: input.taskId,
              },
            },
            department: {
              companyId: input.companyId,
            },
          }
        : null

  if (!boardWhere) {
    return null
  }

  return prisma.board.findFirst({
    where: boardWhere,
    select: {
      id: true,
      members: {
        where: {
          userId: input.userId,
        },
        select: {
          role: true,
        },
        take: 1,
      },
      department: {
        select: {
          members: {
            where: {
              userId: input.userId,
            },
            select: {
              role: true,
            },
            take: 1,
          },
        },
      },
    },
  })
}
