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
import { type AppRoute, createBoardPath } from '../routing.js'

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

    const boardRequest =
      currentRoute.type === 'board' || currentRoute.type === 'task'
        ? getCompanyKanbanBoard(session.token, currentRoute.companyId, currentRoute.boardId)
        : getCurrentKanbanBoard(session.token)

    boardRequest
      .then((board) => {
        if (shouldIgnoreResult) {
          return
        }

        setKanbanBoard(board)

        if (currentRoute.type === 'home') {
          navigateTo(createBoardPath(session.company.id, board.id), {
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
  }, [session?.token, session?.company.id, currentRoute, navigateTo])

  useEffect(() => {
    if (!session?.token || currentRoute.type !== 'task') {
      setSelectedTaskDetail(null)
      setIsTaskDetailLoading(false)
      return
    }

    let shouldIgnoreResult = false

    setSelectedTaskDetail(null)
    setIsTaskDetailLoading(true)
    setKanbanStatusMessage('')

    getTaskDetail(session.token, currentRoute.taskId)
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
  }, [session?.token, currentRoute])

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
