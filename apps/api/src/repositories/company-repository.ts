import type { CompanyRole } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { assertCompanyPermission, getCompanyPermissions } from '../permissions.js'
import { defaultBoardColumns, isClosedColumnName } from './board-defaults.js'
import { assertValidCompanySlug } from './company-slug.js'

export interface CompanyWorkspace {
  id: string
  name: string
  slug: string
  theme: CompanyTheme
  role: string
  permissions: string[]
  departments: Array<{
    id: string
    key: string
    name: string
    boards: Array<{
      id: string
      key: string
      name: string
      description: string | null
    }>
  }>
}

export interface CompanyTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  boardBackgroundColor: string
}

export interface PlatformCompanySummary {
  id: string
  name: string
  memberCount: number
  departmentCount: number
  boardCount: number
  createdAt: string
}

export interface CompanyMemberSummary {
  id: string
  name: string
  email: string
  role: string
}

export interface CreateCompanyMemberInput extends CompanyMutationInput {
  name: string
  email: string
  password: string
  role: CompanyRole
}

export interface UpdateCompanyMemberInput extends CompanyMutationInput {
  memberUserId: string
  role: CompanyRole
}

export interface DeleteCompanyMemberInput extends CompanyMutationInput {
  memberUserId: string
}

export interface CompanyMutationInput {
  companyId: string
  userId: string
}

export interface UpdateCompanyInput extends CompanyMutationInput {
  name: string
  slug: string
  theme?: CompanyTheme
}

export interface CreateDepartmentInput extends CompanyMutationInput {
  name: string
}

export interface UpdateDepartmentInput extends CompanyMutationInput {
  departmentId: string
  name: string
}

export interface DeleteDepartmentInput extends CompanyMutationInput {
  departmentId: string
}

export interface CreateBoardInput extends CompanyMutationInput {
  departmentId: string
  name: string
  description?: string | null
}

export interface UpdateBoardInput extends CompanyMutationInput {
  boardId: string
  name: string
  description?: string | null
}

export interface DeleteBoardInput extends CompanyMutationInput {
  boardId: string
}

export class CompanyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompanyError'
  }
}

export async function updateCompany(
  prisma: PrismaClient,
  input: UpdateCompanyInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)

  const slug = normalizeCompanySlugOrThrow(input.slug)
  const existingCompany = await prisma.company.findFirst({
    where: {
      slug,
      NOT: {
        id: input.companyId,
      },
    },
    select: {
      id: true,
    },
  })

  if (existingCompany) {
    throw new CompanyError('Company URL is already in use')
  }

  await prisma.company.update({
    where: {
      id: input.companyId,
    },
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

export async function createDepartment(
  prisma: PrismaClient,
  input: CreateDepartmentInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)

  await prisma.department.create({
    data: {
      name: input.name.trim(),
      companyId: input.companyId,
    },
  })

  return getCompanyWorkspace(prisma, input)
}

export async function renameDepartment(
  prisma: PrismaClient,
  input: UpdateDepartmentInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)
  await assertDepartmentBelongsToCompany(prisma, input.companyId, input.departmentId)

  await prisma.department.update({
    where: {
      id: input.departmentId,
    },
    data: {
      name: input.name.trim(),
    },
  })

  return getCompanyWorkspace(prisma, input)
}

export async function deleteDepartment(
  prisma: PrismaClient,
  input: DeleteDepartmentInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)

  const department = await prisma.department.findFirst({
    where: {
      id: input.departmentId,
      companyId: input.companyId,
    },
    include: {
      _count: {
        select: {
          boards: true,
        },
      },
    },
  })

  if (!department) {
    throw new CompanyError('Department does not belong to the current company')
  }

  if (department._count.boards > 0) {
    throw new CompanyError('Only empty departments can be deleted')
  }

  await prisma.department.delete({
    where: {
      id: input.departmentId,
    },
  })

  return getCompanyWorkspace(prisma, input)
}

export async function createBoard(
  prisma: PrismaClient,
  input: CreateBoardInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)
  const department = await assertDepartmentBelongsToCompany(
    prisma,
    input.companyId,
    input.departmentId,
  )

  const key = await createUniqueBoardKey(prisma, input.departmentId, department.name)

  await prisma.board.create({
    data: {
      key,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      departmentId: input.departmentId,
      members: {
        create: {
          userId: input.userId,
          role: 'MANAGER',
        },
      },
      columns: {
        create: defaultBoardColumns,
      },
    },
  })

  return getCompanyWorkspace(prisma, input)
}

export async function updateBoard(
  prisma: PrismaClient,
  input: UpdateBoardInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)
  await assertBoardBelongsToCompany(prisma, input.companyId, input.boardId)

  await prisma.board.update({
    where: {
      id: input.boardId,
    },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
    },
  })

  return getCompanyWorkspace(prisma, input)
}

export async function deleteBoard(
  prisma: PrismaClient,
  input: DeleteBoardInput,
): Promise<CompanyWorkspace> {
  await assertCanDeleteBoard(prisma, input)
  await assertBoardBelongsToCompany(prisma, input.companyId, input.boardId)
  await assertBoardHasNoOpenTasks(prisma, input.boardId)

  await prisma.board.delete({
    where: {
      id: input.boardId,
    },
  })

  return getCompanyWorkspace(prisma, input)
}

export async function createCompanyMember(
  prisma: PrismaClient,
  input: CreateCompanyMemberInput,
): Promise<CompanyMemberSummary[]> {
  await assertCanManageCompanyWorkspace(prisma, input)

  const email = input.email.trim().toLowerCase()
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      memberships: true,
    },
  })

  if (existingUser?.memberships.some((membership) => membership.companyId === input.companyId)) {
    throw new CompanyError('User is already a company member')
  }

  const passwordHash = await bcrypt.hash(input.password, 12)

  await prisma.$transaction(async (transaction) => {
    const user =
      existingUser ??
      (await transaction.user.create({
        data: {
          name: input.name.trim(),
          email,
          passwordHash,
        },
      }))

    if (existingUser) {
      await transaction.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          name: input.name.trim(),
          passwordHash,
        },
      })
    }

    await transaction.companyMember.create({
      data: {
        companyId: input.companyId,
        userId: user.id,
        role: input.role,
      },
    })
  })

  return listCompanyMembers(prisma, input)
}

export async function updateCompanyMemberRole(
  prisma: PrismaClient,
  input: UpdateCompanyMemberInput,
): Promise<CompanyMemberSummary[]> {
  await assertCanManageCompanyWorkspace(prisma, input)

  if (input.memberUserId === input.userId) {
    throw new CompanyError('You cannot change your own role')
  }

  const membership = await findCompanyMember(prisma, input.companyId, input.memberUserId)

  if (!membership) {
    throw new CompanyError('Company member was not found')
  }

  if (membership.role === 'OWNER' && input.role !== 'OWNER') {
    await assertCompanyHasAnotherOwner(prisma, input.companyId, input.memberUserId)
  }

  await prisma.companyMember.update({
    where: {
      userId_companyId: {
        userId: input.memberUserId,
        companyId: input.companyId,
      },
    },
    data: {
      role: input.role,
    },
  })

  return listCompanyMembers(prisma, input)
}

export async function deleteCompanyMember(
  prisma: PrismaClient,
  input: DeleteCompanyMemberInput,
): Promise<CompanyMemberSummary[]> {
  await assertCanManageCompanyWorkspace(prisma, input)

  if (input.memberUserId === input.userId) {
    throw new CompanyError('You cannot remove yourself from the company')
  }

  const membership = await findCompanyMember(prisma, input.companyId, input.memberUserId)

  if (!membership) {
    throw new CompanyError('Company member was not found')
  }

  if (membership.role === 'OWNER') {
    await assertCompanyHasAnotherOwner(prisma, input.companyId, input.memberUserId)
  }

  await prisma.companyMember.delete({
    where: {
      userId_companyId: {
        userId: input.memberUserId,
        companyId: input.companyId,
      },
    },
  })

  return listCompanyMembers(prisma, input)
}

export async function getCompanyWorkspace(
  prisma: PrismaClient,
  input: {
    allowPlatformAdmin?: boolean
    companyId: string
    userId: string
  },
): Promise<CompanyWorkspace> {
  if (input.allowPlatformAdmin) {
    const company = await findCompanyWithWorkspace(prisma, input.companyId)

    if (!company) {
      throw new CompanyError('Company was not found')
    }

    return mapCompanyWorkspace(company, 'PLATFORM_ADMIN')
  }

  const membership = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId: input.userId,
        companyId: input.companyId,
      },
    },
    include: {
      company: {
        include: {
          departments: {
            orderBy: {
              createdAt: 'asc',
            },
            include: {
              boards: {
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          },
        },
      },
    },
  })

  if (!membership) {
    throw new CompanyError('Company does not belong to the authenticated user')
  }

  return mapCompanyWorkspace(membership.company, membership.role)
}

export async function getCompanyWorkspaceBySlug(
  prisma: PrismaClient,
  input: {
    allowPlatformAdmin?: boolean
    slug: string
    userId: string
  },
): Promise<CompanyWorkspace> {
  const company = await prisma.company.findUnique({
    where: {
      slug: input.slug,
    },
    select: {
      id: true,
    },
  })

  if (!company) {
    throw new CompanyError('Company not found')
  }

  return getCompanyWorkspace(prisma, {
    allowPlatformAdmin: input.allowPlatformAdmin,
    companyId: company.id,
    userId: input.userId,
  })
}

async function assertCanManageCompanyWorkspace(prisma: PrismaClient, input: CompanyMutationInput) {
  const membership = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId: input.userId,
        companyId: input.companyId,
      },
    },
  })

  if (!membership) {
    throw new CompanyError('Company does not belong to the authenticated user')
  }

  assertCompanyPermission(
    membership.role,
    'ManageWorkspace',
    () => new CompanyError('Only company owners and admins can manage workspace structure'),
  )
}

async function assertDepartmentBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  departmentId: string,
) {
  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      companyId,
    },
  })

  if (!department) {
    throw new CompanyError('Department does not belong to the current company')
  }

  return department
}

async function assertCanDeleteBoard(prisma: PrismaClient, input: CompanyMutationInput) {
  const membership = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId: input.userId,
        companyId: input.companyId,
      },
    },
  })

  if (!membership) {
    throw new CompanyError('Company does not belong to the authenticated user')
  }

  assertCompanyPermission(
    membership.role,
    'DeleteBoard',
    () => new CompanyError('Only company owners and admins can delete boards'),
  )
}

async function assertBoardBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  boardId: string,
) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      department: {
        companyId,
      },
    },
  })

  if (!board) {
    throw new CompanyError('Board does not belong to the current company')
  }
}

async function assertBoardHasNoOpenTasks(prisma: PrismaClient, boardId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      boardId,
    },
    include: {
      column: true,
    },
  })
  const hasOpenTasks = tasks.some((task) => !isClosedColumnName(task.column.name))

  if (hasOpenTasks) {
    throw new CompanyError('Only boards without open tasks can be deleted')
  }
}

async function findCompanyMember(prisma: PrismaClient, companyId: string, userId: string) {
  return prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  })
}

async function assertCompanyHasAnotherOwner(
  prisma: PrismaClient,
  companyId: string,
  ignoredUserId: string,
) {
  const otherOwner = await prisma.companyMember.findFirst({
    where: {
      companyId,
      role: 'OWNER',
      userId: {
        not: ignoredUserId,
      },
    },
    select: {
      id: true,
    },
  })

  if (!otherOwner) {
    throw new CompanyError('Company must have at least one owner')
  }
}

async function createUniqueBoardKey(prisma: PrismaClient, departmentId: string, name: string) {
  const baseKey = createBoardKeyBase(name)
  const existingBoards = await prisma.board.findMany({
    where: {
      departmentId,
      key: {
        startsWith: baseKey,
      },
    },
    select: {
      key: true,
    },
  })
  const existingKeys = new Set(existingBoards.map((board) => board.key))

  if (!existingKeys.has(baseKey)) {
    return baseKey
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const key = `${baseKey}${suffix}`

    if (!existingKeys.has(key)) {
      return key
    }
  }

  throw new CompanyError('Could not create a unique board key')
}

function createBoardKeyBase(name: string) {
  const words = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials =
    words.length === 1
      ? words[0]?.slice(0, 2)
      : words
          .map((word) => word[0] ?? '')
          .join('')
          .slice(0, 3)
  const fallbackKey = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3)

  return (initials || fallbackKey || 'BD').toUpperCase().padEnd(2, 'X')
}

async function findCompanyWithWorkspace(prisma: PrismaClient, companyId: string) {
  return prisma.company.findUnique({
    where: {
      id: companyId,
    },
    include: {
      departments: {
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          boards: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  })
}

type CompanyWithWorkspace = NonNullable<Awaited<ReturnType<typeof findCompanyWithWorkspace>>>

function mapCompanyWorkspace(company: CompanyWithWorkspace, role: string): CompanyWorkspace {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    theme: {
      primaryColor: company.themePrimaryColor,
      secondaryColor: company.themeSecondaryColor,
      accentColor: company.themeAccentColor,
      boardBackgroundColor: company.themeBoardBackgroundColor,
    },
    role,
    permissions: getCompanyPermissions(role),
    departments: company.departments.map((department) => ({
      id: department.id,
      key: createBoardKeyBase(department.name),
      name: department.name,
      boards: department.boards.map((board) => ({
        id: board.id,
        key: board.key,
        name: board.name,
        description: board.description,
      })),
    })),
  }
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

export async function listCompaniesForPlatformAdmin(
  prisma: PrismaClient,
): Promise<PlatformCompanySummary[]> {
  const companies = await prisma.company.findMany({
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      _count: {
        select: {
          departments: true,
          members: true,
        },
      },
      departments: {
        select: {
          _count: {
            select: {
              boards: true,
            },
          },
        },
      },
    },
  })

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    memberCount: company._count.members,
    departmentCount: company._count.departments,
    boardCount: company.departments.reduce(
      (totalBoards, department) => totalBoards + department._count.boards,
      0,
    ),
    createdAt: company.createdAt.toISOString(),
  }))
}

export async function listCompanyMembers(
  prisma: PrismaClient,
  input: {
    companyId: string
    userId: string
  },
): Promise<CompanyMemberSummary[]> {
  const membership = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId: input.userId,
        companyId: input.companyId,
      },
    },
  })

  if (!membership) {
    throw new CompanyError('Company does not belong to the authenticated user')
  }

  const members = await prisma.companyMember.findMany({
    where: {
      companyId: input.companyId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      user: true,
    },
  })

  return members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
  }))
}
