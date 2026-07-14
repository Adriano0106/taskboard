import type { PrismaClient } from '@prisma/client'
import { assertCanManageCompanyWorkspace } from './company-helpers.js'
import { getCompanyWorkspace } from './company-query-repository.js'
import { assertValidCompanySlug } from './company-slug.js'
import { CompanyError, type CompanyWorkspace, type UpdateCompanyInput } from './company-types.js'

export async function updateCompany(
  prisma: PrismaClient,
  input: UpdateCompanyInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)
  const slug = normalizeCompanySlugOrThrow(input.slug)
  const existingCompany = await prisma.company.findFirst({
    where: { slug, NOT: { id: input.companyId } },
    select: { id: true },
  })

  if (existingCompany) {
    throw new CompanyError('Company URL is already in use')
  }

  await prisma.company.update({
    where: { id: input.companyId },
    data: {
      name: input.name,
      slug,
      ...(input.theme
        ? {
            themePrimaryColor: normalizeThemeColor(input.theme.primaryColor),
            themeSecondaryColor: normalizeThemeColor(input.theme.secondaryColor),
            themeAccentColor: normalizeThemeColor(input.theme.accentColor),
            themeBoardBackgroundColor: normalizeThemeColor(input.theme.boardBackgroundColor),
          }
        : {}),
    },
  })

  return getCompanyWorkspace(prisma, input)
}

function normalizeThemeColor(value: string) {
  const color = value.trim().toLowerCase()

  if (!/^#[0-9a-f]{6}$/.test(color)) {
    throw new CompanyError('Invalid company theme color')
  }

  return color
}

function normalizeCompanySlugOrThrow(value: string) {
  try {
    return assertValidCompanySlug(value)
  } catch (error) {
    if (error instanceof Error) {
      throw new CompanyError(error.message)
    }

    throw error
  }
}
