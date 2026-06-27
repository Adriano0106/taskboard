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
  boardName: string
  columnName: string
  assigneeName: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTaskPayload {
  title: string
  columnId: string
}

export interface MoveTaskPayload {
  columnId: string
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

export async function getTaskDetail(token: string, taskId: string): Promise<KanbanTaskDetail> {
  return sendRequest<KanbanTaskDetail>(`/tasks/${taskId}`, {
    method: 'GET',
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
