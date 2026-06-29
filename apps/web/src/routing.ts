export type AppRoute =
  | {
      type: 'adminCompanies'
    }
  | {
      type: 'company'
      companyId: string
    }
  | {
      type: 'board'
      companyId: string
      boardId: string
    }
  | {
      type: 'task'
      companyId: string
      boardId: string
      taskId: string
    }
  | {
      type: 'home'
    }
  | {
      type: 'profile'
    }

export function parseAppRoute(pathname: string): AppRoute {
  const pathSegments = pathname.split('/').filter(Boolean)

  if (pathSegments[0] === 'admin' && pathSegments[1] === 'companies') {
    return {
      type: 'adminCompanies',
    }
  }

  if (pathSegments[0] === 'companies' && pathSegments[1]) {
    if (pathSegments[2] === 'boards' && pathSegments[3]) {
      if (pathSegments[4] === 'tasks' && pathSegments[5]) {
        return {
          type: 'task',
          companyId: pathSegments[1],
          boardId: pathSegments[3],
          taskId: pathSegments[5],
        }
      }

      return {
        type: 'board',
        companyId: pathSegments[1],
        boardId: pathSegments[3],
      }
    }

    return {
      type: 'company',
      companyId: pathSegments[1],
    }
  }

  if (pathSegments[0] === 'profile') {
    return {
      type: 'profile',
    }
  }

  return {
    type: 'home',
  }
}

export function createCompanyPath(companyId: string) {
  return `/companies/${companyId}`
}

export function createBoardPath(companyId: string, boardId: string) {
  return `/companies/${companyId}/boards/${boardId}`
}

export function createTaskPath(companyId: string, boardId: string, taskId: string) {
  return `${createBoardPath(companyId, boardId)}/tasks/${taskId}`
}
