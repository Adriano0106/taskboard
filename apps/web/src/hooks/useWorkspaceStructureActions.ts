import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react'
import {
  type AuthSession,
  type CompanyWorkspace,
  createBoard,
  createDepartment,
  deleteBoard,
  deleteDepartment,
  renameDepartment,
  updateBoard,
  updateCompany,
} from '../api.js'
import { type AppRoute, createBoardPath, createCompanySlugPath } from '../routing.js'
import { sessionStorageKey } from '../session-storage.js'

interface UseWorkspaceStructureActionsInput {
  currentRoute: AppRoute
  navigateTo: (path: string, options?: { replace?: boolean }) => void
  session: AuthSession | null
  setCompanyWorkspace: Dispatch<SetStateAction<CompanyWorkspace | null>>
  setSession: Dispatch<SetStateAction<AuthSession | null>>
}

export function useWorkspaceStructureActions({
  currentRoute,
  navigateTo,
  session,
  setCompanyWorkspace,
  setSession,
}: UseWorkspaceStructureActionsInput) {
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null)
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null)
  const [workspaceStructureMessage, setWorkspaceStructureMessage] = useState('')

  async function createDepartmentFromForm(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formElement = formEvent.currentTarget
    const formData = new FormData(formElement)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await createDepartment(session.token, {
        name,
      })

      setCompanyWorkspace(updatedWorkspace)
      formElement.reset()
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar o departamento',
      )
    }
  }

  async function updateCompanyFromForm(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const slug = String(formData.get('slug') ?? '').trim()
    const primaryColor = String(formData.get('primaryColor') ?? '').trim()
    const secondaryColor = String(formData.get('secondaryColor') ?? '').trim()
    const accentColor = String(formData.get('accentColor') ?? '').trim()
    const boardBackgroundColor = String(formData.get('boardBackgroundColor') ?? '').trim()

    if (!name || !slug) {
      return
    }

    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await updateCompany(session.token, {
        name,
        slug,
        theme: {
          primaryColor,
          secondaryColor,
          accentColor,
          boardBackgroundColor,
        },
      })
      const updatedSession = {
        ...session,
        company: {
          ...session.company,
          name: updatedWorkspace.name,
          slug: updatedWorkspace.slug,
          theme: updatedWorkspace.theme,
        },
      }

      setCompanyWorkspace(updatedWorkspace)
      setSession(updatedSession)
      localStorage.setItem(sessionStorageKey, JSON.stringify(updatedSession))

      if (currentRoute.type === 'companySlug') {
        navigateTo(createCompanySlugPath(updatedWorkspace.slug), {
          replace: true,
        })
      }
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar a empresa',
      )
    }
  }

  async function renameDepartmentFromForm(
    formEvent: FormEvent<HTMLFormElement>,
    departmentId: string,
  ) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setEditingDepartmentId(departmentId)
    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await renameDepartment(session.token, departmentId, {
        name,
      })

      setCompanyWorkspace(updatedWorkspace)
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel renomear o departamento',
      )
    } finally {
      setEditingDepartmentId(null)
    }
  }

  async function deleteDepartmentById(departmentId: string, departmentName: string) {
    if (!session?.token || !window.confirm(`Remover departamento "${departmentName}"?`)) {
      return
    }

    setDeletingDepartmentId(departmentId)
    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await deleteDepartment(session.token, departmentId)
      setCompanyWorkspace(updatedWorkspace)
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover o departamento',
      )
    } finally {
      setDeletingDepartmentId(null)
    }
  }

  async function createBoardFromForm(formEvent: FormEvent<HTMLFormElement>, departmentId: string) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formElement = formEvent.currentTarget
    const formData = new FormData(formElement)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await createBoard(session.token, departmentId, {
        name,
        description: String(formData.get('description') ?? '').trim(),
      })

      setCompanyWorkspace(updatedWorkspace)
      formElement.reset()
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar o quadro',
      )
    }
  }

  async function updateBoardFromForm(formEvent: FormEvent<HTMLFormElement>, boardId: string) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setEditingBoardId(boardId)
    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await updateBoard(session.token, boardId, {
        name,
        description: String(formData.get('description') ?? '').trim(),
      })

      setCompanyWorkspace(updatedWorkspace)
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar o quadro',
      )
    } finally {
      setEditingBoardId(null)
    }
  }

  async function deleteBoardById(boardId: string, boardName: string) {
    if (
      !session?.token ||
      !window.confirm(
        `Remover quadro "${boardName}"? So sera possivel se nao houver tasks abertas.`,
      )
    ) {
      return
    }

    setDeletingBoardId(boardId)
    setWorkspaceStructureMessage('')

    try {
      const updatedWorkspace = await deleteBoard(session.token, boardId)
      setCompanyWorkspace(updatedWorkspace)

      if (
        currentRoute.type === 'board' &&
        currentRoute.boardId === boardId &&
        updatedWorkspace.departments[0]?.boards[0]
      ) {
        navigateTo(
          createBoardPath(updatedWorkspace.id, updatedWorkspace.departments[0].boards[0].id),
        )
      }
    } catch (error) {
      setWorkspaceStructureMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover o quadro',
      )
    } finally {
      setDeletingBoardId(null)
    }
  }

  return {
    createBoardFromForm,
    createDepartmentFromForm,
    deleteBoardById,
    deleteDepartmentById,
    deletingBoardId,
    deletingDepartmentId,
    editingBoardId,
    editingDepartmentId,
    renameDepartmentFromForm,
    updateBoardFromForm,
    updateCompanyFromForm,
    workspaceStructureMessage,
  }
}
