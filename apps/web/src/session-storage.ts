import type { AuthSession } from './api.js'

export const sessionStorageKey = 'taskboard.session'

export function readStoredSession(): AuthSession | null {
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
