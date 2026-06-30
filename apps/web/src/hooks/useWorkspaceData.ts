import { useCallback, useEffect, useState } from 'react'
import type {
  AuthSession,
  CompanyMember,
  CompanyWorkspace,
  KanbanBoard,
  KanbanTaskDetail,
  PlatformCompanySummary,
} from '../api.js'
import {
  getCompanyKanbanBoard,
  getCompanyWorkspace,
  getCurrentCompanyMembers,
  getCurrentCompanyWorkspace,
  getCurrentKanbanBoard,
  getPlatformCompanies,
  getTaskDetail,
} from '../api.js'
import { type AppRoute, createFriendlyBoardPath } from '../routing.js'

interface UseWorkspaceDataInput {
  currentRoute: AppRoute
  session: AuthSession | null
  navigateTo: (path: string, options?: { replace?: boolean }) => void
}

export function useWorkspaceData({ currentRoute, session, navigateTo }: UseWorkspaceDataInput) {
  const [companyWorkspace, setCompanyWorkspace] = useState<CompanyWorkspace | null>(null)
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([])
  const [platformCompanies, setPlatformCompanies] = useState<PlatformCompanySummary[]>([])
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard | null>(null)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<KanbanTaskDetail | null>(null)
  const [isKanbanLoading, setIsKanbanLoading] = useState(false)
  const [isCompanyLoading, setIsCompanyLoading] = useState(false)
  const [isAdminCompaniesLoading, setIsAdminCompaniesLoading] = useState(false)
  const [isTaskDetailLoading, setIsTaskDetailLoading] = useState(false)
  const [kanbanStatusMessage, setKanbanStatusMessage] = useState('')

  useEffect(() => {
    if (!session?.token) {
      return
    }

    let shouldIgnoreResult = false

    getCurrentCompanyMembers(session.token)
      .then((members) => {
        if (!shouldIgnoreResult) {
          setCompanyMembers(members)
        }
      })
      .catch(() => {
        if (!shouldIgnoreResult) {
          setCompanyMembers([])
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    const routeCompanyId =
      currentRoute.type === 'company' ||
      currentRoute.type === 'board' ||
      currentRoute.type === 'task'
        ? currentRoute.companyId
        : session.company.id
    let shouldIgnoreResult = false

    setIsCompanyLoading(true)
    setKanbanStatusMessage('')

    const workspaceRequest =
      currentRoute.type === 'home'
        ? getCurrentCompanyWorkspace(session.token)
        : getCompanyWorkspace(session.token, routeCompanyId)

    workspaceRequest
      .then((workspace) => {
        if (!shouldIgnoreResult) {
          setCompanyWorkspace(workspace)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setKanbanStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar a empresa',
          )
        }
      })
      .finally(() => {
        if (!shouldIgnoreResult) {
          setIsCompanyLoading(false)
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token, session?.company.id, currentRoute])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    if (currentRoute.type !== 'adminCompanies') {
      setPlatformCompanies([])
      return
    }

    let shouldIgnoreResult = false

    setIsAdminCompaniesLoading(true)
    setKanbanStatusMessage('')

    getPlatformCompanies(session.token)
      .then((companies) => {
        if (!shouldIgnoreResult) {
          setPlatformCompanies(companies)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setKanbanStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar as empresas',
          )
        }
      })
      .finally(() => {
        if (!shouldIgnoreResult) {
          setIsAdminCompaniesLoading(false)
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token, currentRoute])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    if (
      currentRoute.type === 'adminCompanies' ||
      currentRoute.type === 'company' ||
      currentRoute.type === 'profile'
    ) {
      setKanbanBoard(null)
      return
    }

    let shouldIgnoreResult = false

    setIsKanbanLoading(true)
    setKanbanStatusMessage('')

    const friendlyBoard =
      currentRoute.type === 'friendlyBoard' || currentRoute.type === 'friendlyTask'
        ? findWorkspaceBoardByKeys(
            companyWorkspace,
            currentRoute.departmentKey,
            currentRoute.boardKey,
          )
        : null

    if (
      (currentRoute.type === 'friendlyBoard' || currentRoute.type === 'friendlyTask') &&
      !friendlyBoard
    ) {
      if (companyWorkspace) {
        setKanbanStatusMessage('Nao foi possivel encontrar o quadro pela URL')
        setKanbanBoard(null)
        setIsKanbanLoading(false)
      }

      return
    }

    let boardRequest: Promise<KanbanBoard>

    if (currentRoute.type === 'board' || currentRoute.type === 'task') {
      boardRequest = getCompanyKanbanBoard(
        session.token,
        currentRoute.companyId,
        currentRoute.boardId,
      )
    } else if (currentRoute.type === 'friendlyBoard' || currentRoute.type === 'friendlyTask') {
      boardRequest = getCompanyKanbanBoard(
        session.token,
        session.company.id,
        friendlyBoard!.board.id,
      )
    } else {
      boardRequest = getCurrentKanbanBoard(session.token)
    }

    boardRequest
      .then((board) => {
        if (shouldIgnoreResult) {
          return
        }

        setKanbanBoard(board)

        if (currentRoute.type === 'home') {
          navigateTo(createFriendlyBoardPath(board.departmentKey, board.key), {
            replace: true,
          })
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setKanbanStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar o quadro',
          )
        }
      })
      .finally(() => {
        if (!shouldIgnoreResult) {
          setIsKanbanLoading(false)
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token, session?.company.id, currentRoute, navigateTo, companyWorkspace])

  useEffect(() => {
    if (
      !session?.token ||
      (currentRoute.type !== 'task' && currentRoute.type !== 'friendlyTask')
    ) {
      setSelectedTaskDetail(null)
      setIsTaskDetailLoading(false)
      return
    }

    const routeTaskId =
      currentRoute.type === 'task'
        ? currentRoute.taskId
        : findTaskIdByFriendlyId(kanbanBoard, currentRoute.taskFriendlyId)

    if (!routeTaskId) {
      if (kanbanBoard) {
        setSelectedTaskDetail(null)
        setIsTaskDetailLoading(false)
        setKanbanStatusMessage('Nao foi possivel encontrar a task pela URL')
      }

      return
    }

    let shouldIgnoreResult = false

    setSelectedTaskDetail(null)
    setIsTaskDetailLoading(true)
    setKanbanStatusMessage('')

    getTaskDetail(session.token, routeTaskId)
      .then((taskDetail) => {
        if (!shouldIgnoreResult) {
          setSelectedTaskDetail(taskDetail)
        }
      })
      .catch((error) => {
        if (!shouldIgnoreResult) {
          setKanbanStatusMessage(
            error instanceof Error ? error.message : 'Nao foi possivel carregar a task',
          )
        }
      })
      .finally(() => {
        if (!shouldIgnoreResult) {
          setIsTaskDetailLoading(false)
        }
      })

    return () => {
      shouldIgnoreResult = true
    }
  }, [session?.token, currentRoute, kanbanBoard])

  const resetWorkspaceData = useCallback(() => {
    setCompanyWorkspace(null)
    setCompanyMembers([])
    setPlatformCompanies([])
    setKanbanBoard(null)
    setSelectedTaskDetail(null)
    setKanbanStatusMessage('')
  }, [])

  return {
    companyWorkspace,
    companyMembers,
    isAdminCompaniesLoading,
    isCompanyLoading,
    isKanbanLoading,
    isTaskDetailLoading,
    kanbanBoard,
    kanbanStatusMessage,
    platformCompanies,
    selectedTaskDetail,
    resetWorkspaceData,
    setIsTaskDetailLoading,
    setCompanyWorkspace,
    setKanbanBoard,
    setKanbanStatusMessage,
    setSelectedTaskDetail,
  }
}

function findWorkspaceBoardByKeys(
  workspace: CompanyWorkspace | null,
  departmentKey: string,
  boardKey: string,
) {
  const normalizedDepartmentKey = departmentKey.toUpperCase()
  const normalizedBoardKey = boardKey.toUpperCase()

  for (const department of workspace?.departments ?? []) {
    if (department.key.toUpperCase() !== normalizedDepartmentKey) {
      continue
    }

    const board = department.boards.find(
      (workspaceBoard) => workspaceBoard.key.toUpperCase() === normalizedBoardKey,
    )

    if (board) {
      return {
        board,
        department,
      }
    }
  }

  return null
}

function findTaskIdByFriendlyId(board: KanbanBoard | null, taskFriendlyId: string) {
  const normalizedTaskFriendlyId = taskFriendlyId.toUpperCase()

  return (
    board?.columns
      .flatMap((column) => column.tasks)
      .find((task) => task.friendlyId.toUpperCase() === normalizedTaskFriendlyId)?.id ?? null
  )
}
