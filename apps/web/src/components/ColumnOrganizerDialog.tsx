import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KanbanColumn } from '../api.js'
import type { ColumnDragData } from '../types/kanban.js'

interface ColumnOrganizerDialogProps {
  columns: KanbanColumn[]
  deletingColumnId: string | null
  reorderingColumnId: string | null
  onClose: () => void
  onDeleteColumn: (column: KanbanColumn) => void
  onReorderColumn: (columnId: string, position: number) => void
}

export function ColumnOrganizerDialog({
  columns,
  deletingColumnId,
  reorderingColumnId,
  onClose,
  onDeleteColumn,
  onReorderColumn,
}: ColumnOrganizerDialogProps) {
  const columnOrganizerSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  function handleColumnDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return
    }

    const targetColumnIndex = columns.findIndex((column) => column.id === String(event.over?.id))

    if (targetColumnIndex < 0) {
      return
    }

    onReorderColumn(String(event.active.id), targetColumnIndex + 1)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="task-detail-modal column-organizer-dialog" open>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Quadro</p>
            <h2>Reorganizar colunas</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <DndContext sensors={columnOrganizerSensors} onDragEnd={handleColumnDragEnd}>
          <SortableContext
            items={columns.map((column) => column.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="column-organizer-list">
              {columns.map((column) => (
                <SortableColumnOrderRow
                  column={column}
                  deletingColumnId={deletingColumnId}
                  isReordering={reorderingColumnId === column.id}
                  key={column.id}
                  onDeleteColumn={onDeleteColumn}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </dialog>
    </div>
  )
}

interface SortableColumnOrderRowProps {
  column: KanbanColumn
  deletingColumnId: string | null
  isReordering: boolean
  onDeleteColumn: (column: KanbanColumn) => void
}

const protectedColumnNames = ['A fazer', 'Concluido']

function SortableColumnOrderRow({
  column,
  deletingColumnId,
  isReordering,
  onDeleteColumn,
}: SortableColumnOrderRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    } satisfies ColumnDragData,
  })

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const isProtectedColumn = protectedColumnNames.includes(column.name)
  const canDeleteColumn = column.tasks.length === 0 && !isProtectedColumn
  const removeColumnTitle = isProtectedColumn
    ? 'Coluna obrigatoria'
    : column.tasks.length > 0
      ? 'Remova os cards antes'
      : 'Remover coluna vazia'

  return (
    <div
      className={isDragging ? 'column-order-row is-dragging' : 'column-order-row'}
      style={rowStyle}
    >
      <button
        type="button"
        className="column-order-drag-button"
        disabled={isReordering}
        ref={setNodeRef}
        {...attributes}
        {...listeners}
      >
        <span>{column.name}</span>
        <small>{isReordering ? 'Reorganizando...' : 'Arraste para ordenar'}</small>
      </button>
      <button
        type="button"
        className="column-order-remove-button"
        disabled={!canDeleteColumn || deletingColumnId === column.id}
        title={removeColumnTitle}
        onClick={() => onDeleteColumn(column)}
      >
        -
      </button>
    </div>
  )
}
