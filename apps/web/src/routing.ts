export type AppRoute =
  | {
      type: 'adminCompanies'
    }
  | {
      type: 'company'
      companyId: string
    }
  | {
      type: 'companySlug'
      companySlug: string
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
      type: 'friendlyBoard'
      companySlug: string
      departmentKey: string
      boardKey: string
    }
  | {
      type: 'friendlyTask'
      companySlug: string
      departmentKey: string
      boardKey: string
      taskFriendlyId: string
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

  const firstSegment = pathSegments[0]
  const secondSegment = pathSegments[1]
  const thirdSegment = pathSegments[2]
  const fourthSegment = pathSegments[3]

  if (pathSegments.length === 1 && isRouteKey(firstSegment)) {
    return {
      type: 'companySlug',
      companySlug: firstSegment,
    }
  }

  if (
    pathSegments.length === 3 &&
    isRouteKey(firstSegment) &&
    isRouteKey(secondSegment) &&
    isRouteKey(thirdSegment)
  ) {
    return {
      type: 'friendlyBoard',
      companySlug: firstSegment,
      departmentKey: secondSegment,
      boardKey: thirdSegment,
    }
  }

  if (
    pathSegments.length === 4 &&
    isRouteKey(firstSegment) &&
    isRouteKey(secondSegment) &&
    isRouteKey(thirdSegment) &&
    isRouteKey(fourthSegment)
  ) {
    return {
      type: 'friendlyTask',
      companySlug: firstSegment,
      departmentKey: secondSegment,
      boardKey: thirdSegment,
      taskFriendlyId: fourthSegment,
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

export function createCompanySlugPath(companySlug: string) {
  return `/${companySlug}`
}

export function createFriendlyBoardPath(
  companySlug: string,
  departmentKey: string,
  boardKey: string,
) {
  return `/${companySlug}/${departmentKey}/${boardKey}`
}

export function createFriendlyTaskPath(
  companySlug: string,
  departmentKey: string,
  boardKey: string,
  taskFriendlyId: string,
) {
  return `${createFriendlyBoardPath(companySlug, departmentKey, boardKey)}/${taskFriendlyId}`
}

function isRouteKey(value: string | undefined): value is string {
  return Boolean(value && /^[a-zA-Z0-9-]+$/.test(value))
}
