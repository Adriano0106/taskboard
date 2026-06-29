import type { FormEvent } from 'react'
import type { CompanyMember, KanbanTaskWatcher } from '../api.js'

interface TaskWatchersProps {
  companyMembers: CompanyMember[]
  updatingWatcherUserId: string | null
  watchers: KanbanTaskWatcher[]
  watchersStatusMessage: string
  onAddWatcher: (userId: string) => void
  onRemoveWatcher: (userId: string) => void
}

export function TaskWatchers({
  companyMembers,
  updatingWatcherUserId,
  watchers,
  watchersStatusMessage,
  onAddWatcher,
  onRemoveWatcher,
}: TaskWatchersProps) {
  const watcherUserIds = new Set(watchers.map((watcher) => watcher.userId))
  const availableMembers = companyMembers.filter((member) => !watcherUserIds.has(member.id))

  function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const formElement = formEvent.currentTarget
    const formData = new FormData(formElement)
    const userId = String(formData.get('userId') ?? '')

    if (!userId) {
      return
    }

    onAddWatcher(userId)
    formElement.reset()
  }

  return (
    <section className="task-watchers">
      <div className="task-comments-header">
        <h3>Observadores</h3>
        <span>{watchers.length}</span>
      </div>

      {watchers.length > 0 ? (
        <div className="task-watchers-list">
          {watchers.map((watcher) => (
            <div className="task-watcher" key={watcher.userId}>
              <div>
                <strong>{watcher.name}</strong>
                <small>{watcher.email}</small>
              </div>
              <button
                type="button"
                className="icon-button"
                disabled={updatingWatcherUserId === watcher.userId}
                onClick={() => onRemoveWatcher(watcher.userId)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum observador cadastrado.</p>
      )}

      <form className="task-watcher-form" onSubmit={handleSubmit}>
        <select
          name="userId"
          disabled={availableMembers.length === 0 || updatingWatcherUserId !== null}
          defaultValue=""
        >
          <option value="" disabled>
            Selecionar membro
          </option>
          {availableMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="secondary-button"
          disabled={availableMembers.length === 0 || updatingWatcherUserId !== null}
        >
          Adicionar
        </button>
      </form>

      {watchersStatusMessage ? <p className="error-message">{watchersStatusMessage}</p> : null}
    </section>
  )
}
