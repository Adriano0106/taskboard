import type { CompanyPermission } from './permissions.js'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export interface AuthSession {
  user: {
    id: string
    name: string
    email: string
  }
  company: {
    id: string
    name: string
    slug: string
    theme: CompanyTheme
    role: string
    permissions: CompanyPermission[]
  }
  isPlatformAdmin: boolean
  token: string
}

export interface RegisterAccountPayload {
  name: string
  email: string
  password: string
  companyName: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface KanbanTaskCard {
  id: string
  friendlyId: string
  title: string
  priority: TaskPriority
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
  priority: TaskPriority
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

export interface CompanyWorkspace {
  id: string
  name: string
  slug: string
  theme: CompanyTheme
  role: string
  permissions: CompanyPermission[]
  departments: Array<{
    id: string
    key: string
    name: string
    boards: Array<{
      id: string
      key: string
      name: string
      description: string | null
    }>
  }>
}

export interface CompanyTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  boardBackgroundColor: string
}

export interface PlatformCompanySummary {
  id: string
  name: string
  memberCount: number
  departmentCount: number
  boardCount: number
  createdAt: string
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface CompanyMember {
  id: string
  name: string
  email: string
  role: CompanyRole
  isActive: boolean
}

export type CompanyRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface CreateTaskPayload {
  title: string
  columnId: string
  description?: string
  priority?: TaskPriority
  assigneeId?: string
}

export interface MoveTaskPayload {
  columnId: string
  position: number
}

export interface UpdateTaskPayload {
  title: string
  description?: string
  priority: TaskPriority
  assigneeId?: string | null
}

export interface UpdateTaskResponse {
  board: KanbanBoard
  task: KanbanTaskDetail
}

export interface ReorderColumnPayload {
  position: number
}

export interface ColumnPayload {
  name: string
  position?: number
}

export interface DepartmentPayload {
  name: string
}

export interface BoardPayload {
  name: string
  description?: string
}

export interface CompanyPayload {
  name: string
  slug: string
  theme?: CompanyTheme
}

export interface CreateCompanyMemberPayload {
  name: string
  email: string
  password: string
  role: CompanyRole
}

export interface UpdateCompanyMemberPayload {
  role: CompanyRole
}

export async function registerAccount(payload: RegisterAccountPayload): Promise<AuthSession> {
  return sendRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  return sendRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCurrentSession(token: string): Promise<Omit<AuthSession, 'token'>> {
  return sendRequest<Omit<AuthSession, 'token'>>('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getCurrentKanbanBoard(token: string): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>('/boards/current/kanban', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getCompanyKanbanBoard(
  token: string,
  companyId: string,
  boardId: string,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/companies/${companyId}/boards/${boardId}/kanban`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getCurrentCompanyWorkspace(token: string): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>('/companies/current', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getCompanyWorkspace(
  token: string,
  companyId: string,
): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>(`/companies/${companyId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getCompanyWorkspaceBySlug(
  token: string,
  companySlug: string,
): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>(`/companies/by-slug/${companySlug}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function updateCompany(
  token: string,
  payload: CompanyPayload,
): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>('/companies/current', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function getPlatformCompanies(token: string): Promise<PlatformCompanySummary[]> {
  return sendRequest<PlatformCompanySummary[]>('/admin/companies', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createDepartment(
  token: string,
  payload: DepartmentPayload,
): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>('/companies/current/departments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function renameDepartment(
  token: string,
  departmentId: string,
  payload: DepartmentPayload,
): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>(`/companies/current/departments/${departmentId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteDepartment(
  token: string,
  departmentId: string,
): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>(`/companies/current/departments/${departmentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createBoard(
  token: string,
  departmentId: string,
  payload: BoardPayload,
): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>(`/companies/current/departments/${departmentId}/boards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function updateBoard(
  token: string,
  boardId: string,
  payload: BoardPayload,
): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>(`/companies/current/boards/${boardId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteBoard(token: string, boardId: string): Promise<CompanyWorkspace> {
  return sendRequest<CompanyWorkspace>(`/companies/current/boards/${boardId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getCurrentCompanyMembers(token: string): Promise<CompanyMember[]> {
  return sendRequest<CompanyMember[]>('/companies/current/members', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createCompanyMember(
  token: string,
  payload: CreateCompanyMemberPayload,
): Promise<CompanyMember[]> {
  return sendRequest<CompanyMember[]>('/companies/current/members', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function updateCompanyMemberRole(
  token: string,
  userId: string,
  payload: UpdateCompanyMemberPayload,
): Promise<CompanyMember[]> {
  return sendRequest<CompanyMember[]>(`/companies/current/members/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function updateCompanyMemberStatus(
  token: string,
  userId: string,
  isActive: boolean,
): Promise<CompanyMember[]> {
  return sendRequest<CompanyMember[]>(`/companies/current/members/${userId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isActive }),
  })
}

export async function createTask(
  token: string,
  companyId: string,
  boardId: string,
  payload: CreateTaskPayload,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/companies/${companyId}/boards/${boardId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function moveTask(
  token: string,
  taskId: string,
  payload: MoveTaskPayload,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/tasks/${taskId}/move`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function updateTask(
  token: string,
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<UpdateTaskResponse> {
  return sendRequest<UpdateTaskResponse>(`/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function getTaskDetail(token: string, taskId: string): Promise<KanbanTaskDetail> {
  return sendRequest<KanbanTaskDetail>(`/tasks/${taskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getTaskComments(token: string, taskId: string): Promise<KanbanTaskComment[]> {
  return sendRequest<KanbanTaskComment[]>(`/tasks/${taskId}/comments`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getTaskActivities(
  token: string,
  taskId: string,
): Promise<KanbanTaskActivity[]> {
  return sendRequest<KanbanTaskActivity[]>(`/tasks/${taskId}/activities`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getTaskAttachments(
  token: string,
  taskId: string,
): Promise<KanbanTaskAttachment[]> {
  return sendRequest<KanbanTaskAttachment[]>(`/tasks/${taskId}/attachments`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createTaskAttachment(
  token: string,
  taskId: string,
  file: File,
): Promise<KanbanTaskAttachment> {
  const contentBase64 = await fileToBase64(file)

  return sendRequest<KanbanTaskAttachment>(`/tasks/${taskId}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      contentBase64,
    }),
  })
}

export async function deleteTaskAttachment(
  token: string,
  taskId: string,
  attachmentId: string,
): Promise<KanbanTaskAttachment[]> {
  return sendRequest<KanbanTaskAttachment[]>(`/tasks/${taskId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function downloadTaskAttachment(
  token: string,
  taskId: string,
  attachmentId: string,
  fileName: string,
) {
  const response = await fetch(`${apiUrl}/tasks/${taskId}/attachments/${attachmentId}/download`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(errorBody?.message ?? 'Nao foi possivel baixar o anexo')
  }

  const objectUrl = URL.createObjectURL(await response.blob())
  const linkElement = document.createElement('a')

  linkElement.href = objectUrl
  linkElement.download = fileName
  document.body.appendChild(linkElement)
  linkElement.click()
  linkElement.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function createTaskComment(
  token: string,
  taskId: string,
  content: string,
): Promise<KanbanTaskComment> {
  return sendRequest<KanbanTaskComment>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
    }),
  })
}

export async function getTaskWatchers(token: string, taskId: string): Promise<KanbanTaskWatcher[]> {
  return sendRequest<KanbanTaskWatcher[]>(`/tasks/${taskId}/watchers`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function addTaskWatcher(
  token: string,
  taskId: string,
  userId: string,
): Promise<KanbanTaskWatcher[]> {
  return sendRequest<KanbanTaskWatcher[]>(`/tasks/${taskId}/watchers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userId,
    }),
  })
}

export async function removeTaskWatcher(
  token: string,
  taskId: string,
  userId: string,
): Promise<KanbanTaskWatcher[]> {
  return sendRequest<KanbanTaskWatcher[]>(`/tasks/${taskId}/watchers/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createColumn(
  token: string,
  companyId: string,
  boardId: string,
  payload: ColumnPayload,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/companies/${companyId}/boards/${boardId}/columns`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function renameColumn(
  token: string,
  companyId: string,
  boardId: string,
  columnId: string,
  payload: ColumnPayload,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/companies/${companyId}/boards/${boardId}/columns/${columnId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function reorderColumn(
  token: string,
  companyId: string,
  boardId: string,
  columnId: string,
  payload: ReorderColumnPayload,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(
    `/companies/${companyId}/boards/${boardId}/columns/${columnId}/reorder`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  )
}

export async function deleteColumn(
  token: string,
  companyId: string,
  boardId: string,
  columnId: string,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/companies/${companyId}/boards/${boardId}/columns/${columnId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

async function sendRequest<ResponseBody>(path: string, init: RequestInit): Promise<ResponseBody> {
  const requestHeaders = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...init.headers,
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: requestHeaders,
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(errorBody?.message ?? 'Não foi possível concluir a solicitação')
  }

  return response.json() as Promise<ResponseBody>
}

async function fileToBase64(file: File) {
  const content = await file.arrayBuffer()
  let binaryContent = ''
  const bytes = new Uint8Array(content)

  for (const byte of bytes) {
    binaryContent += String.fromCharCode(byte)
  }

  return btoa(binaryContent)
}
