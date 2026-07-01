import { type ChangeEvent, type DragEvent, useState } from 'react'
import type { KanbanTaskAttachment } from '../api.js'
import { formatDateTime } from '../kanban-helpers.js'
import { Button } from './ui/Button.js'

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
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    onUploadAttachment(file)
    event.target.value = ''
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()

    if (!isUploading) {
      setIsDraggingFile(true)
    }
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }

    setIsDraggingFile(false)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDraggingFile(false)

    const file = event.dataTransfer.files[0]

    if (!file || isUploading) {
      return
    }

    onUploadAttachment(file)
  }

  function handleRemoveAttachment(attachment: KanbanTaskAttachment) {
    if (!window.confirm(`Remover anexo "${attachment.fileName}"?`)) {
      return
    }

    onRemoveAttachment(attachment.id)
  }

  return (
    <section className="task-attachments">
      <div className="task-comments-header">
        <h3>Anexos</h3>
        <span>{attachments.length}</span>
      </div>

      <label
        className={
          isDraggingFile ? 'task-attachment-upload is-dragging-file' : 'task-attachment-upload'
        }
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input type="file" disabled={isUploading} onChange={handleFileChange} />
        <span>
          {isUploading
            ? 'Enviando...'
            : isDraggingFile
              ? 'Solte o arquivo'
              : 'Selecionar ou arrastar arquivo'}
        </span>
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
                <Button
                  type="button"
                  variant="icon"
                  disabled={updatingAttachmentId === attachment.id}
                  onClick={() => onDownloadAttachment(attachment)}
                >
                  Baixar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={updatingAttachmentId === attachment.id}
                  onClick={() => handleRemoveAttachment(attachment)}
                >
                  Remover
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum anexo enviado.</p>
      )}

      {statusMessage ? (
        <p className={isAttachmentErrorMessage(statusMessage) ? 'error-message' : 'surface-message'}>
          {statusMessage}
        </p>
      ) : null}
    </section>
  )
}

function isAttachmentErrorMessage(statusMessage: string) {
  return statusMessage.startsWith('Nao') || statusMessage.startsWith('O anexo')
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
