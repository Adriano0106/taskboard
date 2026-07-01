import type { Prisma, PrismaClient } from '@prisma/client'
import { type BoardPermissionContext, assertBoardPermission } from '../scoped-permissions.js'
import { BoardError } from './board-types.js'

export async function assertCanManageColumns(prisma: PrismaClient, input: BoardPermissionContext) {
  await assertBoardPermission(
    prisma,
    input,
    'ManageColumns',
    () => new BoardError('Only company owners and admins can manage board columns'),
  )
}

export function normalizeColumnPosition(position: number, maxPosition: number) {
  return Math.min(Math.max(position, 1), maxPosition)
}

export async function shiftColumnsFromPosition(
  transaction: Prisma.TransactionClient,
  boardId: string,
  position: number,
) {
  const columnsToShift = await transaction.boardColumn.findMany({
    where: {
      boardId,
      position: {
        gte: position,
      },
    },
    orderBy: {
      position: 'desc',
    },
  })

  for (const column of columnsToShift) {
    await transaction.boardColumn.update({
      where: {
        id: column.id,
      },
      data: {
        position: column.position + 1,
      },
    })
  }
}
