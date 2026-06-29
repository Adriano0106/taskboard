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
    role: string
  }
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
  | 'PRIORITY_CHANGED'
  | 'ASSIGNEE_CHANGED'

export interface KanbanTaskActivity {
  id: string
  type: TaskActivityType
  actorName: string
  metadata: Record<string, string | null>
  createdAt: string
}

export interface CompanyWorkspace {
  id: string
  name: string
  role: string
  departments: Array<{
    id: string
    name: string
    boards: Array<{
      id: string
      key: string
      name: string
      description: string | null
    }>
  }>
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
  role: string
}

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

export async function getPlatformCompanies(token: string): Promise<PlatformCompanySummary[]> {
  return sendRequest<PlatformCompanySummary[]>('/admin/companies', {
    method: 'GET',
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

export async function createTask(token: string, payload: CreateTaskPayload): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>('/boards/current/tasks', {
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

export async function createColumn(token: string, payload: ColumnPayload): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>('/boards/current/columns', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function renameColumn(
  token: string,
  columnId: string,
  payload: ColumnPayload,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/boards/current/columns/${columnId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function reorderColumn(
  token: string,
  columnId: string,
  payload: ReorderColumnPayload,
): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/boards/current/columns/${columnId}/reorder`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteColumn(token: string, columnId: string): Promise<KanbanBoard> {
  return sendRequest<KanbanBoard>(`/boards/current/columns/${columnId}`, {
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
