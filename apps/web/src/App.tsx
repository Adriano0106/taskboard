import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  type AuthSession,
  type KanbanBoard,
  createTask,
  getCurrentKanbanBoard,
  getCurrentSession,
  login,
  registerAccount,
} from './api.js'

type AuthMode = 'login' | 'register'

const sessionStorageKey = 'taskboard.session'

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isKanbanLoading, setIsKanbanLoading] = useState(false)
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [kanbanStatusMessage, setKanbanStatusMessage] = useState('')

  useEffect(() => {
    if (!session?.token) {
      return
    }

    getCurrentSession(session.token)
      .then((currentSession) => {
        const refreshedSession = {
          ...currentSession,
          token: session.token,
        }

        setSession(refreshedSession)
        localStorage.setItem(sessionStorageKey, JSON.stringify(refreshedSession))
      })
      .catch(() => {
        localStorage.removeItem(sessionStorageKey)
        setSession(null)
        setKanbanBoard(null)
      })
  }, [session?.token])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    setIsKanbanLoading(true)
    setKanbanStatusMessage('')

    getCurrentKanbanBoard(session.token)
      .then((board) => {
        setKanbanBoard(board)
      })
      .catch((error) => {
        setKanbanStatusMessage(
          error instanceof Error ? error.message : 'Nao foi possivel carregar o quadro',
        )
      })
      .finally(() => {
        setIsKanbanLoading(false)
      })
  }, [session?.token])

  const authModeLabels = useMemo(
    () => ({
      login: 'Entrar',
      register: 'Criar conta',
    }),
    [],
  )

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setIsSubmitting(true)
    setStatusMessage('')

    const formData = new FormData(formEvent.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      const nextSession =
        authMode === 'register'
          ? await registerAccount({
              name: String(formData.get('name') ?? ''),
              companyName: String(formData.get('companyName') ?? ''),
              email,
              password,
            })
          : await login({
              email,
              password,
            })

      localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession))
      setSession(nextSession)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(sessionStorageKey)
    setSession(null)
    setKanbanBoard(null)
    setStatusMessage('')
    setKanbanStatusMessage('')
  }

  async function handleCreateTask(formEvent: FormEvent<HTMLFormElement>, columnId: string) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const title = String(formData.get('title') ?? '').trim()

    if (!title) {
      return
    }

    setCreatingTaskColumnId(columnId)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await createTask(session.token, {
        columnId,
        title,
      })

      setKanbanBoard(updatedBoard)
      formEvent.currentTarget.reset()
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a task',
      )
    } finally {
      setCreatingTaskColumnId(null)
    }
  }

  if (session) {
    return (
      <main className="app-shell">
        <section className="workspace">
          <div>
            <p className="eyebrow">TaskBoard</p>
            <h1>{session.company.name}</h1>
            <p className="muted">
              Sessao ativa para {session.user.name} com perfil {session.company.role}.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Sair
          </button>
        </section>

        {isKanbanLoading ? <p className="surface-message">Carregando quadro...</p> : null}

        {kanbanStatusMessage ? (
          <p className="surface-message error-message">{kanbanStatusMessage}</p>
        ) : null}

        {kanbanBoard ? (
          <>
            <section className="board-header">
              <div>
                <p className="eyebrow">{kanbanBoard.key}</p>
                <h2>{kanbanBoard.name}</h2>
                {kanbanBoard.description ? (
                  <p className="muted">{kanbanBoard.description}</p>
                ) : null}
              </div>
            </section>

            <section className="kanban-preview" aria-label="Quadro Kanban">
              {kanbanBoard.columns.map((column) => (
                <div className="column" key={column.id}>
                  <h2>{column.name}</h2>
                  <form
                    className="task-form"
                    onSubmit={(event) => handleCreateTask(event, column.id)}
                  >
                    <input
                      name="title"
                      type="text"
                      minLength={2}
                      placeholder="Nova task"
                      aria-label={`Nova task em ${column.name}`}
                      disabled={creatingTaskColumnId === column.id}
                      required
                    />
                    <button
                      type="submit"
                      className="secondary-button"
                      disabled={creatingTaskColumnId === column.id}
                    >
                      {creatingTaskColumnId === column.id ? 'Criando...' : 'Adicionar'}
                    </button>
                  </form>
                  <div className="task-list">
                    {column.tasks.length > 0 ? (
                      column.tasks.map((task) => (
                        <article key={task.id}>
                          <strong>{task.friendlyId}</strong>
                          <span>{task.title}</span>
                          {task.assigneeName ? (
                            <small>Responsavel: {task.assigneeName}</small>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <p className="empty-column">Sem cards nesta coluna</p>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : null}
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">TaskBoard</p>
          <h1>{authModeLabels[authMode]}</h1>
          <p className="muted">Acesse sua empresa e prepare seus quadros de trabalho.</p>
        </div>

        <div className="mode-switch" aria-label="Modo de autenticacao">
          <button
            type="button"
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => setAuthMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'active' : ''}
            onClick={() => setAuthMode('register')}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {authMode === 'register' ? (
            <>
              <label>
                Nome
                <input name="name" type="text" minLength={2} required />
              </label>
              <label>
                Empresa
                <input name="companyName" type="text" minLength={2} required />
              </label>
            </>
          ) : null}

          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" minLength={8} required />
          </label>

          {statusMessage ? <p className="error-message">{statusMessage}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : authModeLabels[authMode]}
          </button>
        </form>
      </section>
    </main>
  )
}

function readStoredSession(): AuthSession | null {
  const storedSession = localStorage.getItem(sessionStorageKey)

  if (!storedSession) {
    return null
  }

  try {
    return JSON.parse(storedSession) as AuthSession
  } catch {
    localStorage.removeItem(sessionStorageKey)
    return null
  }
}
