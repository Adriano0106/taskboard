import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react'
import {
  type AuthSession,
  type KanbanBoard,
  type KanbanColumn,
  type KanbanTaskDetail,
  type TaskPriority,
  createColumn,
  createTask,
  deleteColumn,
  renameColumn,
  reorderColumn,
  updateTask,
} from '../api.js'
import type { AppRoute } from '../routing.js'

interface UseBoardActionsInput {
  currentRoute: AppRoute
  kanbanBoard: KanbanBoard | null
  reloadActivities: () => Promise<void>
  selectedTaskDetail: KanbanTaskDetail | null
  session: AuthSession | null
  setKanbanBoard: Dispatch<SetStateAction<KanbanBoard | null>>
  setKanbanStatusMessage: Dispatch<SetStateAction<string>>
  setSelectedTaskDetail: Dispatch<SetStateAction<KanbanTaskDetail | null>>
}

export function useBoardActions({
  currentRoute,
  kanbanBoard,
  reloadActivities,
  selectedTaskDetail,
  session,
  setKanbanBoard,
  setKanbanStatusMessage,
  setSelectedTaskDetail,
}: UseBoardActionsInput) {
  const [isColumnOrganizerOpen, setIsColumnOrganizerOpen] = useState(false)
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false)
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null)
  const [reorderingColumnId, setReorderingColumnId] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  function getActiveCompanyId() {
    if (currentRoute.type === 'board' || currentRoute.type === 'task') {
      return currentRoute.companyId
    }

    return session?.company.id ?? null
  }

  async function createTaskFromForm(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const formElement = formEvent.currentTarget
    const firstColumn = kanbanBoard?.columns[0]
    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !firstColumn || !companyId) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const title = String(formData.get('title') ?? '').trim()

    if (!title) {
      return
    }

    setCreatingTaskColumnId(firstColumn.id)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await createTask(session.token, companyId, kanbanBoard.id, {
        columnId: firstColumn.id,
        title,
        description: String(formData.get('description') ?? '').trim(),
        priority: String(formData.get('priority') ?? 'MEDIUM') as TaskPriority,
        assigneeId: String(formData.get('assigneeId') ?? '') || undefined,
      })

      setKanbanBoard(updatedBoard)
      formElement.reset()
      setIsCreateTaskDialogOpen(false)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a task',
      )
    } finally {
      setCreatingTaskColumnId(null)
    }
  }

  async function createColumnFromForm(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const formElement = formEvent.currentTarget
    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !companyId) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setKanbanStatusMessage('')

    try {
      const updatedBoard = await createColumn(session.token, companyId, kanbanBoard.id, {
        name,
        position: kanbanBoard.columns.length + 1,
      })

      setKanbanBoard(updatedBoard)
      formElement.reset()
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a coluna',
      )
    }
  }

  async function renameColumnFromForm(formEvent: FormEvent<HTMLFormElement>, column: KanbanColumn) {
    formEvent.preventDefault()

    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !companyId) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name || name === column.name) {
      return
    }

    setEditingColumnId(column.id)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await renameColumn(session.token, companyId, kanbanBoard.id, column.id, {
        name,
      })

      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel renomear a coluna',
      )
    } finally {
      setEditingColumnId(null)
    }
  }

  async function deleteColumnByColumn(column: KanbanColumn) {
    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !companyId) {
      return
    }

    setDeletingColumnId(column.id)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await deleteColumn(session.token, companyId, kanbanBoard.id, column.id)
      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover a coluna',
      )
    } finally {
      setDeletingColumnId(null)
    }
  }

  async function reorderColumnById(columnId: string, position: number) {
    const companyId = getActiveCompanyId()

    if (!session?.token || !kanbanBoard || !companyId) {
      return
    }

    setReorderingColumnId(columnId)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await reorderColumn(session.token, companyId, kanbanBoard.id, columnId, {
        position,
      })

      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel reorganizar as colunas',
      )
    } finally {
      setReorderingColumnId(null)
    }
  }

  async function updateTaskFromForm(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!session?.token || !selectedTaskDetail) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const title = String(formData.get('title') ?? '').trim()

    if (!title) {
      return
    }

    setUpdatingTaskId(selectedTaskDetail.id)
    setKanbanStatusMessage('')

    try {
      const updatedTask = await updateTask(session.token, selectedTaskDetail.id, {
        title,
        description: String(formData.get('description') ?? '').trim(),
        priority: String(formData.get('priority') ?? 'MEDIUM') as TaskPriority,
        assigneeId: String(formData.get('assigneeId') ?? '') || null,
      })

      setKanbanBoard(updatedTask.board)
      setSelectedTaskDetail(updatedTask.task)
      await reloadActivities()
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar a task',
      )
    } finally {
      setUpdatingTaskId(null)
    }
  }

  return {
    closeColumnOrganizer: () => setIsColumnOrganizerOpen(false),
    closeCreateTaskDialog: () => setIsCreateTaskDialogOpen(false),
    createColumnFromForm,
    createTaskFromForm,
    creatingTaskColumnId,
    deleteColumnByColumn,
    deletingColumnId,
    editingColumnId,
    isColumnOrganizerOpen,
    isCreateTaskDialogOpen,
    isTaskUpdating: updatingTaskId === selectedTaskDetail?.id,
    openColumnOrganizer: () => setIsColumnOrganizerOpen(true),
    openCreateTaskDialog: () => setIsCreateTaskDialogOpen(true),
    renameColumnFromForm,
    reorderColumnById,
    reorderingColumnId,
    updateTaskFromForm,
  }
}
