import type { KanbanTaskActivity, TaskActivityType } from '../api.js'
import { formatDateTime } from '../kanban-helpers.js'

interface TaskActivitiesProps {
  activities: KanbanTaskActivity[]
  statusMessage: string
}

const activityLabels: Record<TaskActivityType, string> = {
  CREATED: 'criou a task',
  COMMENTED: 'comentou',
  MOVED: 'moveu a task',
  PRIORITY_CHANGED: 'alterou a prioridade',
  ASSIGNEE_CHANGED: 'alterou o responsavel',
}

const priorityLabels: Record<string, string> = {
  LOW: 'Baixo',
  MEDIUM: 'Media',
  HIGH: 'Alto',
  URGENT: 'Urgente',
}

export function TaskActivities({ activities, statusMessage }: TaskActivitiesProps) {
  return (
    <section className="task-activities">
      <div className="task-comments-header">
        <h3>Historico</h3>
        <span>{activities.length}</span>
      </div>

      {activities.length > 0 ? (
        <div className="task-activities-list">
          {activities.map((activity) => (
            <article className="task-activity" key={activity.id}>
              <div>
                <strong>{activity.actorName}</strong>
                <span>{activityLabels[activity.type]}</span>
              </div>
              {renderActivityDetail(activity)}
              <small>{formatDateTime(activity.createdAt)}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhuma atividade registrada.</p>
      )}

      {statusMessage ? <p className="error-message">{statusMessage}</p> : null}
    </section>
  )
}

function renderActivityDetail(activity: KanbanTaskActivity) {
  if (activity.type === 'MOVED') {
    return (
      <p>
        {activity.metadata.fromColumn ?? 'Sem coluna'} {'->'}{' '}
        {activity.metadata.toColumn ?? 'Sem coluna'}
      </p>
    )
  }

  if (activity.type === 'PRIORITY_CHANGED') {
    return (
      <p>
        {formatPriority(activity.metadata.fromPriority)} {'->'}{' '}
        {formatPriority(activity.metadata.toPriority)}
      </p>
    )
  }

  if (activity.type === 'ASSIGNEE_CHANGED') {
    return (
      <p>
        {activity.metadata.fromAssignee ?? 'Sem responsavel'} {'->'}{' '}
        {activity.metadata.toAssignee ?? 'Sem responsavel'}
      </p>
    )
  }

  if (activity.type === 'CREATED' && activity.metadata.title) {
    return <p>{activity.metadata.title}</p>
  }

  return null
}

function formatPriority(priority: string | null | undefined) {
  if (!priority) {
    return 'Sem prioridade'
  }

  return priorityLabels[priority] ?? priority
}
