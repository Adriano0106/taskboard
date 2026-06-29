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
import type { FormEvent } from 'react'
import type {
  CompanyMember,
  KanbanBoard,
  KanbanColumn,
  KanbanTaskCard,
  KanbanTaskComment,
  KanbanTaskDetail,
} from '../api.js'
import { ColumnOrganizerDialog } from './ColumnOrganizerDialog.js'
import { CreateTaskDialog } from './CreateTaskDialog.js'
import { KanbanColumnView, TaskCardPreview } from './KanbanColumnView.js'
import { TaskDetailDialog } from './TaskDetailDialog.js'

const taskDropAnimation = {
  duration: 260,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
}

interface BoardPageProps {
  activeTask: KanbanTaskCard | null
  canManageColumns: boolean
  comments: KanbanTaskComment[]
  commentsStatusMessage: string
  companyMembers: CompanyMember[]
  creatingTaskColumnId: string | null
  currentUserId: string
  deletingColumnId: string | null
  editingColumnId: string | null
  isColumnOrganizerOpen: boolean
  isCreateTaskDialogOpen: boolean
  isCommentSubmitting: boolean
  isTaskDetailLoading: boolean
  kanbanBoard: KanbanBoard
  reorderingColumnId: string | null
  selectedTaskDetail: KanbanTaskDetail | null
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
  onReorderColumn: (columnId: string, position: number) => void
}

export function BoardPage({
  activeTask,
  canManageColumns,
  comments,
  commentsStatusMessage,
  companyMembers,
  creatingTaskColumnId,
  currentUserId,
  deletingColumnId,
  editingColumnId,
  isColumnOrganizerOpen,
  isCreateTaskDialogOpen,
  isCommentSubmitting,
  isTaskDetailLoading,
  kanbanBoard,
  reorderingColumnId,
  selectedTaskDetail,
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
  onReorderColumn,
}: BoardPageProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

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
        <section className="kanban-preview" aria-label="Quadro Kanban">
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
          comments={comments}
          commentsStatusMessage={commentsStatusMessage}
          isCommentSubmitting={isCommentSubmitting}
          taskDetail={selectedTaskDetail}
          title={`${selectedTaskDetail.friendlyId} - ${selectedTaskDetail.title}`}
          onClose={onCloseTaskDetail}
          onCreateComment={onCreateComment}
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
