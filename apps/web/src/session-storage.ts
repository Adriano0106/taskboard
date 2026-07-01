import type { AuthSession } from './api.js'

export const sessionStorageKey = 'taskboard.session'

export function readStoredSession(): AuthSession | null {
  const storedSession = localStorage.getItem(sessionStorageKey)

  if (!storedSession) {
    return null
  }

  try {
    const parsedSession = JSON.parse(storedSession) as AuthSession

    return {
      ...parsedSession,
      isPlatformAdmin: parsedSession.isPlatformAdmin ?? false,
    }
  } catch {
    localStorage.removeItem(sessionStorageKey)
    return null
  }
}
