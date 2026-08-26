import type {
  AuthSession,
  BoardPayload,
  ColumnPayload,
  CompanyMember,
  CompanyPayload,
  CompanyRole,
  CompanyTheme,
  CompanyWorkspace,
  CreateCompanyMemberPayload,
  CreateTaskPayload,
  DepartmentPayload,
  KanbanBoard,
  KanbanTaskActivity,
  KanbanTaskAttachment,
  KanbanTaskCard,
  KanbanTaskComment,
  KanbanTaskDetail,
  KanbanTaskWatcher,
  MoveTaskPayload,
  PlatformCompanySummary,
  ReorderColumnPayload,
  UpdateCompanyMemberPayload,
  UpdateTaskPayload,
  UpdateTaskResponse,
} from './api.js'
import type { CompanyPermission } from './permissions.js'

const demoStorageKey = 'taskboard.demo.state.v1'
const demoPassword = 'Demo@123456'

const allPermissions: CompanyPermission[] = [
  'ManageWorkspace',
  'DeleteBoard',
  'ManageColumns',
  'CreateTask',
  'EditTask',
  'MoveTask',
  'CommentTask',
  'ManageTaskWatchers',
  'ManageTaskAttachments',
]

const memberPermissions: CompanyPermission[] = [
  'CreateTask',
  'EditTask',
  'MoveTask',
  'CommentTask',
  'ManageTaskWatchers',
  'ManageTaskAttachments',
]

interface DemoUser extends CompanyMember {
  password: string
}

interface DemoBoardState {
  board: KanbanBoard
  details: Record<string, KanbanTaskDetail>
  comments: Record<string, KanbanTaskComment[]>
  activities: Record<string, KanbanTaskActivity[]>
  attachments: Record<string, KanbanTaskAttachment[]>
  attachmentContents: Record<string, string>
  watchers: Record<string, KanbanTaskWatcher[]>
  nextTaskNumber: number
}

interface DemoState {
  workspace: CompanyWorkspace
  members: DemoUser[]
  boards: Record<string, DemoBoardState>
  createdAt: string
}

export function createDemoSession(userId = 'user-demo-owner'): AuthSession {
  const state = loadState()
  const user = state.members.find((member) => member.id === userId) ?? state.members[0]

  if (!user) {
    throw new Error('A demo não possui usuários configurados')
  }

  return mapSession(state, user)
}

export function resetDemoData() {
  localStorage.removeItem(demoStorageKey)
}

export async function handleDemoRequest<ResponseBody>(
  path: string,
  init: RequestInit,
): Promise<ResponseBody> {
  await new Promise((resolve) => window.setTimeout(resolve, 80))

  const state = loadState()
  const method = init.method ?? 'GET'
  const payload = readPayload(init)
  const currentUser = getCurrentUser(state, init)

  if (path === '/auth/login' && method === 'POST') {
    const credentials = payload as { email?: string; password?: string }
    const user = state.members.find(
      (member) => member.email.toLowerCase() === credentials.email?.trim().toLowerCase(),
    )

    if (!user || !user.isActive || user.password !== credentials.password) {
      throw new Error('Email ou senha inválidos')
    }

    return clone(mapSession(state, user)) as ResponseBody
  }

  if (path === '/auth/register' && method === 'POST') {
    throw new Error('A criação de contas está desabilitada na versão de demonstração')
  }

  if (path === '/auth/me' && method === 'GET') {
    const { token: _token, ...session } = mapSession(state, currentUser)
    return clone(session) as ResponseBody
  }

  if (path === '/companies/current' && method === 'GET') {
    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  if (path === '/companies/current' && method === 'PATCH') {
    const company = payload as CompanyPayload
    state.workspace.name = company.name
    state.workspace.slug = company.slug
    state.workspace.theme = company.theme ?? state.workspace.theme
    saveState(state)
    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  if (path === '/companies/current/members' && method === 'GET') {
    return clone(publicMembers(state)) as ResponseBody
  }

  if (path === '/companies/current/members' && method === 'POST') {
    const memberPayload = payload as CreateCompanyMemberPayload

    if (state.members.some((member) => member.email === memberPayload.email.toLowerCase())) {
      throw new Error('Este email já pertence a um membro da empresa')
    }

    state.members.push({
      id: createId('user'),
      name: memberPayload.name,
      email: memberPayload.email.toLowerCase(),
      password: memberPayload.password,
      role: memberPayload.role,
      isActive: true,
    })
    saveState(state)
    return clone(publicMembers(state)) as ResponseBody
  }

  const memberRoleMatch = path.match(/^\/companies\/current\/members\/([^/]+)$/)
  if (memberRoleMatch && method === 'PATCH') {
    const member = findMember(state, matchValue(memberRoleMatch, 1))
    member.role = (payload as UpdateCompanyMemberPayload).role
    saveState(state)
    return clone(publicMembers(state)) as ResponseBody
  }

  const memberStatusMatch = path.match(/^\/companies\/current\/members\/([^/]+)\/status$/)
  if (memberStatusMatch && method === 'PATCH') {
    const member = findMember(state, matchValue(memberStatusMatch, 1))

    if (member.id === currentUser.id) {
      throw new Error('Você não pode alterar o status do próprio usuário')
    }

    member.isActive = Boolean((payload as { isActive?: boolean }).isActive)
    saveState(state)
    return clone(publicMembers(state)) as ResponseBody
  }

  if (path === '/admin/companies' && method === 'GET') {
    const summary: PlatformCompanySummary = {
      id: state.workspace.id,
      name: state.workspace.name,
      memberCount: state.members.length,
      departmentCount: state.workspace.departments.length,
      boardCount: state.workspace.departments.reduce(
        (count, department) => count + department.boards.length,
        0,
      ),
      createdAt: state.createdAt,
    }
    return clone([summary]) as ResponseBody
  }

  const companyBySlugMatch = path.match(/^\/companies\/by-slug\/([^/]+)$/)
  const companyByIdMatch = path.match(/^\/companies\/([^/]+)$/)
  if ((companyBySlugMatch || companyByIdMatch) && method === 'GET') {
    const identity = companyBySlugMatch?.[1] ?? companyByIdMatch?.[1]

    if (identity !== state.workspace.slug && identity !== state.workspace.id) {
      throw new Error('Empresa não encontrada nesta demonstração')
    }

    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  if (path === '/companies/current/departments' && method === 'POST') {
    const departmentPayload = payload as DepartmentPayload
    state.workspace.departments.push({
      id: createId('department'),
      key: createKey(departmentPayload.name),
      name: departmentPayload.name,
      boards: [],
    })
    saveState(state)
    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  const departmentMatch = path.match(/^\/companies\/current\/departments\/([^/]+)$/)
  if (departmentMatch && method === 'PATCH') {
    const department = findDepartment(state, matchValue(departmentMatch, 1))
    department.name = (payload as DepartmentPayload).name
    saveState(state)
    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  if (departmentMatch && method === 'DELETE') {
    state.workspace.departments = state.workspace.departments.filter(
      (department) => department.id !== matchValue(departmentMatch, 1),
    )
    saveState(state)
    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  const createBoardMatch = path.match(/^\/companies\/current\/departments\/([^/]+)\/boards$/)
  if (createBoardMatch && method === 'POST') {
    const department = findDepartment(state, matchValue(createBoardMatch, 1))
    const boardPayload = payload as BoardPayload
    const boardId = createId('board')
    const boardKey = createKey(boardPayload.name)
    department.boards.push({
      id: boardId,
      key: boardKey,
      name: boardPayload.name,
      description: boardPayload.description || null,
    })
    state.boards[boardId] = createEmptyBoard(
      boardId,
      state.workspace.slug,
      department.key,
      boardKey,
      boardPayload.name,
      boardPayload.description || null,
    )
    saveState(state)
    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  const companyBoardMatch = path.match(/^\/companies\/current\/boards\/([^/]+)$/)
  if (companyBoardMatch && method === 'PATCH') {
    const boardState = findBoard(state, matchValue(companyBoardMatch, 1))
    const boardPayload = payload as BoardPayload
    boardState.board.name = boardPayload.name
    boardState.board.description = boardPayload.description || null
    const workspaceBoard = findWorkspaceBoard(state, matchValue(companyBoardMatch, 1))
    workspaceBoard.name = boardPayload.name
    workspaceBoard.description = boardPayload.description || null
    saveState(state)
    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  if (companyBoardMatch && method === 'DELETE') {
    for (const department of state.workspace.departments) {
      department.boards = department.boards.filter(
        (board) => board.id !== matchValue(companyBoardMatch, 1),
      )
    }
    delete state.boards[matchValue(companyBoardMatch, 1)]
    saveState(state)
    return clone(workspaceForUser(state, currentUser)) as ResponseBody
  }

  if (path === '/boards/current/kanban' && method === 'GET') {
    const firstBoard = Object.values(state.boards)[0]
    if (!firstBoard) throw new Error('Nenhum quadro disponível')
    return clone(firstBoard.board) as ResponseBody
  }

  const kanbanMatch = path.match(/^\/companies\/([^/]+)\/boards\/([^/]+)\/kanban$/)
  if (kanbanMatch && method === 'GET') {
    return clone(findBoard(state, matchValue(kanbanMatch, 2)).board) as ResponseBody
  }

  const taskCollectionMatch = path.match(/^\/companies\/([^/]+)\/boards\/([^/]+)\/tasks$/)
  if (taskCollectionMatch && method === 'POST') {
    const boardState = findBoard(state, matchValue(taskCollectionMatch, 2))
    const taskPayload = payload as CreateTaskPayload
    const targetColumn = boardState.board.columns.find(
      (column) => column.id === taskPayload.columnId,
    )
    if (!targetColumn) throw new Error('Status da task não encontrado')
    const assignee = taskPayload.assigneeId
      ? findMember(state, taskPayload.assigneeId)
      : currentUser
    const taskId = createId('task')
    const timestamp = new Date().toISOString()
    const friendlyId = `${boardState.board.key}-${boardState.nextTaskNumber}`
    boardState.nextTaskNumber += 1
    const card: KanbanTaskCard = {
      id: taskId,
      friendlyId,
      title: taskPayload.title,
      priority: taskPayload.priority ?? 'MEDIUM',
      assigneeName: assignee.name,
    }
    targetColumn.tasks.push(card)
    boardState.details[taskId] = {
      ...card,
      description: taskPayload.description || null,
      companySlug: state.workspace.slug,
      departmentKey: boardState.board.departmentKey,
      boardKey: boardState.board.key,
      boardName: boardState.board.name,
      columnId: targetColumn.id,
      columnName: targetColumn.name,
      assigneeId: assignee.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    addActivity(boardState, taskId, currentUser.name, 'CREATED', { title: card.title })
    saveState(state)
    return clone(boardState.board) as ResponseBody
  }

  const taskMatch = path.match(/^\/tasks\/([^/]+)$/)
  if (taskMatch && method === 'GET') {
    return clone(findTask(state, matchValue(taskMatch, 1)).detail) as ResponseBody
  }

  if (taskMatch && method === 'PATCH') {
    const taskId = matchValue(taskMatch, 1)
    const taskContext = findTask(state, taskId)
    const taskPayload = payload as UpdateTaskPayload
    const previous = { ...taskContext.detail }
    const assignee = taskPayload.assigneeId ? findMember(state, taskPayload.assigneeId) : null
    Object.assign(taskContext.detail, {
      title: taskPayload.title,
      description: taskPayload.description || null,
      priority: taskPayload.priority,
      assigneeId: assignee?.id ?? null,
      assigneeName: assignee?.name ?? null,
      updatedAt: new Date().toISOString(),
    })
    Object.assign(taskContext.card, {
      title: taskPayload.title,
      priority: taskPayload.priority,
      assigneeName: assignee?.name ?? null,
    })
    if (previous.title !== taskPayload.title) {
      addActivity(taskContext.boardState, taskId, currentUser.name, 'TITLE_CHANGED', {
        from: previous.title,
        to: taskPayload.title,
      })
    }
    if (previous.assigneeId !== taskPayload.assigneeId) {
      addActivity(taskContext.boardState, taskId, currentUser.name, 'ASSIGNEE_CHANGED', {
        fromAssignee: previous.assigneeName,
        toAssignee: assignee?.name ?? null,
      })
    }
    saveState(state)
    const response: UpdateTaskResponse = {
      board: taskContext.boardState.board,
      task: taskContext.detail,
    }
    return clone(response) as ResponseBody
  }

  const moveTaskMatch = path.match(/^\/tasks\/([^/]+)\/move$/)
  if (moveTaskMatch && method === 'PATCH') {
    const taskId = matchValue(moveTaskMatch, 1)
    const taskContext = findTask(state, taskId)
    const movePayload = payload as MoveTaskPayload
    const targetColumn = taskContext.boardState.board.columns.find(
      (column) => column.id === movePayload.columnId,
    )
    if (!targetColumn) throw new Error('Status de destino não encontrado')
    for (const column of taskContext.boardState.board.columns) {
      column.tasks = column.tasks.filter((task) => task.id !== taskId)
    }
    targetColumn.tasks.splice(Math.max(0, movePayload.position - 1), 0, taskContext.card)
    const previousColumn = taskContext.detail.columnName
    taskContext.detail.columnId = targetColumn.id
    taskContext.detail.columnName = targetColumn.name
    taskContext.detail.updatedAt = new Date().toISOString()
    addActivity(taskContext.boardState, taskId, currentUser.name, 'MOVED', {
      fromColumn: previousColumn,
      toColumn: targetColumn.name,
    })
    saveState(state)
    return clone(taskContext.boardState.board) as ResponseBody
  }

  const commentsMatch = path.match(/^\/tasks\/([^/]+)\/comments$/)
  if (commentsMatch && method === 'GET') {
    const taskId = matchValue(commentsMatch, 1)
    return clone(findTask(state, taskId).boardState.comments[taskId] ?? []) as ResponseBody
  }
  if (commentsMatch && method === 'POST') {
    const taskId = matchValue(commentsMatch, 1)
    const taskContext = findTask(state, taskId)
    const comment: KanbanTaskComment = {
      id: createId('comment'),
      content: String((payload as { content?: string }).content ?? ''),
      authorName: currentUser.name,
      createdAt: new Date().toISOString(),
    }
    const comments = taskContext.boardState.comments[taskId] ?? []
    comments.push(comment)
    taskContext.boardState.comments[taskId] = comments
    addActivity(taskContext.boardState, taskId, currentUser.name, 'COMMENTED', {})
    saveState(state)
    return clone(comment) as ResponseBody
  }

  const activitiesMatch = path.match(/^\/tasks\/([^/]+)\/activities$/)
  if (activitiesMatch && method === 'GET') {
    const taskId = matchValue(activitiesMatch, 1)
    return clone(findTask(state, taskId).boardState.activities[taskId] ?? []) as ResponseBody
  }

  const attachmentsMatch = path.match(/^\/tasks\/([^/]+)\/attachments$/)
  if (attachmentsMatch && method === 'GET') {
    const taskId = matchValue(attachmentsMatch, 1)
    return clone(findTask(state, taskId).boardState.attachments[taskId] ?? []) as ResponseBody
  }
  if (attachmentsMatch && method === 'POST') {
    const taskId = matchValue(attachmentsMatch, 1)
    const taskContext = findTask(state, taskId)
    const attachmentPayload = payload as {
      fileName: string
      contentType: string
      contentBase64: string
    }
    const attachment: KanbanTaskAttachment = {
      id: createId('attachment'),
      fileName: attachmentPayload.fileName,
      contentType: attachmentPayload.contentType,
      sizeBytes: Math.floor((attachmentPayload.contentBase64.length * 3) / 4),
      uploaderName: currentUser.name,
      createdAt: new Date().toISOString(),
    }
    const attachments = taskContext.boardState.attachments[taskId] ?? []
    attachments.push(attachment)
    taskContext.boardState.attachments[taskId] = attachments
    taskContext.boardState.attachmentContents[attachment.id] = attachmentPayload.contentBase64
    addActivity(taskContext.boardState, taskId, currentUser.name, 'ATTACHMENT_ADDED', {
      fileName: attachment.fileName,
    })
    saveState(state)
    return clone(attachment) as ResponseBody
  }

  const deleteAttachmentMatch = path.match(/^\/tasks\/([^/]+)\/attachments\/([^/]+)$/)
  if (deleteAttachmentMatch && method === 'DELETE') {
    const taskId = matchValue(deleteAttachmentMatch, 1)
    const attachmentId = matchValue(deleteAttachmentMatch, 2)
    const taskContext = findTask(state, taskId)
    const attachments = taskContext.boardState.attachments[taskId] ?? []
    const attachment = attachments.find((candidate) => candidate.id === attachmentId)
    taskContext.boardState.attachments[taskId] = attachments.filter(
      (candidate) => candidate.id !== attachmentId,
    )
    delete taskContext.boardState.attachmentContents[attachmentId]
    addActivity(taskContext.boardState, taskId, currentUser.name, 'ATTACHMENT_REMOVED', {
      fileName: attachment?.fileName ?? null,
    })
    saveState(state)
    return clone(taskContext.boardState.attachments[taskId]) as ResponseBody
  }

  const watchersMatch = path.match(/^\/tasks\/([^/]+)\/watchers(?:\/([^/]+))?$/)
  if (watchersMatch && method === 'GET') {
    const taskId = matchValue(watchersMatch, 1)
    return clone(findTask(state, taskId).boardState.watchers[taskId] ?? []) as ResponseBody
  }
  if (watchersMatch && method === 'POST') {
    const taskId = matchValue(watchersMatch, 1)
    const taskContext = findTask(state, taskId)
    const member = findMember(state, String((payload as { userId?: string }).userId))
    const watchers = taskContext.boardState.watchers[taskId] ?? []
    taskContext.boardState.watchers[taskId] = watchers
    if (!watchers.some((watcher) => watcher.userId === member.id)) {
      watchers.push({
        userId: member.id,
        name: member.name,
        email: member.email,
        createdAt: new Date().toISOString(),
      })
      addActivity(taskContext.boardState, taskId, currentUser.name, 'WATCHER_ADDED', {
        watcherName: member.name,
      })
      saveState(state)
    }
    return clone(watchers) as ResponseBody
  }
  if (watchersMatch?.[2] && method === 'DELETE') {
    const taskId = matchValue(watchersMatch, 1)
    const watcherId = matchValue(watchersMatch, 2)
    const taskContext = findTask(state, taskId)
    const member = findMember(state, watcherId)
    taskContext.boardState.watchers[taskId] = (
      taskContext.boardState.watchers[taskId] ?? []
    ).filter((watcher) => watcher.userId !== watcherId)
    addActivity(taskContext.boardState, taskId, currentUser.name, 'WATCHER_REMOVED', {
      watcherName: member.name,
    })
    saveState(state)
    return clone(taskContext.boardState.watchers[taskId]) as ResponseBody
  }

  const createColumnMatch = path.match(/^\/companies\/([^/]+)\/boards\/([^/]+)\/columns$/)
  if (createColumnMatch && method === 'POST') {
    const boardState = findBoard(state, matchValue(createColumnMatch, 2))
    const columnPayload = payload as ColumnPayload
    boardState.board.columns.push({
      id: createId('column'),
      name: columnPayload.name,
      position: columnPayload.position ?? boardState.board.columns.length + 1,
      tasks: [],
    })
    normalizeColumnPositions(boardState.board)
    saveState(state)
    return clone(boardState.board) as ResponseBody
  }

  const columnMatch = path.match(
    /^\/companies\/([^/]+)\/boards\/([^/]+)\/columns\/([^/]+)(?:\/(reorder))?$/,
  )
  if (columnMatch && method === 'PATCH' && columnMatch[4] !== 'reorder') {
    const boardState = findBoard(state, matchValue(columnMatch, 2))
    const column = findColumn(boardState, matchValue(columnMatch, 3))
    column.name = (payload as ColumnPayload).name
    for (const detail of Object.values(boardState.details)) {
      if (detail.columnId === column.id) detail.columnName = column.name
    }
    saveState(state)
    return clone(boardState.board) as ResponseBody
  }
  if (columnMatch && method === 'PATCH' && columnMatch[4] === 'reorder') {
    const boardState = findBoard(state, matchValue(columnMatch, 2))
    const columnId = matchValue(columnMatch, 3)
    const columnIndex = boardState.board.columns.findIndex((column) => column.id === columnId)
    const [column] = boardState.board.columns.splice(columnIndex, 1)
    if (!column) throw new Error('Status não encontrado')
    const position = (payload as ReorderColumnPayload).position
    boardState.board.columns.splice(Math.max(0, position - 1), 0, column)
    normalizeColumnPositions(boardState.board)
    saveState(state)
    return clone(boardState.board) as ResponseBody
  }
  if (columnMatch && method === 'DELETE') {
    const boardState = findBoard(state, matchValue(columnMatch, 2))
    const column = findColumn(boardState, matchValue(columnMatch, 3))
    if (column.tasks.length > 0) throw new Error('Apenas status vazios podem ser removidos')
    boardState.board.columns = boardState.board.columns.filter(
      (candidate) => candidate.id !== column.id,
    )
    normalizeColumnPositions(boardState.board)
    saveState(state)
    return clone(boardState.board) as ResponseBody
  }

  throw new Error(`Operação não disponível na demo: ${method} ${path}`)
}

export function downloadDemoAttachment(taskId: string, attachmentId: string, fileName: string) {
  const taskContext = findTask(loadState(), taskId)
  const attachment = (taskContext.boardState.attachments[taskId] ?? []).find(
    (candidate) => candidate.id === attachmentId,
  )
  const content = taskContext.boardState.attachmentContents[attachmentId]

  if (!attachment || !content) throw new Error('Anexo não encontrado')

  const bytes = Uint8Array.from(atob(content), (character) => character.charCodeAt(0))
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: attachment.contentType }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(objectUrl)
}

function loadState(): DemoState {
  const storedState = localStorage.getItem(demoStorageKey)
  if (storedState) {
    try {
      return JSON.parse(storedState) as DemoState
    } catch {
      localStorage.removeItem(demoStorageKey)
    }
  }

  const state = createInitialState()
  saveState(state)
  return state
}

function saveState(state: DemoState) {
  localStorage.setItem(demoStorageKey, JSON.stringify(state))
}

function createInitialState(): DemoState {
  const createdAt = '2026-01-10T12:00:00.000Z'
  const theme: CompanyTheme = {
    primaryColor: '#102a43',
    secondaryColor: '#243b53',
    accentColor: '#2563eb',
    boardBackgroundColor: '#dbeafe',
  }
  const members: DemoUser[] = [
    createUser('user-demo-owner', 'Adriana Costa', 'demo@taskboard.local', 'OWNER'),
    createUser('user-demo-admin', 'Bruno Lima', 'admin@taskboard.local', 'ADMIN'),
    createUser('user-demo-manager', 'Carla Mendes', 'gestor@taskboard.local', 'MEMBER'),
    createUser('user-demo-member-1', 'Diego Rocha', 'diego@taskboard.local', 'MEMBER'),
    createUser('user-demo-member-2', 'Elisa Alves', 'elisa@taskboard.local', 'MEMBER'),
  ]

  const productBoard = createSeedBoard(
    'board-product',
    'adri-corp',
    'PROD',
    'ROADMAP',
    'Roadmap do Produto',
    'Planejamento e evolução da plataforma TaskBoard',
    createdAt,
    members,
  )
  const operationsBoard = createEmptyBoard(
    'board-operations',
    'adri-corp',
    'OPS',
    'OPS',
    'Operações Internas',
    'Rotinas e melhorias operacionais',
  )

  return {
    createdAt,
    members,
    workspace: {
      id: 'company-demo',
      name: 'Adri Corp',
      slug: 'adri-corp',
      theme,
      role: 'OWNER',
      permissions: allPermissions,
      departments: [
        {
          id: 'department-product',
          key: 'PROD',
          name: 'Produto e Tecnologia',
          boards: [workspaceBoard(productBoard.board)],
        },
        {
          id: 'department-operations',
          key: 'OPS',
          name: 'Operações',
          boards: [workspaceBoard(operationsBoard.board)],
        },
      ],
    },
    boards: {
      [productBoard.board.id]: productBoard,
      [operationsBoard.board.id]: operationsBoard,
    },
  }
}

function createSeedBoard(
  id: string,
  companySlug: string,
  departmentKey: string,
  key: string,
  name: string,
  description: string,
  createdAt: string,
  members: DemoUser[],
): DemoBoardState {
  const boardState = createEmptyBoard(id, companySlug, departmentKey, key, name, description)
  const taskSeeds = [
    [
      'task-1',
      'ROADMAP-1',
      'Apresentar o TaskBoard no portfólio',
      'HIGH',
      'column-progress',
      members[0],
    ],
    [
      'task-2',
      'ROADMAP-2',
      'Criar visão de métricas do produto',
      'MEDIUM',
      'column-backlog',
      members[2],
    ],
    [
      'task-3',
      'ROADMAP-3',
      'Revisar experiência em dispositivos móveis',
      'URGENT',
      'column-review',
      members[1],
    ],
    [
      'task-4',
      'ROADMAP-4',
      'Configurar identidade visual da empresa',
      'LOW',
      'column-done',
      members[3],
    ],
    ['task-5', 'ROADMAP-5', 'Documentar fluxo de permissões', 'MEDIUM', 'column-done', members[4]],
  ] as const

  for (const [taskId, friendlyId, title, priority, columnId, assignee] of taskSeeds) {
    if (!assignee) continue
    const column = findColumn(boardState, columnId)
    const card: KanbanTaskCard = {
      id: taskId,
      friendlyId,
      title,
      priority,
      assigneeName: assignee.name,
    }
    column.tasks.push(card)
    boardState.details[taskId] = {
      ...card,
      description: `Cenário demonstrativo: ${title.toLowerCase()}.`,
      companySlug,
      departmentKey,
      boardKey: key,
      boardName: name,
      columnId,
      columnName: column.name,
      assigneeId: assignee.id,
      createdAt,
      updatedAt: createdAt,
    }
    boardState.activities[taskId] = [
      {
        id: `activity-${taskId}`,
        type: 'CREATED',
        actorName: members[0]?.name ?? 'Usuário Demo',
        metadata: { title },
        createdAt,
      },
    ]
    boardState.comments[taskId] = []
    boardState.attachments[taskId] = []
    boardState.watchers[taskId] = []
  }

  boardState.comments['task-1'] = [
    {
      id: 'comment-demo-1',
      content: 'A demo já está pronta para receber visitantes do portfólio.',
      authorName: 'Bruno Lima',
      createdAt: '2026-01-11T14:30:00.000Z',
    },
  ]
  boardState.watchers['task-1'] = [
    {
      userId: 'user-demo-manager',
      name: 'Carla Mendes',
      email: 'gestor@taskboard.local',
      createdAt,
    },
  ]
  boardState.nextTaskNumber = 6
  return boardState
}

function createEmptyBoard(
  id: string,
  companySlug: string,
  departmentKey: string,
  key: string,
  name: string,
  description: string | null,
): DemoBoardState {
  return {
    board: {
      id,
      companySlug,
      departmentKey,
      key,
      name,
      description,
      columns: [
        {
          id: id === 'board-product' ? 'column-backlog' : `${id}-backlog`,
          name: 'Backlog',
          position: 1,
          tasks: [],
        },
        {
          id: id === 'board-product' ? 'column-progress' : `${id}-progress`,
          name: 'Em andamento',
          position: 2,
          tasks: [],
        },
        {
          id: id === 'board-product' ? 'column-review' : `${id}-review`,
          name: 'Em revisão',
          position: 3,
          tasks: [],
        },
        {
          id: id === 'board-product' ? 'column-done' : `${id}-done`,
          name: 'Concluído',
          position: 4,
          tasks: [],
        },
      ],
    },
    details: {},
    comments: {},
    activities: {},
    attachments: {},
    attachmentContents: {},
    watchers: {},
    nextTaskNumber: 1,
  }
}

function createUser(id: string, name: string, email: string, role: CompanyRole): DemoUser {
  return { id, name, email, role, isActive: true, password: demoPassword }
}

function mapSession(state: DemoState, user: DemoUser): AuthSession {
  return {
    user: { id: user.id, name: user.name, email: user.email },
    company: {
      id: state.workspace.id,
      name: state.workspace.name,
      slug: state.workspace.slug,
      theme: state.workspace.theme,
      role: user.role,
      permissions: user.role === 'MEMBER' ? memberPermissions : allPermissions,
    },
    isPlatformAdmin: user.role === 'OWNER',
    token: `demo-token:${user.id}`,
  }
}

function workspaceForUser(state: DemoState, user: DemoUser): CompanyWorkspace {
  return {
    ...state.workspace,
    role: user.role,
    permissions: user.role === 'MEMBER' ? memberPermissions : allPermissions,
  }
}

function getCurrentUser(state: DemoState, init: RequestInit) {
  const headers = new Headers(init.headers)
  const userId = headers.get('Authorization')?.replace('Bearer demo-token:', '')
  const user = state.members.find((member) => member.id === userId) ?? state.members[0]
  if (!user?.isActive) throw new Error('Sessão inválida ou usuário inativo')
  return user
}

function readPayload(init: RequestInit): unknown {
  return typeof init.body === 'string' && init.body ? JSON.parse(init.body) : {}
}

function publicMembers(state: DemoState): CompanyMember[] {
  return state.members.map(({ password: _password, ...member }) => member)
}

function findMember(state: DemoState, userId: string) {
  const member = state.members.find((candidate) => candidate.id === userId)
  if (!member) throw new Error('Membro não encontrado')
  return member
}

function findDepartment(state: DemoState, departmentId: string) {
  const department = state.workspace.departments.find((candidate) => candidate.id === departmentId)
  if (!department) throw new Error('Departamento não encontrado')
  return department
}

function findWorkspaceBoard(state: DemoState, boardId: string) {
  for (const department of state.workspace.departments) {
    const board = department.boards.find((candidate) => candidate.id === boardId)
    if (board) return board
  }
  throw new Error('Quadro não encontrado')
}

function findBoard(state: DemoState, boardId: string) {
  const boardState = state.boards[boardId]
  if (!boardState) throw new Error('Quadro não encontrado')
  return boardState
}

function findColumn(boardState: DemoBoardState, columnId: string) {
  const column = boardState.board.columns.find((candidate) => candidate.id === columnId)
  if (!column) throw new Error('Status não encontrado')
  return column
}

function findTask(state: DemoState, taskId: string) {
  for (const boardState of Object.values(state.boards)) {
    const detail = boardState.details[taskId]
    if (!detail) continue
    const card = boardState.board.columns
      .flatMap((column) => column.tasks)
      .find((candidate) => candidate.id === taskId)
    if (!card) throw new Error('Card da task não encontrado')
    return { boardState, detail, card }
  }
  throw new Error('Task não encontrada')
}

function addActivity(
  boardState: DemoBoardState,
  taskId: string,
  actorName: string,
  type: KanbanTaskActivity['type'],
  metadata: Record<string, string | null>,
) {
  const activities = boardState.activities[taskId] ?? []
  activities.push({
    id: createId('activity'),
    type,
    actorName,
    metadata,
    createdAt: new Date().toISOString(),
  })
  boardState.activities[taskId] = activities
}

function normalizeColumnPositions(board: KanbanBoard) {
  board.columns.forEach((column, index) => {
    column.position = index + 1
  })
}

function workspaceBoard(board: KanbanBoard) {
  return {
    id: board.id,
    key: board.key,
    name: board.name,
    description: board.description,
  }
}

function createKey(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-zA-Z0-9]+/g, '')
      .slice(0, 8)
      .toUpperCase() || 'ITEM'
  )
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function matchValue(match: RegExpMatchArray, index: number) {
  const value = match[index]
  if (!value) throw new Error('Rota inválida na demonstração')
  return value
}

function clone<Value>(value: Value): Value {
  return structuredClone(value)
}
