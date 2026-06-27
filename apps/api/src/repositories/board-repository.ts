import type { PrismaClient } from '@prisma/client'
import {
  assertCanManageColumns,
  normalizeColumnPosition,
  shiftColumnsFromPosition,
} from './board-column-helpers.js'
import { boardInclude, mapBoardToKanbanBoard } from './board-mappers.js'
import { BoardError } from './board-types.js'
import type {
  CreateKanbanTaskInput,
  DeleteKanbanColumnInput,
  GetKanbanTaskDetailInput,
  KanbanBoard,
  KanbanColumnInput,
  KanbanTaskDetail,
  MoveKanbanTaskInput,
  ReorderKanbanColumnInput,
  UpdateKanbanColumnInput,
} from './board-types.js'

export { BoardError } from './board-types.js'
export type {
  CreateKanbanTaskInput,
  DeleteKanbanColumnInput,
  GetKanbanTaskDetailInput,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnInput,
  KanbanTaskCard,
  KanbanTaskDetail,
  MoveKanbanTaskInput,
  ReorderKanbanColumnInput,
  UpdateKanbanColumnInput,
} from './board-types.js'

export async function getOrCreateCompanyKanbanBoard(
  prisma: PrismaClient,
  input: {
    companyId: string
    userId: string
  },
): Promise<KanbanBoard> {
  const existingBoard = await findFirstCompanyBoard(prisma, input.companyId)

  if (existingBoard) {
    return mapBoardToKanbanBoard(existingBoard)
  }

  const createdBoard = await prisma.$transaction(async (transaction) => {
    const department = await transaction.department.create({
      data: {
        name: 'Produto',
        companyId: input.companyId,
      },
    })

    const board = await transaction.board.create({
      data: {
        key: 'TB',
        name: 'TaskBoard',
        description: 'Quadro inicial para organizar tarefas do projeto.',
        departmentId: department.id,
        members: {
          create: {
            userId: input.userId,
            role: 'OWNER',
          },
        },
        columns: {
          create: [
            {
              name: 'A fazer',
              position: 1,
            },
            {
              name: 'Em progresso',
              position: 2,
            },
            {
              name: 'Concluido',
              position: 3,
            },
          ],
        },
      },
      include: {
        columns: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    })

    const todoColumn = board.columns.find((column) => column.position === 1)
    const progressColumn = board.columns.find((column) => column.position === 2)
    const doneColumn = board.columns.find((column) => column.position === 3)

    if (!todoColumn || !progressColumn || !doneColumn) {
      throw new Error('Starter board columns were not created')
    }

    await transaction.task.createMany({
      data: [
        {
          friendlyId: 'TB-1',
          sequenceNumber: 1,
          title: 'Mapear fluxo inicial do Kanban',
          boardId: board.id,
          columnId: todoColumn.id,
          position: 1,
          assigneeId: input.userId,
        },
        {
          friendlyId: 'TB-2',
          sequenceNumber: 2,
          title: 'Conectar cards ao backend',
          boardId: board.id,
          columnId: progressColumn.id,
          position: 1,
          assigneeId: input.userId,
        },
        {
          friendlyId: 'TB-3',
          sequenceNumber: 3,
          title: 'Definir regras de desenvolvimento',
          boardId: board.id,
          columnId: doneColumn.id,
          position: 1,
          assigneeId: input.userId,
        },
      ],
    })

    await transaction.board.update({
      where: {
        id: board.id,
      },
      data: {
        nextTaskNumber: 4,
      },
    })

    const boardWithTasks = await transaction.board.findUniqueOrThrow({
      where: {
        id: board.id,
      },
      include: boardInclude,
    })

    return boardWithTasks
  })

  return mapBoardToKanbanBoard(createdBoard)
}

export async function createTaskInCompanyKanbanBoard(
  prisma: PrismaClient,
  input: CreateKanbanTaskInput,
): Promise<KanbanBoard> {
  const board = await getOrCreateCompanyKanbanBoard(prisma, {
    companyId: input.companyId,
    userId: input.userId,
  })
  const targetColumn = board.columns.find((column) => column.id === input.columnId)
  const firstColumn = board.columns[0]

  if (!targetColumn) {
    throw new BoardError('Column does not belong to the current board')
  }

  if (!firstColumn || targetColumn.id !== firstColumn.id) {
    throw new BoardError('New tasks can only be created in the first board column')
  }

  const updatedBoard = await prisma.$transaction(async (transaction) => {
    const boardWithNextNumber = await transaction.board.update({
      where: {
        id: board.id,
      },
      data: {
        nextTaskNumber: {
          increment: 1,
        },
      },
    })
    const sequenceNumber = boardWithNextNumber.nextTaskNumber - 1
    const lastTaskInColumn = await transaction.task.findFirst({
      where: {
        boardId: board.id,
        columnId: input.columnId,
      },
      orderBy: {
        position: 'desc',
      },
    })

    await transaction.task.create({
      data: {
        friendlyId: `${board.key}-${sequenceNumber}`,
        sequenceNumber,
        title: input.title.trim(),
        boardId: board.id,
        columnId: input.columnId,
        position: (lastTaskInColumn?.position ?? 0) + 1,
        assigneeId: input.userId,
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

export async function moveTaskInCompanyKanbanBoard(
  prisma: PrismaClient,
  input: MoveKanbanTaskInput,
): Promise<KanbanBoard> {
  const board = await getOrCreateCompanyKanbanBoard(prisma, {
    companyId: input.companyId,
    userId: input.userId,
  })
  const targetColumn = board.columns.find((column) => column.id === input.columnId)
  const movingTask = board.columns
    .flatMap((column) => column.tasks)
    .find((task) => task.id === input.taskId)

  if (!targetColumn) {
    throw new BoardError('Column does not belong to the current board')
  }

  if (!movingTask) {
    throw new BoardError('Task does not belong to the current board')
  }

  const updatedBoard = await prisma.$transaction(async (transaction) => {
    const boardTasks = await transaction.task.findMany({
      where: {
        boardId: board.id,
      },
      orderBy: {
        position: 'asc',
      },
    })
    const taskIdsByColumn = new Map<string, string[]>()

    for (const column of board.columns) {
      taskIdsByColumn.set(
        column.id,
        boardTasks
          .filter((task) => task.columnId === column.id && task.id !== input.taskId)
          .map((task) => task.id),
      )
    }

    const targetTaskIds = taskIdsByColumn.get(input.columnId) ?? []
    const insertionIndex = Math.min(Math.max(input.position - 1, 0), targetTaskIds.length)
    targetTaskIds.splice(insertionIndex, 0, input.taskId)
    taskIdsByColumn.set(input.columnId, targetTaskIds)

    for (const [columnId, taskIds] of taskIdsByColumn.entries()) {
      for (const [taskIndex, taskId] of taskIds.entries()) {
        await transaction.task.update({
          where: {
            id: taskId,
          },
          data: {
            columnId,
            position: taskIndex + 1,
          },
        })
      }
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

export async function createColumnInCompanyKanbanBoard(
  prisma: PrismaClient,
  input: KanbanColumnInput,
): Promise<KanbanBoard> {
  assertCanManageColumns(input.companyRole)

  const board = await getOrCreateCompanyKanbanBoard(prisma, {
    companyId: input.companyId,
    userId: input.userId,
  })
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
  assertCanManageColumns(input.companyRole)

  const board = await getOrCreateCompanyKanbanBoard(prisma, {
    companyId: input.companyId,
    userId: input.userId,
  })
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
  assertCanManageColumns(input.companyRole)

  const board = await getOrCreateCompanyKanbanBoard(prisma, {
    companyId: input.companyId,
    userId: input.userId,
  })
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
  assertCanManageColumns(input.companyRole)

  const board = await getOrCreateCompanyKanbanBoard(prisma, {
    companyId: input.companyId,
    userId: input.userId,
  })
  const column = board.columns.find((boardColumn) => boardColumn.id === input.columnId)

  if (!column) {
    throw new BoardError('Column does not belong to the current board')
  }

  if (board.columns.length <= 1) {
    throw new BoardError('Board must keep at least one column')
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

export async function getKanbanTaskDetail(
  prisma: PrismaClient,
  input: GetKanbanTaskDetailInput,
): Promise<KanbanTaskDetail> {
  const task = await prisma.task.findFirst({
    where: {
      id: input.taskId,
      board: {
        department: {
          companyId: input.companyId,
        },
      },
    },
    include: {
      assignee: true,
      board: true,
      column: true,
    },
  })

  if (!task) {
    throw new BoardError('Task does not belong to the current company')
  }

  return {
    id: task.id,
    friendlyId: task.friendlyId,
    title: task.title,
    description: task.description,
    boardName: task.board.name,
    columnName: task.column.name,
    assigneeName: task.assignee?.name ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

async function findFirstCompanyBoard(prisma: PrismaClient, companyId: string) {
  return prisma.board.findFirst({
    where: {
      department: {
        companyId,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: boardInclude,
  })
}
