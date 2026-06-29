export interface KanbanTaskCard {
  id: string
  friendlyId: string
  title: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
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

export interface KanbanTaskDetail {
  id: string
  friendlyId: string
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  boardName: string
  columnName: string
  assigneeId: string | null
  assigneeName: string | null
  createdAt: string
  updatedAt: string
}

export interface KanbanTaskComment {
  id: string
  content: string
  authorName: string
  createdAt: string
}

export interface KanbanTaskWatcher {
  userId: string
  name: string
  email: string
  createdAt: string
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
  description?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId?: string | null
}

export interface MoveKanbanTaskInput {
  companyId: string
  userId: string
  taskId: string
  columnId: string
  position: number
}

export interface UpdateKanbanTaskInput {
  companyId: string
  userId: string
  taskId: string
  title: string
  description?: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId?: string | null
}

export interface UpdateKanbanTaskResult {
  board: KanbanBoard
  task: KanbanTaskDetail
}

export interface KanbanColumnInput {
  companyId: string
  companyRole: string
  userId: string
  name: string
  position: number
}

export interface UpdateKanbanColumnInput {
  columnId: string
  companyId: string
  companyRole: string
  userId: string
  name: string
}

export interface ReorderKanbanColumnInput {
  columnId: string
  companyId: string
  companyRole: string
  userId: string
  position: number
}

export interface DeleteKanbanColumnInput {
  companyId: string
  companyRole: string
  userId: string
  columnId: string
}

export interface GetKanbanTaskDetailInput {
  companyId: string
  taskId: string
}

export interface GetCompanyKanbanBoardInput {
  allowPlatformAdmin?: boolean
  companyId: string
  userId: string
  boardId: string
}

export interface TaskCommentInput {
  companyId: string
  taskId: string
  userId: string
}

export interface CreateTaskCommentInput extends TaskCommentInput {
  content: string
}

export interface TaskWatcherInput {
  companyId: string
  taskId: string
  userId: string
}

export interface UpdateTaskWatcherInput extends TaskWatcherInput {
  watcherUserId: string
}
