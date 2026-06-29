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

export class CompanyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompanyError'
  }
}

export async function getCompanyWorkspace(
  prisma: PrismaClient,
  input: {
    companyId: string
    userId: string
  },
): Promise<CompanyWorkspace> {
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

  return {
    id: membership.company.id,
    name: membership.company.name,
    role: membership.role,
    departments: membership.company.departments.map((department) => ({
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
