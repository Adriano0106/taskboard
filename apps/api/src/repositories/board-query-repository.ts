import type { PrismaClient } from '@prisma/client'
import { boardInclude, mapBoardToKanbanBoard } from './board-mappers.js'
import { BoardError } from './board-types.js'
import type { GetKanbanTaskDetailInput, KanbanBoard, KanbanTaskDetail } from './board-types.js'

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

    return transaction.board.findUniqueOrThrow({
      where: {
        id: board.id,
      },
      include: boardInclude,
    })
  })

  return mapBoardToKanbanBoard(createdBoard)
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
