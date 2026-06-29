import type { Prisma } from '@prisma/client'
import type { KanbanBoard } from './board-types.js'

export const boardInclude = {
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
} as const satisfies Prisma.BoardInclude

type BoardWithKanbanRelations = Prisma.BoardGetPayload<{
  include: typeof boardInclude
}>

export function mapBoardToKanbanBoard(board: BoardWithKanbanRelations | null): KanbanBoard {
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
        priority: task.priority,
        assigneeName: task.assignee?.name ?? null,
      })),
    })),
  }
}
