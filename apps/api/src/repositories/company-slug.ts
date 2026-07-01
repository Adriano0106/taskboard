export function normalizeCompanySlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function assertValidCompanySlug(value: string) {
  const normalizedSlug = normalizeCompanySlug(value)

  if (normalizedSlug.length < 2) {
    throw new Error('Company URL must have at least 2 characters')
  }

  if (normalizedSlug.length > 48) {
    throw new Error('Company URL must have at most 48 characters')
  }

  return normalizedSlug
}

export function createCompanySlugFromName(value: string) {
  const normalizedSlug = normalizeCompanySlug(value).slice(0, 48).replace(/-+$/g, '')

  if (normalizedSlug.length >= 2) {
    return normalizedSlug
  }

  return 'empresa'
}
