import type { CompanyTheme } from './api.js'

export const defaultCompanyTheme: CompanyTheme = {
  primaryColor: '#07182f',
  secondaryColor: '#12335f',
  accentColor: '#1d4ed8',
  boardBackgroundColor: '#d9e6f2',
}

export function resolveCompanyTheme(theme: CompanyTheme | null | undefined): CompanyTheme {
  return {
    primaryColor: theme?.primaryColor ?? defaultCompanyTheme.primaryColor,
    secondaryColor: theme?.secondaryColor ?? defaultCompanyTheme.secondaryColor,
    accentColor: theme?.accentColor ?? defaultCompanyTheme.accentColor,
    boardBackgroundColor: theme?.boardBackgroundColor ?? defaultCompanyTheme.boardBackgroundColor,
  }
}

export function createThemeCssVariables(theme: CompanyTheme) {
  const primaryRgb = hexToRgb(theme.primaryColor)
  const secondaryRgb = hexToRgb(theme.secondaryColor)
  const accentRgb = hexToRgb(theme.accentColor)

  return {
    '--theme-primary-color': theme.primaryColor,
    '--theme-secondary-color': theme.secondaryColor,
    '--theme-accent-color': theme.accentColor,
    '--theme-board-background-color': theme.boardBackgroundColor,
    '--theme-focus-color': createRgba(primaryRgb, 0.18),
    '--theme-primary-soft-color': createRgba(primaryRgb, 0.14),
    '--theme-primary-wash-color': createRgba(primaryRgb, 0.12),
    '--theme-secondary-soft-color': createRgba(secondaryRgb, 0.14),
    '--theme-secondary-wash-color': createRgba(secondaryRgb, 0.16),
    '--theme-accent-soft-color': createRgba(accentRgb, 0.14),
    '--theme-column-hover-color': mixWithWhite(theme.accentColor, 0.9),
  }
}

function hexToRgb(hexColor: string) {
  const normalizedColor = hexColor.replace('#', '')

  return {
    red: Number.parseInt(normalizedColor.slice(0, 2), 16),
    green: Number.parseInt(normalizedColor.slice(2, 4), 16),
    blue: Number.parseInt(normalizedColor.slice(4, 6), 16),
  }
}

function createRgba(
  color: {
    red: number
    green: number
    blue: number
  },
  alpha: number,
) {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`
}

function mixWithWhite(hexColor: string, whiteRatio: number) {
  const color = hexToRgb(hexColor)
  const mixChannel = (channel: number) => Math.round(channel * (1 - whiteRatio) + 255 * whiteRatio)

  return `rgb(${mixChannel(color.red)}, ${mixChannel(color.green)}, ${mixChannel(color.blue)})`
}
