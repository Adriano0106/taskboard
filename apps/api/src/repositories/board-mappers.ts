import type { Prisma } from '@prisma/client'
import type { KanbanBoard } from './board-types.js'

export const boardInclude = {
  department: {
    include: {
      company: true,
    },
  },
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
    companySlug: board.department.company.slug,
    departmentKey: createRouteKeyBase(board.department.name),
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

export function createRouteKeyBase(name: string) {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials =
    words.length === 1
      ? words[0]?.slice(0, 2)
      : words.map((word) => word[0] ?? '').join('').slice(0, 3)
  const fallbackKey = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3)

  return (initials || fallbackKey || 'DP').toUpperCase().padEnd(2, 'X')
}
