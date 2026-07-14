export const defaultBoardColumns = [
  {
    name: 'A fazer',
    position: 1,
  },
  {
    name: 'Em progresso',
    position: 2,
  },
  {
    name: 'Concluido',
    position: 3,
  },
  {
    name: 'Cancelada',
    position: 4,
  },
]

const closedColumnNames = new Set(['concluido', 'cancelada'])

export function isClosedColumnName(columnName: string) {
  return closedColumnNames.has(normalizeColumnName(columnName))
}

export function isProtectedColumnName(columnName: string) {
  return defaultBoardColumns.some((column) => column.name === columnName)
}

function normalizeColumnName(columnName: string) {
  return columnName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}
