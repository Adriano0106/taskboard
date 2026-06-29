import type { KanbanBoard, KanbanTaskCard } from './api.js'
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

export function areTaskLocationsEqual(
  firstLocation: TaskLocation | null,
  secondLocation: TaskLocation | null,
) {
  return (
    firstLocation?.columnId === secondLocation?.columnId &&
    firstLocation?.position === secondLocation?.position
  )
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

export function createTaskMovePreview(
  board: KanbanBoard,
  taskId: string,
  targetLocation: TaskLocation,
): KanbanBoard {
  let movingTask: KanbanTaskCard | null = null
  const columnsWithoutMovingTask = board.columns.map((column) => {
    const remainingTasks = column.tasks.filter((task) => {
      if (task.id !== taskId) {
        return true
      }

      movingTask = task
      return false
    })

    return {
      ...column,
      tasks: remainingTasks,
    }
  })

  if (!movingTask) {
    return board
  }

  return {
    ...board,
    columns: columnsWithoutMovingTask.map((column) => {
      if (column.id !== targetLocation.columnId) {
        return column
      }

      const insertionIndex = Math.min(Math.max(targetLocation.position - 1, 0), column.tasks.length)
      const previewTasks = [...column.tasks]
      previewTasks.splice(insertionIndex, 0, movingTask as KanbanTaskCard)

      return {
        ...column,
        tasks: previewTasks,
      }
    }),
  }
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
