import { useEffect, useState } from 'react'
import type { KanbanTaskComment } from '../api.js'
import { createTaskComment, getTaskComments } from '../api.js'

interface UseTaskCommentsInput {
  taskId: string | null
  token: string | null
}

export function useTaskComments({ taskId, token }: UseTaskCommentsInput) {
  const [comments, setComments] = useState<KanbanTaskComment[]>([])
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [commentsStatusMessage, setCommentsStatusMessage] = useState('')

  useEffect(() => {
    if (!token || !taskId) {
      setComments([])
      return
    }

    let shouldIgnoreResult = false

    setCommentsStatusMessage('')

    getTaskComments(token, taskId)
      .then((loadedComments) => {
        if (!shouldIgnoreResult) {
          setComments(loadedComments)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setCommentsStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar comentarios',
          )
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [taskId, token])

  async function addComment(content: string) {
    if (!token || !taskId) {
      return
    }

    setIsCommentSubmitting(true)
    setCommentsStatusMessage('')

    try {
      const comment = await createTaskComment(token, taskId, content)
      setComments((currentComments) => [...currentComments, comment])
    } catch (error) {
      setCommentsStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar o comentario',
      )
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  return {
    addComment,
    comments,
    commentsStatusMessage,
    isCommentSubmitting,
  }
}
