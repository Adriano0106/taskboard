import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KanbanColumn } from '../api.js'
import type { ColumnDragData } from '../types/kanban.js'

interface ColumnOrganizerDialogProps {
  columns: KanbanColumn[]
  reorderingColumnId: string | null
  onClose: () => void
  onReorderColumn: (columnId: string, position: number) => void
}

export function ColumnOrganizerDialog({
  columns,
  reorderingColumnId,
  onClose,
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
                  isReordering={reorderingColumnId === column.id}
                  key={column.id}
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
  isReordering: boolean
}

function SortableColumnOrderRow({ column, isReordering }: SortableColumnOrderRowProps) {
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

  return (
    <button
      type="button"
      className={isDragging ? 'column-order-row is-dragging' : 'column-order-row'}
      disabled={isReordering}
      ref={setNodeRef}
      style={rowStyle}
      {...attributes}
      {...listeners}
    >
      <span>{column.name}</span>
      <small>{isReordering ? 'Reorganizando...' : 'Arraste para ordenar'}</small>
    </button>
  )
}
