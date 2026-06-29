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
import { type FormEvent, type PointerEvent, useRef, useState } from 'react'
import type {
  CompanyMember,
  KanbanBoard,
  KanbanColumn,
  KanbanTaskActivity,
  KanbanTaskAttachment,
  KanbanTaskCard,
  KanbanTaskComment,
  KanbanTaskDetail,
  KanbanTaskWatcher,
} from '../api.js'
import { ColumnOrganizerDialog } from './ColumnOrganizerDialog.js'
import { CreateTaskDialog } from './CreateTaskDialog.js'
import { KanbanColumnView, TaskCardPreview } from './KanbanColumnView.js'
import { TaskDetailDialog } from './TaskDetailDialog.js'

const taskDropAnimation = {
  duration: 260,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
}

const kanbanPanIgnoredSelector = [
  '.task-card',
  'button',
  'input',
  'select',
  'textarea',
  'a',
  '[role="button"]',
].join(',')

interface BoardPageProps {
  activeTask: KanbanTaskCard | null
  activities: KanbanTaskActivity[]
  activitiesStatusMessage: string
  canManageColumns: boolean
  attachments: KanbanTaskAttachment[]
  attachmentsStatusMessage: string
  comments: KanbanTaskComment[]
  commentsStatusMessage: string
  companyMembers: CompanyMember[]
  creatingTaskColumnId: string | null
  currentUserId: string
  deletingColumnId: string | null
  editingColumnId: string | null
  isColumnOrganizerOpen: boolean
  isAttachmentUploading: boolean
  isCreateTaskDialogOpen: boolean
  isCommentSubmitting: boolean
  isTaskDetailLoading: boolean
  isTaskUpdating: boolean
  kanbanBoard: KanbanBoard
  reorderingColumnId: string | null
  selectedTaskDetail: KanbanTaskDetail | null
  updatingAttachmentId: string | null
  updatingWatcherUserId: string | null
  watchers: KanbanTaskWatcher[]
  watchersStatusMessage: string
  onAddWatcher: (userId: string) => void
  onDownloadAttachment: (attachment: KanbanTaskAttachment) => void
  onCloseColumnOrganizer: () => void
  onCloseCreateTaskDialog: () => void
  onCloseTaskDetail: () => void
  onCloseTaskLoading: () => void
  onCreateComment: (content: string) => void
  onCreateColumn: (formEvent: FormEvent<HTMLFormElement>) => void
  onCreateTask: (formEvent: FormEvent<HTMLFormElement>) => void
  onDeleteColumn: (column: KanbanColumn) => void
  onDragCancel: () => void
  onDragEnd: (event: DragEndEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragStart: (event: DragStartEvent) => void
  onOpenColumnOrganizer: () => void
  onOpenCreateTaskDialog: () => void
  onOpenTask: (taskId: string) => void
  onRenameColumn: (formEvent: FormEvent<HTMLFormElement>, column: KanbanColumn) => void
  onRemoveWatcher: (userId: string) => void
  onRemoveAttachment: (attachmentId: string) => void
  onReorderColumn: (columnId: string, position: number) => void
  onUploadAttachment: (file: File) => void
  onUpdateTask: (formEvent: FormEvent<HTMLFormElement>) => void
}

export function BoardPage({
  activeTask,
  activities,
  activitiesStatusMessage,
  attachments,
  attachmentsStatusMessage,
  canManageColumns,
  comments,
  commentsStatusMessage,
  companyMembers,
  creatingTaskColumnId,
  currentUserId,
  deletingColumnId,
  editingColumnId,
  isColumnOrganizerOpen,
  isAttachmentUploading,
  isCreateTaskDialogOpen,
  isCommentSubmitting,
  isTaskDetailLoading,
  isTaskUpdating,
  kanbanBoard,
  reorderingColumnId,
  selectedTaskDetail,
  updatingAttachmentId,
  updatingWatcherUserId,
  watchers,
  watchersStatusMessage,
  onAddWatcher,
  onDownloadAttachment,
  onCloseColumnOrganizer,
  onCloseCreateTaskDialog,
  onCloseTaskDetail,
  onCloseTaskLoading,
  onCreateComment,
  onCreateColumn,
  onCreateTask,
  onDeleteColumn,
  onDragCancel,
  onDragEnd,
  onDragOver,
  onDragStart,
  onOpenColumnOrganizer,
  onOpenCreateTaskDialog,
  onOpenTask,
  onRenameColumn,
  onRemoveWatcher,
  onRemoveAttachment,
  onReorderColumn,
  onUploadAttachment,
  onUpdateTask,
}: BoardPageProps) {
  const kanbanPanStateRef = useRef({
    pointerId: -1,
    scrollLeft: 0,
    x: 0,
  })
  const [isKanbanPanning, setIsKanbanPanning] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  function handleKanbanPanStart(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || shouldIgnoreKanbanPan(event.target)) {
      return
    }

    const kanbanPreview = event.currentTarget

    kanbanPanStateRef.current = {
      pointerId: event.pointerId,
      scrollLeft: kanbanPreview.scrollLeft,
      x: event.clientX,
    }
    kanbanPreview.setPointerCapture(event.pointerId)
    setIsKanbanPanning(true)
  }

  function handleKanbanPanMove(event: PointerEvent<HTMLElement>) {
    const panState = kanbanPanStateRef.current

    if (!isKanbanPanning || event.pointerId !== panState.pointerId) {
      return
    }

    event.preventDefault()
    event.currentTarget.scrollLeft = panState.scrollLeft - (event.clientX - panState.x)
  }

  function handleKanbanPanEnd(event: PointerEvent<HTMLElement>) {
    const panState = kanbanPanStateRef.current

    if (event.pointerId !== panState.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    kanbanPanStateRef.current = {
      pointerId: -1,
      scrollLeft: 0,
      x: 0,
    }
    setIsKanbanPanning(false)
  }

  return (
    <>
      <section className="board-header">
        <div>
          <p className="eyebrow">{kanbanBoard.key}</p>
          <h2>{kanbanBoard.name}</h2>
          {kanbanBoard.description ? <p className="muted">{kanbanBoard.description}</p> : null}
        </div>
        <div className="board-actions">
          <button
            type="button"
            className="primary-button"
            disabled={!kanbanBoard.columns[0] || creatingTaskColumnId !== null}
            onClick={onOpenCreateTaskDialog}
          >
            Adicionar nova tarefa
          </button>
          {canManageColumns ? (
            <div className="column-management">
              <form className="column-create-form" onSubmit={onCreateColumn}>
                <input name="name" type="text" minLength={2} placeholder="Nova coluna" required />
                <button type="submit" className="secondary-button">
                  Adicionar coluna
                </button>
              </form>
              <button type="button" className="secondary-button" onClick={onOpenColumnOrganizer}>
                Reorganizar colunas
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
      >
        <section
          className={isKanbanPanning ? 'kanban-preview is-panning' : 'kanban-preview'}
          aria-label="Quadro Kanban"
          onPointerCancel={handleKanbanPanEnd}
          onPointerDown={handleKanbanPanStart}
          onPointerMove={handleKanbanPanMove}
          onPointerUp={handleKanbanPanEnd}
        >
          {kanbanBoard.columns.map((column) => (
            <KanbanColumnView
              column={column}
              canManageColumns={canManageColumns}
              editingColumnId={editingColumnId}
              key={column.id}
              onOpenTask={onOpenTask}
              onRenameColumn={onRenameColumn}
            />
          ))}
        </section>
        <DragOverlay dropAnimation={taskDropAnimation}>
          {activeTask ? <TaskCardPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {isTaskDetailLoading ? (
        <TaskDetailDialog title="Carregando task" onClose={onCloseTaskLoading} />
      ) : null}

      {isCreateTaskDialogOpen ? (
        <CreateTaskDialog
          companyMembers={companyMembers}
          currentUserId={currentUserId}
          isSubmitting={creatingTaskColumnId !== null}
          onClose={onCloseCreateTaskDialog}
          onSubmit={onCreateTask}
        />
      ) : null}

      {selectedTaskDetail ? (
        <TaskDetailDialog
          activities={activities}
          activitiesStatusMessage={activitiesStatusMessage}
          attachments={attachments}
          attachmentsStatusMessage={attachmentsStatusMessage}
          companyMembers={companyMembers}
          comments={comments}
          commentsStatusMessage={commentsStatusMessage}
          isCommentSubmitting={isCommentSubmitting}
          isAttachmentUploading={isAttachmentUploading}
          isTaskUpdating={isTaskUpdating}
          taskDetail={selectedTaskDetail}
          title={`${selectedTaskDetail.friendlyId} - ${selectedTaskDetail.title}`}
          updatingAttachmentId={updatingAttachmentId}
          updatingWatcherUserId={updatingWatcherUserId}
          watchers={watchers}
          watchersStatusMessage={watchersStatusMessage}
          onAddWatcher={onAddWatcher}
          onClose={onCloseTaskDetail}
          onCreateComment={onCreateComment}
          onDownloadAttachment={onDownloadAttachment}
          onRemoveAttachment={onRemoveAttachment}
          onRemoveWatcher={onRemoveWatcher}
          onUploadAttachment={onUploadAttachment}
          onUpdateTask={onUpdateTask}
        />
      ) : null}

      {isColumnOrganizerOpen ? (
        <ColumnOrganizerDialog
          columns={kanbanBoard.columns}
          deletingColumnId={deletingColumnId}
          reorderingColumnId={reorderingColumnId}
          onClose={onCloseColumnOrganizer}
          onDeleteColumn={onDeleteColumn}
          onReorderColumn={onReorderColumn}
        />
      ) : null}
    </>
  )
}

function shouldIgnoreKanbanPan(target: EventTarget) {
  return target instanceof Element && Boolean(target.closest(kanbanPanIgnoredSelector))
}
