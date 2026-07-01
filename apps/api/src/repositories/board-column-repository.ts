import type { PrismaClient } from '@prisma/client'
import {
  assertCanManageColumns,
  normalizeColumnPosition,
  shiftColumnsFromPosition,
} from './board-column-helpers.js'
import { isProtectedColumnName } from './board-defaults.js'
import { boardInclude, mapBoardToKanbanBoard } from './board-mappers.js'
import { getCompanyKanbanBoard, getOrCreateCompanyKanbanBoard } from './board-query-repository.js'
import { BoardError } from './board-types.js'
import type {
  DeleteKanbanColumnInput,
  KanbanBoard,
  KanbanColumnInput,
  ReorderKanbanColumnInput,
  UpdateKanbanColumnInput,
} from './board-types.js'

export async function createColumnInCompanyKanbanBoard(
  prisma: PrismaClient,
  input: KanbanColumnInput,
): Promise<KanbanBoard> {
  await assertCanManageColumns(prisma, input)

  const board = await getTargetBoard(prisma, input)
  const targetPosition = normalizeColumnPosition(input.position, board.columns.length + 1)

  const updatedBoard = await prisma.$transaction(async (transaction) => {
    await shiftColumnsFromPosition(transaction, board.id, targetPosition)

    await transaction.boardColumn.create({
      data: {
        name: input.name.trim(),
        position: targetPosition,
        boardId: board.id,
      },
    })

    return transaction.board.findUniqueOrThrow({
      where: {
        id: board.id,
      },
      include: boardInclude,
    })
  })

  return mapBoardToKanbanBoard(updatedBoard)
}

export async function renameColumnInCompanyKanbanBoard(
  prisma: PrismaClient,
  input: UpdateKanbanColumnInput,
): Promise<KanbanBoard> {
  await assertCanManageColumns(prisma, input)

  const board = await getTargetBoard(prisma, input)
  const column = board.columns.find((boardColumn) => boardColumn.id === input.columnId)

  if (!column) {
    throw new BoardError('Column does not belong to the current board')
  }

  const updatedBoard = await prisma.$transaction(async (transaction) => {
    await transaction.boardColumn.update({
      where: {
        id: input.columnId,
      },
      data: {
        name: input.name.trim(),
      },
    })

    return transaction.board.findUniqueOrThrow({
      where: {
        id: board.id,
      },
      include: boardInclude,
    })
  })

  return mapBoardToKanbanBoard(updatedBoard)
}

export async function reorderColumnInCompanyKanbanBoard(
  prisma: PrismaClient,
  input: ReorderKanbanColumnInput,
): Promise<KanbanBoard> {
  await assertCanManageColumns(prisma, input)

  const board = await getTargetBoard(prisma, input)
  const column = board.columns.find((boardColumn) => boardColumn.id === input.columnId)

  if (!column) {
    throw new BoardError('Column does not belong to the current board')
  }

  const targetPosition = normalizeColumnPosition(input.position, board.columns.length)

  if (targetPosition === column.position) {
    return board
  }

  const updatedBoard = await prisma.$transaction(async (transaction) => {
    await transaction.boardColumn.update({
      where: {
        id: input.columnId,
      },
      data: {
        position: 0,
      },
    })

    const affectedColumns = await transaction.boardColumn.findMany({
      where: {
        boardId: board.id,
        position:
          targetPosition < column.position
            ? {
                gte: targetPosition,
                lt: column.position,
              }
            : {
                gt: column.position,
                lte: targetPosition,
              },
      },
      orderBy: {
        position: targetPosition < column.position ? 'desc' : 'asc',
      },
    })

    for (const affectedColumn of affectedColumns) {
      await transaction.boardColumn.update({
        where: {
          id: affectedColumn.id,
        },
        data: {
          position:
            targetPosition < column.position
              ? affectedColumn.position + 1
              : affectedColumn.position - 1,
        },
      })
    }

    await transaction.boardColumn.update({
      where: {
        id: input.columnId,
      },
      data: {
        position: targetPosition,
      },
    })

    return transaction.board.findUniqueOrThrow({
      where: {
        id: board.id,
      },
      include: boardInclude,
    })
  })

  return mapBoardToKanbanBoard(updatedBoard)
}

export async function deleteColumnFromCompanyKanbanBoard(
  prisma: PrismaClient,
  input: DeleteKanbanColumnInput,
): Promise<KanbanBoard> {
  await assertCanManageColumns(prisma, input)

  const board = await getTargetBoard(prisma, input)
  const column = board.columns.find((boardColumn) => boardColumn.id === input.columnId)

  if (!column) {
    throw new BoardError('Column does not belong to the current board')
  }

  if (board.columns.length <= 1) {
    throw new BoardError('Board must keep at least one column')
  }

  if (isProtectedColumnName(column.name)) {
    throw new BoardError('Protected board columns cannot be deleted')
  }

  if (column.tasks.length > 0) {
    throw new BoardError('Only empty columns can be deleted')
  }

  const updatedBoard = await prisma.$transaction(async (transaction) => {
    await transaction.boardColumn.delete({
      where: {
        id: input.columnId,
      },
    })

    const remainingColumns = board.columns
      .filter((boardColumn) => boardColumn.id !== input.columnId)
      .sort((firstColumn, secondColumn) => firstColumn.position - secondColumn.position)

    for (const [columnIndex, remainingColumn] of remainingColumns.entries()) {
      await transaction.boardColumn.update({
        where: {
          id: remainingColumn.id,
        },
        data: {
          position: columnIndex + 1,
        },
      })
    }

    return transaction.board.findUniqueOrThrow({
      where: {
        id: board.id,
      },
      include: boardInclude,
    })
  })

  return mapBoardToKanbanBoard(updatedBoard)
}

function getTargetBoard(
  prisma: PrismaClient,
  input: {
    boardId?: string
    companyId: string
    companyRole: string
    userId: string
  },
) {
  if (input.boardId) {
    return getCompanyKanbanBoard(prisma, {
      boardId: input.boardId,
      companyId: input.companyId,
      companyRole: input.companyRole,
      userId: input.userId,
    })
  }

  return getOrCreateCompanyKanbanBoard(prisma, {
    companyId: input.companyId,
    userId: input.userId,
  })
}
