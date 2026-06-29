import type { FormEvent } from 'react'
import type { KanbanTaskComment } from '../api.js'
import { formatDateTime } from '../kanban-helpers.js'

interface TaskCommentsProps {
  comments: KanbanTaskComment[]
  isSubmitting: boolean
  statusMessage: string
  onCreateComment: (content: string) => void
}

export function TaskComments({
  comments,
  isSubmitting,
  statusMessage,
  onCreateComment,
}: TaskCommentsProps) {
  function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const formElement = formEvent.currentTarget
    const formData = new FormData(formElement)
    const content = String(formData.get('content') ?? '').trim()

    if (!content) {
      return
    }

    onCreateComment(content)
    formElement.reset()
  }

  return (
    <section className="task-comments">
      <div className="task-comments-header">
        <h3>Comentarios</h3>
        <span>{comments.length}</span>
      </div>

      {comments.length > 0 ? (
        <div className="task-comments-list">
          {comments.map((comment) => (
            <article className="task-comment" key={comment.id}>
              <header>
                <strong>{comment.authorName}</strong>
                <small>{formatDateTime(comment.createdAt)}</small>
              </header>
              <p>{comment.content}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum comentario ainda.</p>
      )}

      <form className="task-comment-form" onSubmit={handleSubmit}>
        <textarea name="content" rows={3} placeholder="Escrever comentario" required />
        {statusMessage ? <p className="error-message">{statusMessage}</p> : null}
        <button type="submit" className="secondary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Comentar'}
        </button>
      </form>
    </section>
  )
}
