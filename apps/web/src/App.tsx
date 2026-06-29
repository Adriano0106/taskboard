import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
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
import { AuthPage } from './components/AuthPage.js'
import { BoardPage } from './components/BoardPage.js'
import { CompanyWorkspacePage } from './components/CompanyWorkspacePage.js'
import { WorkspaceHeader } from './components/WorkspaceHeader.js'
import { useAppNavigation } from './hooks/useAppNavigation.js'
import { areTaskLocationsEqual, findDropLocation, findTaskLocation } from './kanban-helpers.js'
import { createBoardPath, createTaskPath } from './routing.js'
import { readStoredSession, sessionStorageKey } from './session-storage.js'
import type { DragData } from './types/kanban.js'

type AuthMode = 'login' | 'register'

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())
  const { currentRoute, navigateTo } = useAppNavigation()
  const [companyWorkspace, setCompanyWorkspace] = useState<CompanyWorkspace | null>(null)
  const [platformCompanies, setPlatformCompanies] = useState<PlatformCompanySummary[]>([])
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard | null>(null)
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
  const dragTargetLocationRef = useRef<ReturnType<typeof findTaskLocation>>(null)

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
  }, [session?.token, session?.company.id, currentRoute, navigateTo])

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
  const shouldShowKanbanBoard =
    currentRoute.type === 'home' || currentRoute.type === 'board' || currentRoute.type === 'task'

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

    if (dragData?.type === 'task' && kanbanBoard) {
      setActiveTask(dragData.task)
      dragTargetLocationRef.current = findTaskLocation(kanbanBoard, dragData.task.id)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (!kanbanBoard || !activeTask) {
      return
    }

    if (!event.over) {
      dragTargetLocationRef.current = null
      return
    }

    const targetLocation = findDropLocation(
      kanbanBoard,
      event.over.id,
      event.over.data.current as DragData,
    )

    if (!targetLocation) {
      return
    }

    if (areTaskLocationsEqual(dragTargetLocationRef.current, targetLocation)) {
      return
    }

    dragTargetLocationRef.current = targetLocation
  }

  function handleDragCancel() {
    setActiveTask(null)
    dragTargetLocationRef.current = null
  }

  async function handleDragEnd(event: DragEndEvent) {
    const finalTargetLocation = dragTargetLocationRef.current

    setActiveTask(null)
    dragTargetLocationRef.current = null

    if (!session?.token || !kanbanBoard || !event.over) {
      return
    }

    const activeTaskId = String(event.active.id)
    const sourceLocation = findTaskLocation(kanbanBoard, activeTaskId)
    const targetLocation =
      finalTargetLocation ??
      findDropLocation(kanbanBoard, event.over.id, event.over.data.current as DragData)

    if (!sourceLocation || !targetLocation) {
      return
    }

    if (areTaskLocationsEqual(sourceLocation, targetLocation)) {
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
      setKanbanBoard(kanbanBoard)
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel mover a task',
      )
    }
  }

  if (session) {
    return (
      <main className="app-shell">
        <WorkspaceHeader
          companyWorkspace={companyWorkspace}
          session={session}
          onLogout={handleLogout}
          onNavigate={navigateTo}
        />

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
          <BoardPage
            activeTask={activeTask}
            canManageColumns={canManageColumns}
            creatingTaskColumnId={creatingTaskColumnId}
            deletingColumnId={deletingColumnId}
            editingColumnId={editingColumnId}
            isColumnOrganizerOpen={isColumnOrganizerOpen}
            isTaskDetailLoading={isTaskDetailLoading}
            kanbanBoard={kanbanBoard}
            reorderingColumnId={reorderingColumnId}
            selectedTaskDetail={selectedTaskDetail}
            onCloseColumnOrganizer={() => setIsColumnOrganizerOpen(false)}
            onCloseTaskDetail={handleCloseTaskDetail}
            onCloseTaskLoading={() => setIsTaskDetailLoading(false)}
            onCreateColumn={handleCreateColumn}
            onCreateTask={handleCreateTask}
            onDeleteColumn={handleDeleteColumn}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onOpenColumnOrganizer={() => setIsColumnOrganizerOpen(true)}
            onOpenTask={handleOpenTask}
            onRenameColumn={handleRenameColumn}
            onReorderColumn={handleReorderColumn}
          />
        ) : null}
      </main>
    )
  }

  return (
    <AuthPage
      authMode={authMode}
      authModeLabels={authModeLabels}
      isSubmitting={isSubmitting}
      statusMessage={statusMessage}
      onAuthModeChange={setAuthMode}
      onSubmit={handleSubmit}
    />
  )
}
