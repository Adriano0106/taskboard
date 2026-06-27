import type { KanbanTaskDetail } from '../api.js'
import { formatDateTime } from '../kanban-helpers.js'

interface TaskDetailDialogProps {
  onClose: () => void
  taskDetail?: KanbanTaskDetail
  title: string
}

export function TaskDetailDialog({ onClose, taskDetail, title }: TaskDetailDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <dialog aria-modal="true" className="task-detail-modal" open>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            Fechar
          </button>
        </div>
        {taskDetail ? (
          <dl className="task-detail-list">
            <div>
              <dt>Quadro</dt>
              <dd>{taskDetail.boardName}</dd>
            </div>
            <div>
              <dt>Coluna</dt>
              <dd>{taskDetail.columnName}</dd>
            </div>
            <div>
              <dt>Responsavel</dt>
              <dd>{taskDetail.assigneeName ?? 'Sem responsavel'}</dd>
            </div>
            <div>
              <dt>Criada em</dt>
              <dd>{formatDateTime(taskDetail.createdAt)}</dd>
            </div>
            <div>
              <dt>Atualizada em</dt>
              <dd>{formatDateTime(taskDetail.updatedAt)}</dd>
            </div>
            <div className="task-detail-description">
              <dt>Descricao</dt>
              <dd>{taskDetail.description ?? 'Sem descricao cadastrada'}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">Buscando informacoes da task...</p>
        )}
      </dialog>
    </div>
  )
}
