class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

Object.assign(globalThis, {
  localStorage: new MemoryStorage(),
  window: {
    setTimeout,
  },
})

const { createDemoSession, handleDemoRequest, resetDemoData } = await import('./src/demo-api.js')

const session = createDemoSession()
const headers = {
  Authorization: `Bearer ${session.token}`,
}
const board = await handleDemoRequest<{
  id: string
  columns: Array<{ id: string; tasks: Array<{ id: string }> }>
}>('/boards/current/kanban', {
  method: 'GET',
  headers,
})

const firstColumn = board.columns[0]
const secondColumn = board.columns[1]

if (!firstColumn || !secondColumn) {
  throw new Error('A demo deve iniciar com ao menos duas colunas')
}

const updatedBoard = await handleDemoRequest<typeof board>(
  `/companies/${session.company.id}/boards/${board.id}/tasks`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Smoke test da demo',
      columnId: firstColumn.id,
      priority: 'HIGH',
      assigneeId: session.user.id,
    }),
  },
)
const createdTask = updatedBoard.columns[0]?.tasks.find(
  (task) => !board.columns[0]?.tasks.some((existingTask) => existingTask.id === task.id),
)

if (!createdTask) {
  throw new Error('A demo não criou a task esperada')
}

const movedBoard = await handleDemoRequest<typeof board>(`/tasks/${createdTask.id}/move`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    columnId: secondColumn.id,
    position: 1,
  }),
})

if (!movedBoard.columns[1]?.tasks.some((task) => task.id === createdTask.id)) {
  throw new Error('A demo não moveu a task esperada')
}

resetDemoData()
console.log('Demo validada: sessão, dados iniciais, criação, movimentação e reset')
