import { useEffect } from 'react'
import type { CompanyTheme } from '../api.js'
import { createThemeCssVariables, resolveCompanyTheme } from '../theme.js'

export function useCompanyTheme(theme: CompanyTheme | null | undefined) {
  useEffect(() => {
    const cssVariables = createThemeCssVariables(resolveCompanyTheme(theme))
    const rootElement = document.documentElement

    for (const [propertyName, propertyValue] of Object.entries(cssVariables)) {
      rootElement.style.setProperty(propertyName, propertyValue)
    }
  }, [theme])
}
