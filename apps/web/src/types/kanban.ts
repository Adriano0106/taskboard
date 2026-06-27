import type { KanbanTaskCard } from '../api.js'

export interface TaskLocation {
  columnId: string
  position: number
}

export interface TaskDragData {
  type: 'task'
  task: KanbanTaskCard
  columnId?: string
}

export interface ColumnDragData {
  type: 'column'
  columnId: string
}

export type DragData = TaskDragData | ColumnDragData
