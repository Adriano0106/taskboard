import type { FormEvent } from 'react'
import type {
  CompanyMember,
  KanbanTaskActivity,
  KanbanTaskComment,
  KanbanTaskDetail,
  KanbanTaskWatcher,
} from '../api.js'
import { formatDateTime } from '../kanban-helpers.js'
import { TaskActivities } from './TaskActivities.js'
import { TaskComments } from './TaskComments.js'
import { TaskWatchers } from './TaskWatchers.js'

const priorityLabels = {
  LOW: 'Baixo',
  MEDIUM: 'Media',
  HIGH: 'Alto',
  URGENT: 'Urgente',
}

interface TaskDetailDialogProps {
  activities?: KanbanTaskActivity[]
  activitiesStatusMessage?: string
  companyMembers?: CompanyMember[]
  onClose: () => void
  comments?: KanbanTaskComment[]
  commentsStatusMessage?: string
  isCommentSubmitting?: boolean
  isTaskUpdating?: boolean
  taskDetail?: KanbanTaskDetail
  title: string
  updatingWatcherUserId?: string | null
  watchers?: KanbanTaskWatcher[]
  watchersStatusMessage?: string
  onAddWatcher?: (userId: string) => void
  onCreateComment?: (content: string) => void
  onRemoveWatcher?: (userId: string) => void
  onUpdateTask?: (formEvent: FormEvent<HTMLFormElement>) => void
}

export function TaskDetailDialog({
  activities = [],
  activitiesStatusMessage = '',
  companyMembers = [],
  comments = [],
  commentsStatusMessage = '',
  isCommentSubmitting = false,
  isTaskUpdating = false,
  onClose,
  onAddWatcher,
  onCreateComment,
  onRemoveWatcher,
  onUpdateTask,
  taskDetail,
  title,
  updatingWatcherUserId = null,
  watchers = [],
  watchersStatusMessage = '',
}: TaskDetailDialogProps) {
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
          <>
            <form
              className="task-edit-form"
              key={taskDetail.updatedAt}
              onSubmit={onUpdateTask}
            >
              <label>
                Titulo
                <input name="title" type="text" minLength={2} defaultValue={taskDetail.title} />
              </label>

              <label>
                Descricao
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={taskDetail.description ?? ''}
                />
              </label>

              <div className="form-grid">
                <label>
                  Prioridade
                  <select name="priority" defaultValue={taskDetail.priority}>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Responsavel
                  <select name="assigneeId" defaultValue={taskDetail.assigneeId ?? ''}>
                    <option value="">Sem responsavel</option>
                    {companyMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {onUpdateTask ? (
                <button type="submit" className="primary-button" disabled={isTaskUpdating}>
                  {isTaskUpdating ? 'Salvando...' : 'Salvar alteracoes'}
                </button>
              ) : null}
            </form>

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
                <dt>Prioridade</dt>
                <dd>{priorityLabels[taskDetail.priority]}</dd>
              </div>
              <div>
                <dt>Criada em</dt>
                <dd>{formatDateTime(taskDetail.createdAt)}</dd>
              </div>
              <div>
                <dt>Atualizada em</dt>
                <dd>{formatDateTime(taskDetail.updatedAt)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="muted">Buscando informacoes da task...</p>
        )}
        {taskDetail && onAddWatcher && onRemoveWatcher ? (
          <TaskWatchers
            companyMembers={companyMembers}
            updatingWatcherUserId={updatingWatcherUserId}
            watchers={watchers}
            watchersStatusMessage={watchersStatusMessage}
            onAddWatcher={onAddWatcher}
            onRemoveWatcher={onRemoveWatcher}
          />
        ) : null}
        {taskDetail ? (
          <TaskActivities activities={activities} statusMessage={activitiesStatusMessage} />
        ) : null}
        {taskDetail && onCreateComment ? (
          <TaskComments
            comments={comments}
            isSubmitting={isCommentSubmitting}
            statusMessage={commentsStatusMessage}
            onCreateComment={onCreateComment}
          />
        ) : null}
      </dialog>
    </div>
  )
}
