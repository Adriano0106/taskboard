import type { ChangeEvent } from 'react'
import type { KanbanTaskAttachment } from '../api.js'
import { formatDateTime } from '../kanban-helpers.js'

interface TaskAttachmentsProps {
  attachments: KanbanTaskAttachment[]
  isUploading: boolean
  statusMessage: string
  updatingAttachmentId: string | null
  onDownloadAttachment: (attachment: KanbanTaskAttachment) => void
  onRemoveAttachment: (attachmentId: string) => void
  onUploadAttachment: (file: File) => void
}

export function TaskAttachments({
  attachments,
  isUploading,
  statusMessage,
  updatingAttachmentId,
  onDownloadAttachment,
  onRemoveAttachment,
  onUploadAttachment,
}: TaskAttachmentsProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    onUploadAttachment(file)
    event.target.value = ''
  }

  return (
    <section className="task-attachments">
      <div className="task-comments-header">
        <h3>Anexos</h3>
        <span>{attachments.length}</span>
      </div>

      <label className="task-attachment-upload">
        <input type="file" disabled={isUploading} onChange={handleFileChange} />
        <span>{isUploading ? 'Enviando...' : 'Selecionar arquivo'}</span>
        <small>Limite de 3 MB por arquivo</small>
      </label>

      {attachments.length > 0 ? (
        <div className="task-attachments-list">
          {attachments.map((attachment) => (
            <article className="task-attachment" key={attachment.id}>
              <div>
                <strong>{attachment.fileName}</strong>
                <small>
                  {formatFileSize(attachment.sizeBytes)} por {attachment.uploaderName} em{' '}
                  {formatDateTime(attachment.createdAt)}
                </small>
              </div>
              <div className="task-attachment-actions">
                <button
                  type="button"
                  className="icon-button"
                  disabled={updatingAttachmentId === attachment.id}
                  onClick={() => onDownloadAttachment(attachment)}
                >
                  Baixar
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={updatingAttachmentId === attachment.id}
                  onClick={() => onRemoveAttachment(attachment.id)}
                >
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum anexo enviado.</p>
      )}

      {statusMessage ? <p className="error-message">{statusMessage}</p> : null}
    </section>
  )
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
}
