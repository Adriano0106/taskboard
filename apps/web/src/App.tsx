import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  type AuthSession,
  type KanbanBoard,
  type KanbanColumn,
  type KanbanTaskCard,
  type KanbanTaskDetail,
  createColumn,
  createTask,
  deleteColumn,
  getCurrentKanbanBoard,
  getCurrentSession,
  getTaskDetail,
  login,
  moveTask,
  registerAccount,
  renameColumn,
  reorderColumn,
} from './api.js'

type AuthMode = 'login' | 'register'

interface TaskLocation {
  columnId: string
  position: number
}

interface TaskDragData {
  type: 'task'
  task: KanbanTaskCard
}

interface ColumnDragData {
  type: 'column'
  columnId: string
}

type DragData = TaskDragData | ColumnDragData

const sessionStorageKey = 'taskboard.session'

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard | null>(null)
  const [activeTask, setActiveTask] = useState<KanbanTaskCard | null>(null)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<KanbanTaskDetail | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isKanbanLoading, setIsKanbanLoading] = useState(false)
  const [isTaskDetailLoading, setIsTaskDetailLoading] = useState(false)
  const [isColumnOrganizerOpen, setIsColumnOrganizerOpen] = useState(false)
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null)
  const [reorderingColumnId, setReorderingColumnId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [kanbanStatusMessage, setKanbanStatusMessage] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  useEffect(() => {
    if (!session?.token) {
      return
    }

    getCurrentSession(session.token)
      .then((currentSession) => {
        const refreshedSession = {
          ...currentSession,
          token: session.token,
        }

        setSession(refreshedSession)
        localStorage.setItem(sessionStorageKey, JSON.stringify(refreshedSession))
      })
      .catch(() => {
        localStorage.removeItem(sessionStorageKey)
        setSession(null)
        setKanbanBoard(null)
      })
  }, [session?.token])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    setIsKanbanLoading(true)
    setKanbanStatusMessage('')

    getCurrentKanbanBoard(session.token)
      .then((board) => {
        setKanbanBoard(board)
      })
      .catch((error) => {
        setKanbanStatusMessage(
          error instanceof Error ? error.message : 'Nao foi possivel carregar o quadro',
        )
      })
      .finally(() => {
        setIsKanbanLoading(false)
      })
  }, [session?.token])

  const authModeLabels = useMemo(
    () => ({
      login: 'Entrar',
      register: 'Criar conta',
    }),
    [],
  )
  const canManageColumns = session ? ['OWNER', 'ADMIN'].includes(session.company.role) : false

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setIsSubmitting(true)
    setStatusMessage('')

    const formData = new FormData(formEvent.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      const nextSession =
        authMode === 'register'
          ? await registerAccount({
              name: String(formData.get('name') ?? ''),
              companyName: String(formData.get('companyName') ?? ''),
              email,
              password,
            })
          : await login({
              email,
              password,
            })

      localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession))
      setSession(nextSession)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(sessionStorageKey)
    setSession(null)
    setKanbanBoard(null)
    setSelectedTaskDetail(null)
    setStatusMessage('')
    setKanbanStatusMessage('')
  }

  async function handleCreateTask(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const firstColumn = kanbanBoard?.columns[0]

    if (!session?.token || !firstColumn) {
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
      const updatedBoard = await createTask(session.token, {
        columnId: firstColumn.id,
        title,
      })

      setKanbanBoard(updatedBoard)
      formEvent.currentTarget.reset()
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a task',
      )
    } finally {
      setCreatingTaskColumnId(null)
    }
  }

  async function handleCreateColumn(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!session?.token) {
      return
    }

    const formData = new FormData(formEvent.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setKanbanStatusMessage('')

    try {
      const updatedBoard = await createColumn(session.token, {
        name,
        position: (kanbanBoard?.columns.length ?? 0) + 1,
      })

      setKanbanBoard(updatedBoard)
      formEvent.currentTarget.reset()
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a coluna',
      )
    }
  }

  async function handleRenameColumn(formEvent: FormEvent<HTMLFormElement>, column: KanbanColumn) {
    formEvent.preventDefault()

    if (!session?.token) {
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
      const updatedBoard = await renameColumn(session.token, column.id, {
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

  async function handleDeleteColumn(column: KanbanColumn) {
    if (!session?.token) {
      return
    }

    setDeletingColumnId(column.id)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await deleteColumn(session.token, column.id)
      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover a coluna',
      )
    } finally {
      setDeletingColumnId(null)
    }
  }

  async function handleReorderColumn(columnId: string, position: number) {
    if (!session?.token) {
      return
    }

    setReorderingColumnId(columnId)
    setKanbanStatusMessage('')

    try {
      const updatedBoard = await reorderColumn(session.token, columnId, {
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

  async function handleOpenTask(taskId: string) {
    if (!session?.token) {
      return
    }

    setSelectedTaskDetail(null)
    setIsTaskDetailLoading(true)
    setKanbanStatusMessage('')

    try {
      const taskDetail = await getTaskDetail(session.token, taskId)
      setSelectedTaskDetail(taskDetail)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel carregar a task',
      )
    } finally {
      setIsTaskDetailLoading(false)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const dragData = event.active.data.current as DragData | undefined

    if (dragData?.type === 'task') {
      setActiveTask(dragData.task)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)

    if (!session?.token || !kanbanBoard || !event.over) {
      return
    }

    const activeTaskId = String(event.active.id)
    const sourceLocation = findTaskLocation(kanbanBoard, activeTaskId)
    const targetLocation = findDropLocation(
      kanbanBoard,
      event.over.id,
      event.over.data.current as DragData,
    )

    if (!sourceLocation || !targetLocation) {
      return
    }

    if (
      sourceLocation.columnId === targetLocation.columnId &&
      sourceLocation.position === targetLocation.position
    ) {
      return
    }

    setKanbanStatusMessage('')

    try {
      const updatedBoard = await moveTask(session.token, activeTaskId, {
        columnId: targetLocation.columnId,
        position: targetLocation.position,
      })

      setKanbanBoard(updatedBoard)
    } catch (error) {
      setKanbanStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel mover a task',
      )
    }
  }

  if (session) {
    return (
      <main className="app-shell">
        <section className="workspace">
          <div>
            <p className="eyebrow">TaskBoard</p>
            <h1>{session.company.name}</h1>
            <p className="muted">
              Sessao ativa para {session.user.name} com perfil {session.company.role}.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Sair
          </button>
        </section>

        {isKanbanLoading ? <p className="surface-message">Carregando quadro...</p> : null}

        {kanbanStatusMessage ? (
          <p className="surface-message error-message">{kanbanStatusMessage}</p>
        ) : null}

        {kanbanBoard ? (
          <>
            <section className="board-header">
              <div>
                <p className="eyebrow">{kanbanBoard.key}</p>
                <h2>{kanbanBoard.name}</h2>
                {kanbanBoard.description ? (
                  <p className="muted">{kanbanBoard.description}</p>
                ) : null}
              </div>
              <div className="board-actions">
                <form className="task-create-form" onSubmit={handleCreateTask}>
                  <input
                    name="title"
                    type="text"
                    minLength={2}
                    placeholder="Adicionar nova tarefa"
                    aria-label="Adicionar nova tarefa"
                    disabled={!kanbanBoard.columns[0] || creatingTaskColumnId !== null}
                    required
                  />
                  <button
                    type="submit"
                    className="secondary-button"
                    disabled={!kanbanBoard.columns[0] || creatingTaskColumnId !== null}
                  >
                    {creatingTaskColumnId ? 'Criando...' : 'Adicionar nova tarefa'}
                  </button>
                </form>
                {canManageColumns ? (
                  <div className="column-management">
                    <form className="column-create-form" onSubmit={handleCreateColumn}>
                      <input
                        name="name"
                        type="text"
                        minLength={2}
                        placeholder="Nova coluna"
                        required
                      />
                      <button type="submit" className="secondary-button">
                        Adicionar coluna
                      </button>
                    </form>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsColumnOrganizerOpen(true)}
                    >
                      Reorganizar colunas
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <section className="kanban-preview" aria-label="Quadro Kanban">
                {kanbanBoard.columns.map((column) => (
                  <KanbanColumnView
                    column={column}
                    canManageColumns={canManageColumns}
                    deletingColumnId={deletingColumnId}
                    editingColumnId={editingColumnId}
                    key={column.id}
                    onDeleteColumn={handleDeleteColumn}
                    onOpenTask={handleOpenTask}
                    onRenameColumn={handleRenameColumn}
                  />
                ))}
              </section>
              <DragOverlay>{activeTask ? <TaskCardPreview task={activeTask} /> : null}</DragOverlay>
            </DndContext>
          </>
        ) : null}

        {isTaskDetailLoading ? (
          <TaskDetailDialog title="Carregando task" onClose={() => setIsTaskDetailLoading(false)} />
        ) : null}

        {selectedTaskDetail ? (
          <TaskDetailDialog
            taskDetail={selectedTaskDetail}
            title={`${selectedTaskDetail.friendlyId} - ${selectedTaskDetail.title}`}
            onClose={() => setSelectedTaskDetail(null)}
          />
        ) : null}

        {isColumnOrganizerOpen && kanbanBoard ? (
          <ColumnOrganizerDialog
            columns={kanbanBoard.columns}
            reorderingColumnId={reorderingColumnId}
            onClose={() => setIsColumnOrganizerOpen(false)}
            onReorderColumn={handleReorderColumn}
          />
        ) : null}
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">TaskBoard</p>
          <h1>{authModeLabels[authMode]}</h1>
          <p className="muted">Acesse sua empresa e prepare seus quadros de trabalho.</p>
        </div>

        <div className="mode-switch" aria-label="Modo de autenticacao">
          <button
            type="button"
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => setAuthMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'active' : ''}
            onClick={() => setAuthMode('register')}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {authMode === 'register' ? (
            <>
              <label>
                Nome
                <input name="name" type="text" minLength={2} required />
              </label>
              <label>
                Empresa
                <input name="companyName" type="text" minLength={2} required />
              </label>
            </>
          ) : null}

          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" minLength={8} required />
          </label>

          {statusMessage ? <p className="error-message">{statusMessage}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : authModeLabels[authMode]}
          </button>
        </form>
      </section>
    </main>
  )
}

interface KanbanColumnViewProps {
  column: KanbanColumn
  canManageColumns: boolean
  deletingColumnId: string | null
  editingColumnId: string | null
  onDeleteColumn: (column: KanbanColumn) => void
  onOpenTask: (taskId: string) => void
  onRenameColumn: (formEvent: FormEvent<HTMLFormElement>, column: KanbanColumn) => void
}

function KanbanColumnView({
  column,
  canManageColumns,
  deletingColumnId,
  editingColumnId,
  onDeleteColumn,
  onOpenTask,
  onRenameColumn,
}: KanbanColumnViewProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    } satisfies ColumnDragData,
  })

  return (
    <div className={isOver ? 'column is-over' : 'column'} ref={setNodeRef}>
      {canManageColumns ? (
        <>
          <form className="column-title-form" onSubmit={(event) => onRenameColumn(event, column)}>
            <input
              aria-label={`Nome da coluna ${column.name}`}
              defaultValue={column.name}
              disabled={editingColumnId === column.id}
              name="name"
              type="text"
              minLength={2}
              required
            />
            <button type="submit" className="icon-button" title="Renomear coluna">
              Salvar
            </button>
          </form>
          <button
            type="button"
            className="column-delete-button"
            disabled={column.tasks.length > 0 || deletingColumnId === column.id}
            onClick={() => onDeleteColumn(column)}
          >
            Remover coluna vazia
          </button>
        </>
      ) : (
        <div className="column-title-readonly">
          <h2>{column.name}</h2>
          <span>Estrutura gerenciada por admins</span>
        </div>
      )}
      <SortableContext
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="task-list">
          {column.tasks.length > 0 ? (
            column.tasks.map((task) => (
              <SortableTaskCard
                columnId={column.id}
                key={task.id}
                task={task}
                onOpenTask={onOpenTask}
              />
            ))
          ) : (
            <p className="empty-column">Arraste ou crie cards aqui</p>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

interface ColumnOrganizerDialogProps {
  columns: KanbanColumn[]
  reorderingColumnId: string | null
  onClose: () => void
  onReorderColumn: (columnId: string, position: number) => void
}

function ColumnOrganizerDialog({
  columns,
  reorderingColumnId,
  onClose,
  onReorderColumn,
}: ColumnOrganizerDialogProps) {
  const columnOrganizerSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  function handleColumnDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return
    }

    const targetColumnIndex = columns.findIndex((column) => column.id === String(event.over?.id))

    if (targetColumnIndex < 0) {
      return
    }

    onReorderColumn(String(event.active.id), targetColumnIndex + 1)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="task-detail-modal column-organizer-dialog" open>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Quadro</p>
            <h2>Reorganizar colunas</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <DndContext sensors={columnOrganizerSensors} onDragEnd={handleColumnDragEnd}>
          <SortableContext
            items={columns.map((column) => column.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="column-organizer-list">
              {columns.map((column) => (
                <SortableColumnOrderRow
                  column={column}
                  isReordering={reorderingColumnId === column.id}
                  key={column.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </dialog>
    </div>
  )
}

interface SortableColumnOrderRowProps {
  column: KanbanColumn
  isReordering: boolean
}

function SortableColumnOrderRow({ column, isReordering }: SortableColumnOrderRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    } satisfies ColumnDragData,
  })

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <button
      type="button"
      className={isDragging ? 'column-order-row is-dragging' : 'column-order-row'}
      disabled={isReordering}
      ref={setNodeRef}
      style={rowStyle}
      {...attributes}
      {...listeners}
    >
      <span>{column.name}</span>
      <small>{isReordering ? 'Reorganizando...' : 'Arraste para ordenar'}</small>
    </button>
  )
}

interface SortableTaskCardProps {
  columnId: string
  task: KanbanTaskCard
  onOpenTask: (taskId: string) => void
}

function SortableTaskCard({ columnId, task, onOpenTask }: SortableTaskCardProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
      columnId,
    },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      className={isDragging ? 'task-card is-dragging' : 'task-card'}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpenTask(task.id)}
    >
      <TaskCardContent task={task} />
    </article>
  )
}

function TaskCardPreview({ task }: { task: KanbanTaskCard }) {
  return (
    <article className="task-card task-card-overlay">
      <TaskCardContent task={task} />
    </article>
  )
}

function TaskCardContent({ task }: { task: KanbanTaskCard }) {
  return (
    <>
      <strong>{task.friendlyId}</strong>
      <span>{task.title}</span>
      {task.assigneeName ? <small>Responsavel: {task.assigneeName}</small> : null}
    </>
  )
}

interface TaskDetailDialogProps {
  onClose: () => void
  taskDetail?: KanbanTaskDetail
  title: string
}

function TaskDetailDialog({ onClose, taskDetail, title }: TaskDetailDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <dialog aria-modal="true" className="task-detail-modal" open>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            Fechar
          </button>
        </div>
        {taskDetail ? (
          <dl className="task-detail-list">
            <div>
              <dt>Quadro</dt>
              <dd>{taskDetail.boardName}</dd>
            </div>
            <div>
              <dt>Coluna</dt>
              <dd>{taskDetail.columnName}</dd>
            </div>
            <div>
              <dt>Responsavel</dt>
              <dd>{taskDetail.assigneeName ?? 'Sem responsavel'}</dd>
            </div>
            <div>
              <dt>Criada em</dt>
              <dd>{formatDateTime(taskDetail.createdAt)}</dd>
            </div>
            <div>
              <dt>Atualizada em</dt>
              <dd>{formatDateTime(taskDetail.updatedAt)}</dd>
            </div>
            <div className="task-detail-description">
              <dt>Descricao</dt>
              <dd>{taskDetail.description ?? 'Sem descricao cadastrada'}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">Buscando informacoes da task...</p>
        )}
      </dialog>
    </div>
  )
}

function readStoredSession(): AuthSession | null {
  const storedSession = localStorage.getItem(sessionStorageKey)

  if (!storedSession) {
    return null
  }

  try {
    return JSON.parse(storedSession) as AuthSession
  } catch {
    localStorage.removeItem(sessionStorageKey)
    return null
  }
}

function findTaskLocation(board: KanbanBoard, taskId: string): TaskLocation | null {
  for (const column of board.columns) {
    const taskIndex = column.tasks.findIndex((task) => task.id === taskId)

    if (taskIndex !== -1) {
      return {
        columnId: column.id,
        position: taskIndex + 1,
      }
    }
  }

  return null
}

function findDropLocation(
  board: KanbanBoard,
  overId: string | number,
  dragData: DragData | undefined,
): TaskLocation | null {
  if (dragData?.type === 'column') {
    const column = board.columns.find((boardColumn) => boardColumn.id === dragData.columnId)

    if (!column) {
      return null
    }

    return {
      columnId: column.id,
      position: column.tasks.length + 1,
    }
  }

  const overTaskId = String(overId)

  for (const column of board.columns) {
    const taskIndex = column.tasks.findIndex((task) => task.id === overTaskId)

    if (taskIndex !== -1) {
      return {
        columnId: column.id,
        position: taskIndex + 1,
      }
    }
  }

  return null
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
