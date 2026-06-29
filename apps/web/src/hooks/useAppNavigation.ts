import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseAppRoute } from '../routing.js'

export function useAppNavigation() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname)
  const currentRoute = useMemo(() => parseAppRoute(currentPath), [currentPath])

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigateTo = useCallback((path: string, options: { replace?: boolean } = {}) => {
    if (window.location.pathname === path) {
      return
    }

    if (options.replace) {
      window.history.replaceState(null, '', path)
    } else {
      window.history.pushState(null, '', path)
    }

    setCurrentPath(path)
  }, [])

  return {
    currentRoute,
    navigateTo,
  }
}
