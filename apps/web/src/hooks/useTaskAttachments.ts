import { useEffect, useState } from 'react'
import type { KanbanTaskAttachment } from '../api.js'
import {
  createTaskAttachment,
  deleteTaskAttachment,
  downloadTaskAttachment,
  getTaskAttachments,
} from '../api.js'

const maxAttachmentSizeBytes = 3 * 1024 * 1024

interface UseTaskAttachmentsInput {
  taskId: string | null
  token: string | null
}

export function useTaskAttachments({ taskId, token }: UseTaskAttachmentsInput) {
  const [attachments, setAttachments] = useState<KanbanTaskAttachment[]>([])
  const [attachmentsStatusMessage, setAttachmentsStatusMessage] = useState('')
  const [updatingAttachmentId, setUpdatingAttachmentId] = useState<string | null>(null)
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false)

  useEffect(() => {
    if (!token || !taskId) {
      setAttachments([])
      setAttachmentsStatusMessage('')
      return
    }

    let shouldIgnoreResult = false

    setAttachmentsStatusMessage('')
    getTaskAttachments(token, taskId)
      .then((loadedAttachments) => {
        if (!shouldIgnoreResult) {
          setAttachments(loadedAttachments)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setAttachmentsStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar anexos',
          )
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [taskId, token])

  async function uploadAttachment(file: File) {
    if (!token || !taskId) {
      return
    }

    if (file.size > maxAttachmentSizeBytes) {
      setAttachmentsStatusMessage('O anexo deve ter no maximo 3 MB')
      return
    }

    setIsAttachmentUploading(true)
    setAttachmentsStatusMessage('')

    try {
      const attachment = await createTaskAttachment(token, taskId, file)
      setAttachments((currentAttachments) => [...currentAttachments, attachment])
      setAttachmentsStatusMessage('Anexo enviado.')
    } catch (error) {
      setAttachmentsStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel enviar o anexo',
      )
    } finally {
      setIsAttachmentUploading(false)
    }
  }

  async function downloadAttachment(attachment: KanbanTaskAttachment) {
    if (!token || !taskId) {
      return
    }

    setUpdatingAttachmentId(attachment.id)
    setAttachmentsStatusMessage('')

    try {
      await downloadTaskAttachment(token, taskId, attachment.id, attachment.fileName)
    } catch (error) {
      setAttachmentsStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel baixar o anexo',
      )
    } finally {
      setUpdatingAttachmentId(null)
    }
  }

  async function removeAttachment(attachmentId: string) {
    if (!token || !taskId) {
      return
    }

    setUpdatingAttachmentId(attachmentId)
    setAttachmentsStatusMessage('')

    try {
      const updatedAttachments = await deleteTaskAttachment(token, taskId, attachmentId)
      setAttachments(updatedAttachments)
      setAttachmentsStatusMessage('Anexo removido.')
    } catch (error) {
      setAttachmentsStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover o anexo',
      )
    } finally {
      setUpdatingAttachmentId(null)
    }
  }

  return {
    attachments,
    attachmentsStatusMessage,
    downloadAttachment,
    isAttachmentUploading,
    removeAttachment,
    updatingAttachmentId,
    uploadAttachment,
  }
}
