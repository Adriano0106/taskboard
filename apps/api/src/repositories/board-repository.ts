import type { PrismaClient } from '@prisma/client'

export interface KanbanTaskCard {
  id: string
  friendlyId: string
  title: string
  assigneeName: string | null
}

export interface KanbanColumn {
  id: string
  name: string
  position: number
  tasks: KanbanTaskCard[]
}

export interface KanbanBoard {
  id: string
  key: string
  name: string
  description: string | null
  columns: KanbanColumn[]
}

export class BoardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BoardError'
  }
}

export interface CreateKanbanTaskInput {
  companyId: string
  userId: string
  columnId: string
  title: string
}

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

  if (!targetColumn) {
    throw new BoardError('Column does not belong to the current board')
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

const boardInclude = {
  columns: {
    orderBy: {
      position: 'asc',
    },
    include: {
      tasks: {
        orderBy: {
          position: 'asc',
        },
        include: {
          assignee: true,
        },
      },
    },
  },
} as const

function mapBoardToKanbanBoard(
  board: Awaited<ReturnType<typeof findFirstCompanyBoard>>,
): KanbanBoard {
  if (!board) {
    throw new Error('Board not found')
  }

  return {
    id: board.id,
    key: board.key,
    name: board.name,
    description: board.description,
    columns: board.columns.map((column) => ({
      id: column.id,
      name: column.name,
      position: column.position,
      tasks: column.tasks.map((task) => ({
        id: task.id,
        friendlyId: task.friendlyId,
        title: task.title,
        assigneeName: task.assignee?.name ?? null,
      })),
    })),
  }
}
