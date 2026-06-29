import { useEffect, useState } from 'react'
import type { KanbanTaskWatcher } from '../api.js'
import { addTaskWatcher, getTaskWatchers, removeTaskWatcher } from '../api.js'

interface UseTaskWatchersInput {
  taskId: string | null
  token: string | null
}

export function useTaskWatchers({ taskId, token }: UseTaskWatchersInput) {
  const [watchers, setWatchers] = useState<KanbanTaskWatcher[]>([])
  const [watchersStatusMessage, setWatchersStatusMessage] = useState('')
  const [updatingWatcherUserId, setUpdatingWatcherUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !taskId) {
      setWatchers([])
      setWatchersStatusMessage('')
      return
    }

    let shouldIgnoreResult = false

    setWatchersStatusMessage('')
    getTaskWatchers(token, taskId)
      .then((loadedWatchers) => {
        if (!shouldIgnoreResult) {
          setWatchers(loadedWatchers)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setWatchersStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar observadores',
          )
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [taskId, token])

  async function addWatcher(userId: string) {
    if (!token || !taskId) {
      return
    }

    setUpdatingWatcherUserId(userId)
    setWatchersStatusMessage('')

    try {
      const updatedWatchers = await addTaskWatcher(token, taskId, userId)
      setWatchers(updatedWatchers)
    } catch (error) {
      setWatchersStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel adicionar observador',
      )
    } finally {
      setUpdatingWatcherUserId(null)
    }
  }

  async function removeWatcher(userId: string) {
    if (!token || !taskId) {
      return
    }

    setUpdatingWatcherUserId(userId)
    setWatchersStatusMessage('')

    try {
      const updatedWatchers = await removeTaskWatcher(token, taskId, userId)
      setWatchers(updatedWatchers)
    } catch (error) {
      setWatchersStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover observador',
      )
    } finally {
      setUpdatingWatcherUserId(null)
    }
  }

  return {
    addWatcher,
    removeWatcher,
    updatingWatcherUserId,
    watchers,
    watchersStatusMessage,
  }
}
