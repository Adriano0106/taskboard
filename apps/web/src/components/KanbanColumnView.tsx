import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { FormEvent } from 'react'
import type { KanbanColumn, KanbanTaskCard } from '../api.js'
import type { ColumnDragData } from '../types/kanban.js'

interface KanbanColumnViewProps {
  column: KanbanColumn
  canManageColumns: boolean
  deletingColumnId: string | null
  editingColumnId: string | null
  onDeleteColumn: (column: KanbanColumn) => void
  onOpenTask: (taskId: string) => void
  onRenameColumn: (formEvent: FormEvent<HTMLFormElement>, column: KanbanColumn) => void
}

export function KanbanColumnView({
  column,
  canManageColumns,
  deletingColumnId,
  editingColumnId,
  onDeleteColumn,
  onOpenTask,
  onRenameColumn,
}: KanbanColumnViewProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    } satisfies ColumnDragData,
  })

  return (
    <div className={isOver ? 'column is-over' : 'column'} ref={setNodeRef}>
      {canManageColumns ? (
        <>
          <form className="column-title-form" onSubmit={(event) => onRenameColumn(event, column)}>
            <input
              aria-label={`Nome da coluna ${column.name}`}
              defaultValue={column.name}
              disabled={editingColumnId === column.id}
              name="name"
              type="text"
              minLength={2}
              required
            />
            <button type="submit" className="icon-button" title="Renomear coluna">
              Renomear
            </button>
          </form>
          <button
            type="button"
            className="column-delete-button"
            disabled={column.tasks.length > 0 || deletingColumnId === column.id}
            onClick={() => onDeleteColumn(column)}
          >
            Remover coluna vazia
          </button>
        </>
      ) : (
        <div className="column-title-readonly">
          <h2>{column.name}</h2>
          <span>Estrutura gerenciada por admins</span>
        </div>
      )}
      <SortableContext
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="task-list">
          {column.tasks.length > 0
            ? column.tasks.map((task) => (
                <SortableTaskCard
                  columnId={column.id}
                  key={task.id}
                  task={task}
                  onOpenTask={onOpenTask}
                />
              ))
            : null}
        </div>
      </SortableContext>
    </div>
  )
}

interface SortableTaskCardProps {
  columnId: string
  task: KanbanTaskCard
  onOpenTask: (taskId: string) => void
}

function SortableTaskCard({ columnId, task, onOpenTask }: SortableTaskCardProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
      columnId,
    },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <button
      type="button"
      className={isDragging ? 'task-card is-dragging' : 'task-card'}
      ref={setNodeRef}
      style={style}
      onClick={() => onOpenTask(task.id)}
      {...attributes}
      {...listeners}
    >
      <TaskCardContent task={task} />
    </button>
  )
}

export function TaskCardPreview({ task }: { task: KanbanTaskCard }) {
  return (
    <article className="task-card task-card-overlay">
      <TaskCardContent task={task} />
    </article>
  )
}

function TaskCardContent({ task }: { task: KanbanTaskCard }) {
  return (
    <>
      <div className="task-card-header">
        <span className="task-title">{task.title}</span>
        <strong className="task-friendly-id">{task.friendlyId}</strong>
      </div>
      {task.assigneeName ? <small>Responsavel: {task.assigneeName}</small> : null}
    </>
  )
}
