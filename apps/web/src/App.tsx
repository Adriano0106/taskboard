import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  type AuthSession,
  type KanbanBoard,
  type KanbanColumn,
  type KanbanTaskCard,
  type KanbanTaskDetail,
  createColumn,
  createTask,
  deleteColumn,
  getCurrentKanbanBoard,
  getCurrentSession,
  getTaskDetail,
  login,
  moveTask,
  registerAccount,
  renameColumn,
  reorderColumn,
} from './api.js'
import { ColumnOrganizerDialog } from './components/ColumnOrganizerDialog.js'
import { KanbanColumnView, TaskCardPreview } from './components/KanbanColumnView.js'
import { TaskDetailDialog } from './components/TaskDetailDialog.js'
import { createTaskMovePreview, findDropLocation, findTaskLocation } from './kanban-helpers.js'
import { readStoredSession, sessionStorageKey } from './session-storage.js'
import type { DragData } from './types/kanban.js'

type AuthMode = 'login' | 'register'

const taskDropAnimation = {
  duration: 180,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
}

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard | null>(null)
  const [kanbanBoardPreview, setKanbanBoardPreview] = useState<KanbanBoard | null>(null)
  const [activeTask, setActiveTask] = useState<KanbanTaskCard | null>(null)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<KanbanTaskDetail | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isKanbanLoading, setIsKanbanLoading] = useState(false)
  const [isTaskDetailLoading, setIsTaskDetailLoading] = useState(false)
  const [isColumnOrganizerOpen, setIsColumnOrganizerOpen] = useState(false)
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null)
  const [reorderingColumnId, setReorderingColumnId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [kanbanStatusMessage, setKanbanStatusMessage] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

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
  const canManageColumns = session ? ['OWNER', 'ADMIN'].includes(session.company.role) : false
  const visibleKanbanBoard = kanbanBoardPreview ?? kanbanBoard

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
    setKanbanBoardPreview(null)
    setSelectedTaskDetail(null)
    setStatusMessage('')
    setKanbanStatusMessage('')
  }

  async function handleCreateTask(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const firstColumn = kanbanBoard?.columns[0]

    if (!session?.token || !firstColumn) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const title = String(formData.get('title') ?? '').trim()

    if (!title) {
      return
    }

    setCreatingTaskColumnId(firstColumn.id)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await createTask(session.token, {
        columnId: firstColumn.id,
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

  async function handleCreateColumn(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setKanbanStatusMessage('')

    try {
      const updatedBoard = await createColumn(session.token, {
        name,
        position: (kanbanBoard?.columns.length ?? 0) + 1,
      })

      setKanbanBoard(updatedBoard)
      formEvent.currentTarget.reset()
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a coluna',
      )
    }
  }

  async function handleRenameColumn(formEvent: FormEvent<HTMLFormElement>, column: KanbanColumn) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name || name === column.name) {
      return
    }

    setEditingColumnId(column.id)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await renameColumn(session.token, column.id, {
        name,
      })

      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel renomear a coluna',
      )
    } finally {
      setEditingColumnId(null)
    }
  }

  async function handleDeleteColumn(column: KanbanColumn) {
    if (!session?.token) {
      return
    }

    setDeletingColumnId(column.id)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await deleteColumn(session.token, column.id)
      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover a coluna',
      )
    } finally {
      setDeletingColumnId(null)
    }
  }

  async function handleReorderColumn(columnId: string, position: number) {
    if (!session?.token) {
      return
    }

    setReorderingColumnId(columnId)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await reorderColumn(session.token, columnId, {
        position,
      })

      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel reorganizar as colunas',
      )
    } finally {
      setReorderingColumnId(null)
    }
  }

  async function handleOpenTask(taskId: string) {
    if (!session?.token) {
      return
    }

    setSelectedTaskDetail(null)
    setIsTaskDetailLoading(true)
    setKanbanStatusMessage('')

    try {
      const taskDetail = await getTaskDetail(session.token, taskId)
      setSelectedTaskDetail(taskDetail)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel carregar a task',
      )
    } finally {
      setIsTaskDetailLoading(false)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const dragData = event.active.data.current as DragData | undefined

    if (dragData?.type === 'task') {
      setActiveTask(dragData.task)
      setKanbanBoardPreview(null)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (!kanbanBoard || !activeTask) {
      return
    }

    if (!event.over) {
      setKanbanBoardPreview(null)
      return
    }

    const previewSourceBoard = kanbanBoardPreview ?? kanbanBoard
    const targetLocation = findDropLocation(
      previewSourceBoard,
      event.over.id,
      event.over.data.current as DragData,
    )

    if (!targetLocation) {
      return
    }

    setKanbanBoardPreview(createTaskMovePreview(kanbanBoard, activeTask.id, targetLocation))
  }

  function handleDragCancel() {
    setActiveTask(null)
    setKanbanBoardPreview(null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    setKanbanBoardPreview(null)

    if (!session?.token || !kanbanBoard || !event.over) {
      return
    }

    const activeTaskId = String(event.active.id)
    const sourceLocation = findTaskLocation(kanbanBoard, activeTaskId)
    const targetLocation = findDropLocation(
      kanbanBoard,
      event.over.id,
      event.over.data.current as DragData,
    )

    if (!sourceLocation || !targetLocation) {
      return
    }

    if (
      sourceLocation.columnId === targetLocation.columnId &&
      sourceLocation.position === targetLocation.position
    ) {
      return
    }

    setKanbanStatusMessage('')

    try {
      const updatedBoard = await moveTask(session.token, activeTaskId, {
        columnId: targetLocation.columnId,
        position: targetLocation.position,
      })

      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel mover a task',
      )
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
                <p className="eyebrow">{visibleKanbanBoard?.key}</p>
                <h2>{visibleKanbanBoard?.name}</h2>
                {visibleKanbanBoard?.description ? (
                  <p className="muted">{visibleKanbanBoard.description}</p>
                ) : null}
              </div>
              <div className="board-actions">
                <form className="task-create-form" onSubmit={handleCreateTask}>
                  <input
                    name="title"
                    type="text"
                    minLength={2}
                    placeholder="Adicionar nova tarefa"
                    aria-label="Adicionar nova tarefa"
                    disabled={!visibleKanbanBoard?.columns[0] || creatingTaskColumnId !== null}
                    required
                  />
                  <button
                    type="submit"
                    className="secondary-button"
                    disabled={!visibleKanbanBoard?.columns[0] || creatingTaskColumnId !== null}
                  >
                    {creatingTaskColumnId ? 'Criando...' : 'Adicionar nova tarefa'}
                  </button>
                </form>
                {canManageColumns ? (
                  <div className="column-management">
                    <form className="column-create-form" onSubmit={handleCreateColumn}>
                      <input
                        name="name"
                        type="text"
                        minLength={2}
                        placeholder="Nova coluna"
                        required
                      />
                      <button type="submit" className="secondary-button">
                        Adicionar coluna
                      </button>
                    </form>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsColumnOrganizerOpen(true)}
                    >
                      Reorganizar colunas
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              <section className="kanban-preview" aria-label="Quadro Kanban">
                {visibleKanbanBoard?.columns.map((column) => (
                  <KanbanColumnView
                    column={column}
                    canManageColumns={canManageColumns}
                    editingColumnId={editingColumnId}
                    key={column.id}
                    onOpenTask={handleOpenTask}
                    onRenameColumn={handleRenameColumn}
                  />
                ))}
              </section>
              <DragOverlay dropAnimation={taskDropAnimation}>
                {activeTask ? <TaskCardPreview task={activeTask} /> : null}
              </DragOverlay>
            </DndContext>
          </>
        ) : null}

        {isTaskDetailLoading ? (
          <TaskDetailDialog title="Carregando task" onClose={() => setIsTaskDetailLoading(false)} />
        ) : null}

        {selectedTaskDetail ? (
          <TaskDetailDialog
            taskDetail={selectedTaskDetail}
            title={`${selectedTaskDetail.friendlyId} - ${selectedTaskDetail.title}`}
            onClose={() => setSelectedTaskDetail(null)}
          />
        ) : null}

        {isColumnOrganizerOpen && kanbanBoard ? (
          <ColumnOrganizerDialog
            columns={kanbanBoard.columns}
            deletingColumnId={deletingColumnId}
            reorderingColumnId={reorderingColumnId}
            onClose={() => setIsColumnOrganizerOpen(false)}
            onDeleteColumn={handleDeleteColumn}
            onReorderColumn={handleReorderColumn}
          />
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
