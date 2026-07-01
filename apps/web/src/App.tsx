import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AuthSession,
  type KanbanBoard,
  type KanbanTaskAttachment,
  type KanbanTaskCard,
  getCurrentSession,
  login,
  moveTask,
  registerAccount,
} from './api.js'
import { AdminCompaniesPage } from './components/AdminCompaniesPage.js'
import { AuthPage } from './components/AuthPage.js'
import { BoardPage } from './components/BoardPage.js'
import { CompanyWorkspacePage } from './components/CompanyWorkspacePage.js'
import { ProfilePage } from './components/ProfilePage.js'
import { WorkspaceHeader } from './components/WorkspaceHeader.js'
import { useAppNavigation } from './hooks/useAppNavigation.js'
import { useBoardActions } from './hooks/useBoardActions.js'
import { useCompanyMembersManagement } from './hooks/useCompanyMembersManagement.js'
import { useTaskActivities } from './hooks/useTaskActivities.js'
import { useTaskAttachments } from './hooks/useTaskAttachments.js'
import { useTaskComments } from './hooks/useTaskComments.js'
import { useTaskWatchers } from './hooks/useTaskWatchers.js'
import { useWorkspaceData } from './hooks/useWorkspaceData.js'
import { useWorkspaceStructureActions } from './hooks/useWorkspaceStructureActions.js'
import {
  areTaskLocationsEqual,
  createTaskMovePreview,
  findDropLocation,
  findTaskLocation,
} from './kanban-helpers.js'
import { hasCompanyPermission } from './permissions.js'
import { createBoardPath, createFriendlyBoardPath, createFriendlyTaskPath } from './routing.js'
import { readStoredSession, sessionStorageKey } from './session-storage.js'
import type { DragData } from './types/kanban.js'

type AuthMode = 'login' | 'register'

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())
  const { currentRoute, navigateTo } = useAppNavigation()
  const [activeTask, setActiveTask] = useState<KanbanTaskCard | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const {
    createBoardFromForm,
    createDepartmentFromForm,
    deleteBoardById,
    deleteDepartmentById,
    deletingBoardId,
    deletingDepartmentId,
    editingBoardId,
    editingDepartmentId,
    renameDepartmentFromForm,
    updateBoardFromForm,
    updateCompanyFromForm,
    workspaceStructureMessage,
  } = useWorkspaceStructureActions({
    currentRoute,
    navigateTo,
    session,
    setCompanyWorkspace,
    setSession,
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
    closeColumnOrganizer,
    closeCreateTaskDialog,
    createColumnFromForm,
    createTaskFromForm,
    creatingTaskColumnId,
    deleteColumnByColumn,
    deletingColumnId,
    editingColumnId,
    isColumnOrganizerOpen,
    isCreateTaskDialogOpen,
    isTaskUpdating,
    openColumnOrganizer,
    openCreateTaskDialog,
    renameColumnFromForm,
    reorderColumnById,
    reorderingColumnId,
    updateTaskFromForm,
  } = useBoardActions({
    currentRoute,
    kanbanBoard,
    reloadActivities,
    selectedTaskDetail,
    session,
    setKanbanBoard,
    setKanbanStatusMessage,
    setSelectedTaskDetail,
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
  const { addWatcher, removeWatcher, updatingWatcherUserId, watchers, watchersStatusMessage } =
    useTaskWatchers({
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
  const canManageWorkspace = hasCompanyPermission(session?.company.permissions, 'ManageWorkspace')
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
        createFriendlyBoardPath(
          kanbanBoard.companySlug,
          kanbanBoard.departmentKey,
          kanbanBoard.key,
        ),
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
            onCreateBoard={createBoardFromForm}
            onCreateDepartment={createDepartmentFromForm}
            onCreateMember={createMember}
            onDeleteBoard={deleteBoardById}
            onDeleteDepartment={deleteDepartmentById}
            onNavigate={navigateTo}
            onRemoveMember={removeMember}
            onRenameDepartment={renameDepartmentFromForm}
            onUpdateMemberRole={updateMemberRole}
            onUpdateCompany={updateCompanyFromForm}
            onUpdateBoard={updateBoardFromForm}
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
            isTaskUpdating={isTaskUpdating}
            kanbanBoard={kanbanBoard}
            reorderingColumnId={reorderingColumnId}
            selectedTaskDetail={selectedTaskDetail}
            selectedTaskUrl={selectedTaskUrl}
            updatingAttachmentId={updatingAttachmentId}
            updatingWatcherUserId={updatingWatcherUserId}
            watchers={watchers}
            watchersStatusMessage={watchersStatusMessage}
            onAddWatcher={handleAddWatcher}
            onCloseColumnOrganizer={closeColumnOrganizer}
            onCloseCreateTaskDialog={closeCreateTaskDialog}
            onCloseTaskDetail={handleCloseTaskDetail}
            onCloseTaskLoading={() => setIsTaskDetailLoading(false)}
            onCreateComment={handleCreateComment}
            onCreateColumn={createColumnFromForm}
            onCreateTask={createTaskFromForm}
            onDeleteColumn={deleteColumnByColumn}
            onDownloadAttachment={handleDownloadAttachment}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onOpenColumnOrganizer={openColumnOrganizer}
            onOpenCreateTaskDialog={openCreateTaskDialog}
            onOpenTask={handleOpenTask}
            onRenameColumn={renameColumnFromForm}
            onRemoveAttachment={handleRemoveAttachment}
            onRemoveWatcher={handleRemoveWatcher}
            onReorderColumn={reorderColumnById}
            onUploadAttachment={handleUploadAttachment}
            onUpdateTask={updateTaskFromForm}
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
