import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AuthSession,
  type KanbanBoard,
  type KanbanColumn,
  type KanbanTaskAttachment,
  type KanbanTaskCard,
  type TaskPriority,
  createBoard,
  createColumn,
  createDepartment,
  createTask,
  deleteBoard,
  deleteColumn,
  deleteDepartment,
  getCurrentSession,
  login,
  moveTask,
  registerAccount,
  renameColumn,
  renameDepartment,
  reorderColumn,
  updateBoard,
  updateCompany,
  updateTask,
} from './api.js'
import { AdminCompaniesPage } from './components/AdminCompaniesPage.js'
import { AuthPage } from './components/AuthPage.js'
import { BoardPage } from './components/BoardPage.js'
import { CompanyWorkspacePage } from './components/CompanyWorkspacePage.js'
import { ProfilePage } from './components/ProfilePage.js'
import { WorkspaceHeader } from './components/WorkspaceHeader.js'
import { useAppNavigation } from './hooks/useAppNavigation.js'
import { useCompanyMembersManagement } from './hooks/useCompanyMembersManagement.js'
import { useTaskActivities } from './hooks/useTaskActivities.js'
import { useTaskAttachments } from './hooks/useTaskAttachments.js'
import { useTaskComments } from './hooks/useTaskComments.js'
import { useTaskWatchers } from './hooks/useTaskWatchers.js'
import { useWorkspaceData } from './hooks/useWorkspaceData.js'
import {
  areTaskLocationsEqual,
  createTaskMovePreview,
  findDropLocation,
  findTaskLocation,
} from './kanban-helpers.js'
import {
  createBoardPath,
  createCompanySlugPath,
  createFriendlyBoardPath,
  createFriendlyTaskPath,
} from './routing.js'
import { hasCompanyPermission } from './permissions.js'
import { readStoredSession, sessionStorageKey } from './session-storage.js'
import type { DragData } from './types/kanban.js'

type AuthMode = 'login' | 'register'

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())
  const { currentRoute, navigateTo } = useAppNavigation()
  const [activeTask, setActiveTask] = useState<KanbanTaskCard | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isColumnOrganizerOpen, setIsColumnOrganizerOpen] = useState(false)
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false)
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null)
  const [reorderingColumnId, setReorderingColumnId] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null)
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null)
  const [workspaceStructureMessage, setWorkspaceStructureMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const dragTargetLocationRef = useRef<ReturnType<typeof findTaskLocation>>(null)
  const {
    companyWorkspace,
    companyMembers,
    isAdminCompaniesLoading,
    isCompanyLoading,
    isKanbanLoading,
    isTaskDetailLoading,
    kanbanBoard,
    kanbanStatusMessage,
    platformCompanies,
    selectedTaskDetail,
    resetWorkspaceData,
    setCompanyMembers,
    setCompanyWorkspace,
    setIsTaskDetailLoading,
    setKanbanBoard,
    setKanbanStatusMessage,
    setSelectedTaskDetail,
  } = useWorkspaceData({
    currentRoute,
    navigateTo,
    session,
  })
  const {
    createMember,
    isCreatingMember,
    membersStatusMessage,
    removeMember,
    updateMemberRole,
    updatingMemberId,
  } = useCompanyMembersManagement({
    setCompanyMembers,
    token: session?.token ?? null,
  })
  const { addComment, comments, commentsStatusMessage, isCommentSubmitting } = useTaskComments({
    taskId: selectedTaskDetail?.id ?? null,
    token: session?.token ?? null,
  })
  const { activities, activitiesStatusMessage, reloadActivities } = useTaskActivities({
    taskId: selectedTaskDetail?.id ?? null,
    token: session?.token ?? null,
  })
  const {
    attachments,
    attachmentsStatusMessage,
    downloadAttachment,
    isAttachmentUploading,
    removeAttachment,
    updatingAttachmentId,
    uploadAttachment,
  } = useTaskAttachments({
    taskId: selectedTaskDetail?.id ?? null,
    token: session?.token ?? null,
  })
  const {
    addWatcher,
    removeWatcher,
    updatingWatcherUserId,
    watchers,
    watchersStatusMessage,
  } = useTaskWatchers({
    taskId: selectedTaskDetail?.id ?? null,
    token: session?.token ?? null,
  })

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
        resetWorkspaceData()
      })
  }, [session?.token, resetWorkspaceData])

  const authModeLabels = useMemo(
    () => ({
      login: 'Entrar',
      register: 'Criar conta',
    }),
    [],
  )
  const canManageColumns = hasCompanyPermission(session?.company.permissions, 'ManageColumns')
  const canManageWorkspace = hasCompanyPermission(
    session?.company.permissions,
    'ManageWorkspace',
  )
  const canDeleteBoard = hasCompanyPermission(session?.company.permissions, 'DeleteBoard')
  const shouldShowKanbanBoard =
    currentRoute.type === 'home' ||
    currentRoute.type === 'board' ||
    currentRoute.type === 'task' ||
    currentRoute.type === 'friendlyBoard' ||
    currentRoute.type === 'friendlyTask'
  const selectedTaskUrl =
    selectedTaskDetail && kanbanBoard
      ? createFriendlyTaskPath(
          selectedTaskDetail.companySlug,
          selectedTaskDetail.departmentKey,
          selectedTaskDetail.boardKey,
          selectedTaskDetail.friendlyId,
        )
      : null

  function getActiveCompanyId() {
    if (currentRoute.type === 'board' || currentRoute.type === 'task') {
      return currentRoute.companyId
    }

    return session?.company.id ?? null
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
    resetWorkspaceData()
    setStatusMessage('')
    navigateTo('/', {
      replace: true,
    })
  }

  async function handleCreateTask(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const formElement = formEvent.currentTarget
    const firstColumn = kanbanBoard?.columns[0]

    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !firstColumn || !companyId) {
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
      const updatedBoard = await createTask(
        session.token,
        companyId,
        kanbanBoard.id,
        {
          columnId: firstColumn.id,
          title,
          description: String(formData.get('description') ?? '').trim(),
          priority: String(formData.get('priority') ?? 'MEDIUM') as TaskPriority,
          assigneeId: String(formData.get('assigneeId') ?? '') || undefined,
        },
      )

      setKanbanBoard(updatedBoard)
      formElement.reset()
      setIsCreateTaskDialogOpen(false)
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

    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !companyId) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setKanbanStatusMessage('')

    try {
      const updatedBoard = await createColumn(session.token, companyId, kanbanBoard.id, {
        name,
        position: kanbanBoard.columns.length + 1,
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

    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !companyId) {
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
      const updatedBoard = await renameColumn(session.token, companyId, kanbanBoard.id, column.id, {
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
    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !companyId) {
      return
    }

    setDeletingColumnId(column.id)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await deleteColumn(session.token, companyId, kanbanBoard.id, column.id)
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
    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !companyId) {
      return
    }

    setReorderingColumnId(columnId)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await reorderColumn(
        session.token,
        companyId,
        kanbanBoard.id,
        columnId,
        {
          position,
        },
      )

      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel reorganizar as colunas',
      )
    } finally {
      setReorderingColumnId(null)
    }
  }

  async function handleCreateDepartment(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formElement = formEvent.currentTarget
    const formData = new FormData(formElement)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await createDepartment(session.token, {
        name,
      })

      setCompanyWorkspace(updatedWorkspace)
      formElement.reset()
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar o departamento',
      )
    }
  }

  async function handleUpdateCompany(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const slug = String(formData.get('slug') ?? '').trim()

    if (!name || !slug) {
      return
    }

    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await updateCompany(session.token, {
        name,
        slug,
      })
      const updatedSession = {
        ...session,
        company: {
          ...session.company,
          name: updatedWorkspace.name,
          slug: updatedWorkspace.slug,
        },
      }

      setCompanyWorkspace(updatedWorkspace)
      setSession(updatedSession)
      localStorage.setItem(sessionStorageKey, JSON.stringify(updatedSession))

      if (currentRoute.type === 'companySlug') {
        navigateTo(createCompanySlugPath(updatedWorkspace.slug), {
          replace: true,
        })
      }
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar a empresa',
      )
    }
  }

  async function handleRenameDepartment(
    formEvent: FormEvent<HTMLFormElement>,
    departmentId: string,
  ) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setEditingDepartmentId(departmentId)
    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await renameDepartment(session.token, departmentId, {
        name,
      })

      setCompanyWorkspace(updatedWorkspace)
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel renomear o departamento',
      )
    } finally {
      setEditingDepartmentId(null)
    }
  }

  async function handleDeleteDepartment(departmentId: string, departmentName: string) {
    if (!session?.token || !window.confirm(`Remover departamento "${departmentName}"?`)) {
      return
    }

    setDeletingDepartmentId(departmentId)
    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await deleteDepartment(session.token, departmentId)
      setCompanyWorkspace(updatedWorkspace)
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover o departamento',
      )
    } finally {
      setDeletingDepartmentId(null)
    }
  }

  async function handleCreateBoard(formEvent: FormEvent<HTMLFormElement>, departmentId: string) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formElement = formEvent.currentTarget
    const formData = new FormData(formElement)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await createBoard(session.token, departmentId, {
        name,
        description: String(formData.get('description') ?? '').trim(),
      })

      setCompanyWorkspace(updatedWorkspace)
      formElement.reset()
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar o quadro',
      )
    }
  }

  async function handleUpdateBoard(formEvent: FormEvent<HTMLFormElement>, boardId: string) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setEditingBoardId(boardId)
    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await updateBoard(session.token, boardId, {
        name,
        description: String(formData.get('description') ?? '').trim(),
      })

      setCompanyWorkspace(updatedWorkspace)
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar o quadro',
      )
    } finally {
      setEditingBoardId(null)
    }
  }

  async function handleDeleteBoard(boardId: string, boardName: string) {
    if (
      !session?.token ||
      !window.confirm(
        `Remover quadro "${boardName}"? So sera possivel se nao houver tasks abertas.`,
      )
    ) {
      return
    }

    setDeletingBoardId(boardId)
    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await deleteBoard(session.token, boardId)
      setCompanyWorkspace(updatedWorkspace)

      if (
        currentRoute.type === 'board' &&
        currentRoute.boardId === boardId &&
        updatedWorkspace.departments[0]?.boards[0]
      ) {
        navigateTo(createBoardPath(updatedWorkspace.id, updatedWorkspace.departments[0].boards[0].id))
      }
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover o quadro',
      )
    } finally {
      setDeletingBoardId(null)
    }
  }

  async function handleUpdateTask(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!session?.token || !selectedTaskDetail) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const title = String(formData.get('title') ?? '').trim()

    if (!title) {
      return
    }

    setUpdatingTaskId(selectedTaskDetail.id)
    setKanbanStatusMessage('')

    try {
      const updatedTask = await updateTask(session.token, selectedTaskDetail.id, {
        title,
        description: String(formData.get('description') ?? '').trim(),
        priority: String(formData.get('priority') ?? 'MEDIUM') as TaskPriority,
        assigneeId: String(formData.get('assigneeId') ?? '') || null,
      })

      setKanbanBoard(updatedTask.board)
      setSelectedTaskDetail(updatedTask.task)
      await reloadActivities()
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar a task',
      )
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function handleCreateComment(content: string) {
    await addComment(content)
    await reloadActivities()
  }

  async function handleUploadAttachment(file: File) {
    await uploadAttachment(file)
    await reloadActivities()
  }

  async function handleDownloadAttachment(attachment: KanbanTaskAttachment) {
    await downloadAttachment(attachment)
  }

  async function handleRemoveAttachment(attachmentId: string) {
    await removeAttachment(attachmentId)
    await reloadActivities()
  }

  async function handleAddWatcher(userId: string) {
    await addWatcher(userId)
    await reloadActivities()
  }

  async function handleRemoveWatcher(userId: string) {
    await removeWatcher(userId)
    await reloadActivities()
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

    const task = kanbanBoard.columns
      .flatMap((column) => column.tasks)
      .find((kanbanTask) => kanbanTask.id === taskId)

    navigateTo(
      task
        ? createFriendlyTaskPath(
            kanbanBoard.companySlug,
            kanbanBoard.departmentKey,
            kanbanBoard.key,
            task.friendlyId,
          )
        : createBoardPath(companyId, kanbanBoard.id),
    )
  }

  function handleCloseTaskDetail() {
    if (currentRoute.type === 'task') {
      navigateTo(createBoardPath(currentRoute.companyId, currentRoute.boardId))
      return
    }

    if (currentRoute.type === 'friendlyTask' && kanbanBoard) {
      navigateTo(
        createFriendlyBoardPath(kanbanBoard.companySlug, kanbanBoard.departmentKey, kanbanBoard.key),
      )
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
      setKanbanBoard(createTaskMovePreview(kanbanBoard, activeTaskId, targetLocation))

      const updatedBoard = await moveTask(session.token, activeTaskId, {
        columnId: targetLocation.columnId,
        position: targetLocation.position,
      })

      setKanbanBoard(updatedBoard)
      if (selectedTaskDetail?.id === activeTaskId) {
        await reloadActivities()
      }
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

        {currentRoute.type === 'company' || currentRoute.type === 'companySlug' ? (
          <CompanyWorkspacePage
            canManageWorkspace={canManageWorkspace}
            canDeleteBoard={canDeleteBoard}
            companyMembers={companyMembers}
            companyWorkspace={companyWorkspace}
            currentUserId={session.user.id}
            deletingBoardId={deletingBoardId}
            deletingDepartmentId={deletingDepartmentId}
            editingBoardId={editingBoardId}
            editingDepartmentId={editingDepartmentId}
            isCreatingMember={isCreatingMember}
            isLoading={isCompanyLoading}
            membersStatusMessage={membersStatusMessage}
            updatingMemberId={updatingMemberId}
            workspaceStructureMessage={workspaceStructureMessage}
            onCreateBoard={handleCreateBoard}
            onCreateDepartment={handleCreateDepartment}
            onCreateMember={createMember}
            onDeleteBoard={handleDeleteBoard}
            onDeleteDepartment={handleDeleteDepartment}
            onNavigate={navigateTo}
            onRemoveMember={removeMember}
            onRenameDepartment={handleRenameDepartment}
            onUpdateMemberRole={updateMemberRole}
            onUpdateCompany={handleUpdateCompany}
            onUpdateBoard={handleUpdateBoard}
          />
        ) : null}

        {currentRoute.type === 'profile' ? <ProfilePage session={session} /> : null}

        {shouldShowKanbanBoard && kanbanBoard ? (
          <BoardPage
            activeTask={activeTask}
            activities={activities}
            activitiesStatusMessage={activitiesStatusMessage}
            attachments={attachments}
            attachmentsStatusMessage={attachmentsStatusMessage}
            canManageColumns={canManageColumns}
            comments={comments}
            commentsStatusMessage={commentsStatusMessage}
            companyMembers={companyMembers}
            creatingTaskColumnId={creatingTaskColumnId}
            currentUserId={session.user.id}
            deletingColumnId={deletingColumnId}
            editingColumnId={editingColumnId}
            isColumnOrganizerOpen={isColumnOrganizerOpen}
            isAttachmentUploading={isAttachmentUploading}
            isCommentSubmitting={isCommentSubmitting}
            isCreateTaskDialogOpen={isCreateTaskDialogOpen}
            isTaskDetailLoading={isTaskDetailLoading}
            isTaskUpdating={updatingTaskId === selectedTaskDetail?.id}
            kanbanBoard={kanbanBoard}
            reorderingColumnId={reorderingColumnId}
            selectedTaskDetail={selectedTaskDetail}
            selectedTaskUrl={selectedTaskUrl}
            updatingAttachmentId={updatingAttachmentId}
            updatingWatcherUserId={updatingWatcherUserId}
            watchers={watchers}
            watchersStatusMessage={watchersStatusMessage}
            onAddWatcher={handleAddWatcher}
            onCloseColumnOrganizer={() => setIsColumnOrganizerOpen(false)}
            onCloseCreateTaskDialog={() => setIsCreateTaskDialogOpen(false)}
            onCloseTaskDetail={handleCloseTaskDetail}
            onCloseTaskLoading={() => setIsTaskDetailLoading(false)}
            onCreateComment={handleCreateComment}
            onCreateColumn={handleCreateColumn}
            onCreateTask={handleCreateTask}
            onDeleteColumn={handleDeleteColumn}
            onDownloadAttachment={handleDownloadAttachment}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onOpenColumnOrganizer={() => setIsColumnOrganizerOpen(true)}
            onOpenCreateTaskDialog={() => setIsCreateTaskDialogOpen(true)}
            onOpenTask={handleOpenTask}
            onRenameColumn={handleRenameColumn}
            onRemoveAttachment={handleRemoveAttachment}
            onRemoveWatcher={handleRemoveWatcher}
            onReorderColumn={handleReorderColumn}
            onUploadAttachment={handleUploadAttachment}
            onUpdateTask={handleUpdateTask}
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
