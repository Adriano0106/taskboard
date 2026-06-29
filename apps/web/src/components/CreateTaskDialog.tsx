import type { FormEvent } from 'react'
import type { CompanyMember, TaskPriority } from '../api.js'

interface CreateTaskDialogProps {
  companyMembers: CompanyMember[]
  currentUserId: string
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (formEvent: FormEvent<HTMLFormElement>) => void
}

const taskPriorities: Array<{
  label: string
  value: TaskPriority
}> = [
  {
    label: 'Baixo',
    value: 'LOW',
  },
  {
    label: 'Media',
    value: 'MEDIUM',
  },
  {
    label: 'Alto',
    value: 'HIGH',
  },
  {
    label: 'Urgente',
    value: 'URGENT',
  },
]

export function CreateTaskDialog({
  companyMembers,
  currentUserId,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateTaskDialogProps) {
  return (
    <div className="modal-backdrop">
      <dialog className="task-detail-modal create-task-modal" aria-modal="true" open>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Nova tarefa</p>
            <h2>Adicionar nova tarefa</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form className="create-task-form" onSubmit={onSubmit}>
          <label>
            Titulo
            <input name="title" type="text" minLength={2} required />
          </label>

          <label>
            Descricao
            <textarea name="description" rows={4} />
          </label>

          <div className="form-grid">
            <label>
              Prioridade
              <select name="priority" defaultValue="MEDIUM">
                {taskPriorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Responsavel
              <select name="assigneeId" defaultValue={currentUserId}>
                {companyMembers.length === 0 ? <option value={currentUserId}>Voce</option> : null}
                {companyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="task-future-options">
            <button type="button" disabled>
              Anexos
            </button>
            <button type="button" disabled>
              Observadores
            </button>
            <button type="button" disabled>
              Comentarios
            </button>
          </div>

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar tarefa'}
          </button>
        </form>
      </dialog>
    </div>
  )
}
