import { useCallback, useEffect, useState } from 'react'
import type { KanbanTaskActivity } from '../api.js'
import { getTaskActivities } from '../api.js'

interface UseTaskActivitiesInput {
  taskId: string | null
  token: string | null
}

export function useTaskActivities({ taskId, token }: UseTaskActivitiesInput) {
  const [activities, setActivities] = useState<KanbanTaskActivity[]>([])
  const [activitiesStatusMessage, setActivitiesStatusMessage] = useState('')

  const loadActivities = useCallback(async () => {
    if (!token || !taskId) {
      setActivities([])
      setActivitiesStatusMessage('')
      return
    }

    setActivitiesStatusMessage('')

    try {
      const loadedActivities = await getTaskActivities(token, taskId)
      setActivities(loadedActivities)
    } catch (error) {
      setActivitiesStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel carregar historico',
      )
    }
  }, [taskId, token])

  useEffect(() => {
    let shouldIgnoreResult = false

    async function loadInitialActivities() {
      if (!token || !taskId) {
        setActivities([])
        setActivitiesStatusMessage('')
        return
      }

      setActivitiesStatusMessage('')

      try {
        const loadedActivities = await getTaskActivities(token, taskId)

        if (!shouldIgnoreResult) {
          setActivities(loadedActivities)
        }
      } catch (error) {
        if (!shouldIgnoreResult) {
          setActivitiesStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar historico',
          )
        }
      }
    }

    loadInitialActivities()

    return () => {
      shouldIgnoreResult = true
    }
  }, [taskId, token])

  return {
    activities,
    activitiesStatusMessage,
    reloadActivities: loadActivities,
  }
}
