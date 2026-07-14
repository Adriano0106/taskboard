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
  companySlug: string
  departmentKey: string
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
  companySlug: string
  departmentKey: string
  boardKey: string
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

export type TaskActivityType =
  | 'CREATED'
  | 'COMMENTED'
  | 'MOVED'
  | 'TITLE_CHANGED'
  | 'DESCRIPTION_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'WATCHER_ADDED'
  | 'WATCHER_REMOVED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED'

export interface KanbanTaskActivity {
  id: string
  type: TaskActivityType
  actorName: string
  metadata: Record<string, string | null>
  createdAt: string
}

export interface KanbanTaskAttachment {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploaderName: string
  createdAt: string
}

export class BoardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BoardError'
  }
}

export interface CreateKanbanTaskInput {
  boardId?: string
  companyId: string
  companyRole: string
  userId: string
  columnId: string
  title: string
  description?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId?: string | null
}

export interface MoveKanbanTaskInput {
  companyId: string
  companyRole: string
  userId: string
  taskId: string
  columnId: string
  position: number
}

export interface UpdateKanbanTaskInput {
  companyId: string
  companyRole: string
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
  boardId?: string
  companyId: string
  companyRole: string
  userId: string
  name: string
  position: number
}

export interface UpdateKanbanColumnInput {
  boardId?: string
  columnId: string
  companyId: string
  companyRole: string
  userId: string
  name: string
}

export interface ReorderKanbanColumnInput {
  boardId?: string
  columnId: string
  companyId: string
  companyRole: string
  userId: string
  position: number
}

export interface DeleteKanbanColumnInput {
  boardId?: string
  companyId: string
  companyRole: string
  userId: string
  columnId: string
}

export interface GetKanbanTaskDetailInput {
  allowPlatformAdmin?: boolean
  companyId: string
  companyRole: string
  taskId: string
  userId: string
}

export interface GetCompanyKanbanBoardInput {
  allowPlatformAdmin?: boolean
  companyId: string
  companyRole: string
  userId: string
  boardId: string
}

export interface TaskCommentInput {
  companyId: string
  companyRole: string
  taskId: string
  userId: string
}

export interface CreateTaskCommentInput extends TaskCommentInput {
  content: string
}

export interface TaskWatcherInput {
  companyId: string
  companyRole: string
  taskId: string
  userId: string
}

export interface TaskActivityInput {
  companyId: string
  companyRole: string
  taskId: string
  userId: string
}

export interface TaskAttachmentInput {
  companyId: string
  companyRole: string
  taskId: string
  userId: string
}

export interface CreateTaskAttachmentInput extends TaskAttachmentInput {
  fileName: string
  contentBase64: string
  contentType: string
}

export interface DeleteTaskAttachmentInput extends TaskAttachmentInput {
  attachmentId: string
}

export interface DownloadTaskAttachmentInput extends DeleteTaskAttachmentInput {}

export interface DownloadTaskAttachmentResult {
  fileName: string
  contentType: string
  content: Buffer
}

export interface UpdateTaskWatcherInput extends TaskWatcherInput {
  watcherUserId: string
}
