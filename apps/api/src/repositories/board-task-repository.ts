import type { PrismaClient } from '@prisma/client'
import { boardInclude, mapBoardToKanbanBoard } from './board-mappers.js'
import { getKanbanTaskDetail, getOrCreateCompanyKanbanBoard } from './board-query-repository.js'
import { BoardError } from './board-types.js'
import { createTaskActivity } from './task-activity-writer.js'
import type {
  CreateKanbanTaskInput,
  KanbanBoard,
  MoveKanbanTaskInput,
  UpdateKanbanTaskInput,
  UpdateKanbanTaskResult,
} from './board-types.js'

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
    const assigneeId = input.assigneeId ?? input.userId
    const assigneeMembership = await transaction.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: assigneeId,
          companyId: input.companyId,
        },
      },
    })

    if (!assigneeMembership) {
      throw new BoardError('Assignee does not belong to the current company')
    }

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

    const task = await transaction.task.create({
      data: {
        friendlyId: `${board.key}-${sequenceNumber}`,
        sequenceNumber,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority ?? 'MEDIUM',
        boardId: board.id,
        columnId: input.columnId,
        position: (lastTaskInColumn?.position ?? 0) + 1,
        assigneeId,
      },
    })

    await createTaskActivity(transaction, {
      actorId: input.userId,
      taskId: task.id,
      type: 'CREATED',
      metadata: {
        title: task.title,
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
  const sourceColumn = board.columns.find((column) =>
    column.tasks.some((task) => task.id === input.taskId),
  )
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

    await createTaskActivity(transaction, {
      actorId: input.userId,
      taskId: input.taskId,
      type: 'MOVED',
      metadata: {
        fromColumn: sourceColumn?.name ?? null,
        toColumn: targetColumn.name,
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

export async function updateTaskInCompanyKanbanBoard(
  prisma: PrismaClient,
  input: UpdateKanbanTaskInput,
): Promise<UpdateKanbanTaskResult> {
  const existingTask = await prisma.task.findFirst({
    where: {
      id: input.taskId,
      board: {
        department: {
          companyId: input.companyId,
        },
      },
    },
    select: {
      assignee: true,
      assigneeId: true,
      boardId: true,
      priority: true,
    },
  })

  if (!existingTask) {
    throw new BoardError('Task does not belong to the current company')
  }

  if (input.assigneeId) {
    const assigneeMembership = await prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: input.assigneeId,
          companyId: input.companyId,
        },
      },
    })

    if (!assigneeMembership) {
      throw new BoardError('Assignee does not belong to the current company')
    }
  }

  const updatedAssigneeId = input.assigneeId ?? null
  const updatedTask = await prisma.$transaction(async (transaction) => {
    const task = await transaction.task.update({
      where: {
        id: input.taskId,
      },
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        assigneeId: updatedAssigneeId,
      },
      include: {
        assignee: true,
      },
    })

    if (existingTask.priority !== input.priority) {
      await createTaskActivity(transaction, {
        actorId: input.userId,
        taskId: input.taskId,
        type: 'PRIORITY_CHANGED',
        metadata: {
          fromPriority: existingTask.priority,
          toPriority: input.priority,
        },
      })
    }

    if (existingTask.assigneeId !== updatedAssigneeId) {
      await createTaskActivity(transaction, {
        actorId: input.userId,
        taskId: input.taskId,
        type: 'ASSIGNEE_CHANGED',
        metadata: {
          fromAssignee: existingTask.assignee?.name ?? null,
          toAssignee: task.assignee?.name ?? null,
        },
      })
    }

    return task
  })

  const board = await prisma.board.findUniqueOrThrow({
    where: {
      id: updatedTask.boardId,
    },
    include: boardInclude,
  })
  const task = await getKanbanTaskDetail(prisma, {
    companyId: input.companyId,
    taskId: input.taskId,
  })

  return {
    board: mapBoardToKanbanBoard(board),
    task,
  }
}
