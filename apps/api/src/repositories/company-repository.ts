import type { PrismaClient } from '@prisma/client'

export interface CompanyWorkspace {
  id: string
  name: string
  role: string
  departments: Array<{
    id: string
    name: string
    boards: Array<{
      id: string
      key: string
      name: string
      description: string | null
    }>
  }>
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

export interface CompanyMutationInput {
  companyId: string
  userId: string
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
  await assertDepartmentBelongsToCompany(prisma, input.companyId, input.departmentId)

  const key = await createUniqueBoardKey(prisma, input.departmentId, input.name)

  await prisma.board.create({
    data: {
      key,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      departmentId: input.departmentId,
      members: {
        create: {
          userId: input.userId,
          role: 'OWNER',
        },
      },
      columns: {
        create: [
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
        ],
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
  await assertCanManageCompanyWorkspace(prisma, input)
  await assertBoardBelongsToCompany(prisma, input.companyId, input.boardId)

  await prisma.board.delete({
    where: {
      id: input.boardId,
    },
  })

  return getCompanyWorkspace(prisma, input)
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

  if (!['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new CompanyError('Only company owners and admins can manage workspace structure')
  }
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials = words.map((word) => word[0]).join('').slice(0, 3)
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
    role,
    departments: company.departments.map((department) => ({
      id: department.id,
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
