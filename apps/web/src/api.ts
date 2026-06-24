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

export interface CreateTaskPayload {
  title: string
  columnId: string
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

async function sendRequest<ResponseBody>(path: string, init: RequestInit): Promise<ResponseBody> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(errorBody?.message ?? 'Não foi possível concluir a solicitação')
  }

  return response.json() as Promise<ResponseBody>
}
