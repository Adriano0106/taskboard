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
  type CompanyWorkspace,
  type KanbanBoard,
  type KanbanColumn,
  type KanbanTaskCard,
  type KanbanTaskDetail,
  type PlatformCompanySummary,
  createColumn,
  createTask,
  deleteColumn,
  getCompanyKanbanBoard,
  getCompanyWorkspace,
  getCurrentCompanyWorkspace,
  getCurrentKanbanBoard,
  getCurrentSession,
  getPlatformCompanies,
  getTaskDetail,
  login,
  moveTask,
  registerAccount,
  renameColumn,
  reorderColumn,
} from './api.js'
import { AdminCompaniesPage } from './components/AdminCompaniesPage.js'
import { ColumnOrganizerDialog } from './components/ColumnOrganizerDialog.js'
import { CompanyWorkspacePage } from './components/CompanyWorkspacePage.js'
import { KanbanColumnView, TaskCardPreview } from './components/KanbanColumnView.js'
import { TaskDetailDialog } from './components/TaskDetailDialog.js'
import {
  areTaskLocationsEqual,
  createTaskMovePreview,
  findDropLocation,
  findTaskLocation,
} from './kanban-helpers.js'
import { createBoardPath, createCompanyPath, createTaskPath, parseAppRoute } from './routing.js'
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
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname)
  const [companyWorkspace, setCompanyWorkspace] = useState<CompanyWorkspace | null>(null)
  const [platformCompanies, setPlatformCompanies] = useState<PlatformCompanySummary[]>([])
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard | null>(null)
  const [kanbanBoardPreview, setKanbanBoardPreview] = useState<KanbanBoard | null>(null)
  const [activeTask, setActiveTask] = useState<KanbanTaskCard | null>(null)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<KanbanTaskDetail | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isKanbanLoading, setIsKanbanLoading] = useState(false)
  const [isCompanyLoading, setIsCompanyLoading] = useState(false)
  const [isAdminCompaniesLoading, setIsAdminCompaniesLoading] = useState(false)
  const [isTaskDetailLoading, setIsTaskDetailLoading] = useState(false)
  const [isColumnOrganizerOpen, setIsColumnOrganizerOpen] = useState(false)
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null)
  const [reorderingColumnId, setReorderingColumnId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [kanbanStatusMessage, setKanbanStatusMessage] = useState('')
  const currentRoute = useMemo(() => parseAppRoute(currentPath), [currentPath])
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

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

    const routeCompanyId =
      currentRoute.type === 'company' ||
      currentRoute.type === 'board' ||
      currentRoute.type === 'task'
        ? currentRoute.companyId
        : session.company.id
    let shouldIgnoreResult = false

    setIsCompanyLoading(true)
    setKanbanStatusMessage('')

    const workspaceRequest =
      currentRoute.type === 'home'
        ? getCurrentCompanyWorkspace(session.token)
        : getCompanyWorkspace(session.token, routeCompanyId)

    workspaceRequest
      .then((workspace) => {
        if (!shouldIgnoreResult) {
          setCompanyWorkspace(workspace)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setKanbanStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar a empresa',
          )
        }
      })
      .finally(() => {
        if (!shouldIgnoreResult) {
          setIsCompanyLoading(false)
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token, session?.company.id, currentRoute])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    if (currentRoute.type !== 'adminCompanies') {
      setPlatformCompanies([])
      return
    }

    let shouldIgnoreResult = false

    setIsAdminCompaniesLoading(true)
    setKanbanStatusMessage('')

    getPlatformCompanies(session.token)
      .then((companies) => {
        if (!shouldIgnoreResult) {
          setPlatformCompanies(companies)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setKanbanStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar as empresas',
          )
        }
      })
      .finally(() => {
        if (!shouldIgnoreResult) {
          setIsAdminCompaniesLoading(false)
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token, currentRoute])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    if (currentRoute.type === 'adminCompanies' || currentRoute.type === 'company') {
      setKanbanBoard(null)
      return
    }

    let shouldIgnoreResult = false

    setIsKanbanLoading(true)
    setKanbanStatusMessage('')

    const boardRequest =
      currentRoute.type === 'board' || currentRoute.type === 'task'
        ? getCompanyKanbanBoard(session.token, currentRoute.companyId, currentRoute.boardId)
        : getCurrentKanbanBoard(session.token)

    boardRequest
      .then((board) => {
        if (shouldIgnoreResult) {
          return
        }

        setKanbanBoard(board)

        if (currentRoute.type === 'home') {
          navigateTo(createBoardPath(session.company.id, board.id), {
            replace: true,
          })
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setKanbanStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar o quadro',
          )
        }
      })
      .finally(() => {
        if (!shouldIgnoreResult) {
          setIsKanbanLoading(false)
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token, session?.company.id, currentRoute])

  useEffect(() => {
    if (!session?.token || currentRoute.type !== 'task') {
      setSelectedTaskDetail(null)
      setIsTaskDetailLoading(false)
      return
    }

    let shouldIgnoreResult = false

    setSelectedTaskDetail(null)
    setIsTaskDetailLoading(true)
    setKanbanStatusMessage('')

    getTaskDetail(session.token, currentRoute.taskId)
      .then((taskDetail) => {
        if (!shouldIgnoreResult) {
          setSelectedTaskDetail(taskDetail)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setKanbanStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar a task',
          )
        }
      })
      .finally(() => {
        if (!shouldIgnoreResult) {
          setIsTaskDetailLoading(false)
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token, currentRoute])

  const authModeLabels = useMemo(
    () => ({
      login: 'Entrar',
      register: 'Criar conta',
    }),
    [],
  )
  const canManageColumns = session ? ['OWNER', 'ADMIN'].includes(session.company.role) : false
  const visibleKanbanBoard = kanbanBoardPreview ?? kanbanBoard
  const shouldShowKanbanBoard =
    currentRoute.type === 'home' || currentRoute.type === 'board' || currentRoute.type === 'task'

  function navigateTo(path: string, options: { replace?: boolean } = {}) {
    if (window.location.pathname === path) {
      return
    }

    if (options.replace) {
      window.history.replaceState(null, '', path)
    } else {
      window.history.pushState(null, '', path)
    }

    setCurrentPath(path)
  }

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
    setCompanyWorkspace(null)
    setPlatformCompanies([])
    setKanbanBoard(null)
    setKanbanBoardPreview(null)
    setSelectedTaskDetail(null)
    setStatusMessage('')
    setKanbanStatusMessage('')
    navigateTo('/', {
      replace: true,
    })
  }

  async function handleCreateTask(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const formElement = formEvent.currentTarget
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
      formElement.reset()
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

    const formElement = formEvent.currentTarget

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
      formElement.reset()
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

  function handleOpenTask(taskId: string) {
    if (!kanbanBoard || currentRoute.type === 'adminCompanies') {
      return
    }

    const companyId =
      currentRoute.type === 'board' || currentRoute.type === 'task'
        ? currentRoute.companyId
        : session?.company.id

    if (!companyId) {
      return
    }

    navigateTo(createTaskPath(companyId, kanbanBoard.id, taskId))
  }

  function handleCloseTaskDetail() {
    if (currentRoute.type === 'task') {
      navigateTo(createBoardPath(currentRoute.companyId, currentRoute.boardId))
      return
    }

    setSelectedTaskDetail(null)
    setIsTaskDetailLoading(false)
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

    const currentPreviewLocation = findTaskLocation(previewSourceBoard, activeTask.id)

    if (areTaskLocationsEqual(currentPreviewLocation, targetLocation)) {
      return
    }

    setKanbanBoardPreview(createTaskMovePreview(kanbanBoard, activeTask.id, targetLocation))
  }

  function handleDragCancel() {
    setActiveTask(null)
    setKanbanBoardPreview(null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const finalPreviewBoard = kanbanBoardPreview

    setActiveTask(null)
    setKanbanBoardPreview(null)

    if (!session?.token || !kanbanBoard || !event.over) {
      return
    }

    const activeTaskId = String(event.active.id)
    const sourceLocation = findTaskLocation(kanbanBoard, activeTaskId)
    const targetLocation =
      (finalPreviewBoard ? findTaskLocation(finalPreviewBoard, activeTaskId) : null) ??
      findDropLocation(kanbanBoard, event.over.id, event.over.data.current as DragData)

    if (!sourceLocation || !targetLocation) {
      return
    }

    if (areTaskLocationsEqual(sourceLocation, targetLocation)) {
      return
    }

    setKanbanStatusMessage('')

    try {
      if (finalPreviewBoard) {
        setKanbanBoard(finalPreviewBoard)
      }

      const updatedBoard = await moveTask(session.token, activeTaskId, {
        columnId: targetLocation.columnId,
        position: targetLocation.position,
      })

      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanBoard(kanbanBoard)
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
            <h1>{companyWorkspace?.name ?? session.company.name}</h1>
            <p className="muted">
              Sessao ativa para {session.user.name} com perfil {session.company.role}.
            </p>
          </div>
          <div className="workspace-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigateTo(createCompanyPath(session.company.id))}
            >
              Empresa
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigateTo('/admin/companies')}
            >
              Admin geral
            </button>
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </section>

        {isKanbanLoading ? <p className="surface-message">Carregando quadro...</p> : null}

        {kanbanStatusMessage ? (
          <p className="surface-message error-message">{kanbanStatusMessage}</p>
        ) : null}

        {currentRoute.type === 'adminCompanies' ? (
          <AdminCompaniesPage
            companies={platformCompanies}
            isLoading={isAdminCompaniesLoading}
            onNavigate={navigateTo}
          />
        ) : null}

        {currentRoute.type === 'company' ? (
          <CompanyWorkspacePage
            companyWorkspace={companyWorkspace}
            isLoading={isCompanyLoading}
            onNavigate={navigateTo}
          />
        ) : null}

        {shouldShowKanbanBoard && kanbanBoard ? (
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
            onClose={handleCloseTaskDetail}
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
