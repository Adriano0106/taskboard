import type { KanbanBoard } from './api.js'
import type { DragData, TaskLocation } from './types/kanban.js'

export function findTaskLocation(board: KanbanBoard, taskId: string): TaskLocation | null {
  for (const column of board.columns) {
    const taskIndex = column.tasks.findIndex((task) => task.id === taskId)

    if (taskIndex !== -1) {
      return {
        columnId: column.id,
        position: taskIndex + 1,
      }
    }
  }

  return null
}

export function findDropLocation(
  board: KanbanBoard,
  overId: string | number,
  dragData: DragData | undefined,
): TaskLocation | null {
  if (dragData?.type === 'column') {
    const column = board.columns.find((boardColumn) => boardColumn.id === dragData.columnId)

    if (!column) {
      return null
    }

    return {
      columnId: column.id,
      position: column.tasks.length + 1,
    }
  }

  const overTaskId = String(overId)

  for (const column of board.columns) {
    const taskIndex = column.tasks.findIndex((task) => task.id === overTaskId)

    if (taskIndex !== -1) {
      return {
        columnId: column.id,
        position: taskIndex + 1,
      }
    }
  }

  return null
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
