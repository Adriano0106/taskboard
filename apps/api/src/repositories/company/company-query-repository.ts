import type { PrismaClient } from '@prisma/client'
import { getCompanyPermissions } from '../../permissions.js'
import { createBoardKeyBase } from './company-helpers.js'
import {
  CompanyError,
  type CompanyMemberSummary,
  type CompanyWorkspace,
  type PlatformCompanySummary,
} from './company-types.js'

export async function getCompanyWorkspace(
  prisma: PrismaClient,
  input: { allowPlatformAdmin?: boolean; companyId: string; userId: string },
): Promise<CompanyWorkspace> {
  if (input.allowPlatformAdmin) {
    const company = await findCompanyWithWorkspace(prisma, input.companyId, input.userId)

    if (!company) {
      throw new CompanyError('Company was not found')
    }

    return mapCompanyWorkspace(company, 'PLATFORM_ADMIN')
  }

  const membership = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId: input.userId, companyId: input.companyId } },
    include: {
      company: {
        include: {
          departments: {
            orderBy: { createdAt: 'asc' },
            include: {
              members: {
                where: { userId: input.userId },
                select: { id: true },
              },
              boards: {
                orderBy: { createdAt: 'asc' },
                include: {
                  members: {
                    where: { userId: input.userId },
                    select: { id: true },
                  },
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
  input: { allowPlatformAdmin?: boolean; slug: string; userId: string },
): Promise<CompanyWorkspace> {
  const company = await prisma.company.findUnique({
    where: { slug: input.slug },
    select: { id: true },
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

export async function listCompaniesForPlatformAdmin(
  prisma: PrismaClient,
): Promise<PlatformCompanySummary[]> {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { departments: true, members: true } },
      departments: { select: { _count: { select: { boards: true } } } },
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
  input: { companyId: string; userId: string },
): Promise<CompanyMemberSummary[]> {
  const membership = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId: input.userId, companyId: input.companyId } },
  })

  if (!membership) {
    throw new CompanyError('Company does not belong to the authenticated user')
  }

  const members = await prisma.companyMember.findMany({
    where: { companyId: input.companyId },
    orderBy: { createdAt: 'asc' },
    include: { user: true },
  })

  return members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    isActive: member.isActive,
  }))
}

async function findCompanyWithWorkspace(prisma: PrismaClient, companyId: string, userId: string) {
  return prisma.company.findUnique({
    where: { id: companyId },
    include: {
      departments: {
        orderBy: { createdAt: 'asc' },
        include: {
          members: {
            where: { userId },
            select: { id: true },
          },
          boards: {
            orderBy: { createdAt: 'asc' },
            include: {
              members: {
                where: { userId },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  })
}

type CompanyWithWorkspace = NonNullable<Awaited<ReturnType<typeof findCompanyWithWorkspace>>>

function mapCompanyWorkspace(company: CompanyWithWorkspace, role: string): CompanyWorkspace {
  const hasCompanyWideAccess = role === 'OWNER' || role === 'ADMIN' || role === 'PLATFORM_ADMIN'
  const visibleDepartments = company.departments
    .map((department) => {
      const hasDepartmentAccess = department.members.length > 0
      const visibleBoards = department.boards.filter((board) => {
        return hasCompanyWideAccess || hasDepartmentAccess || board.members.length > 0
      })

      return {
        ...department,
        boards: visibleBoards,
      }
    })
    .filter((department) => {
      return hasCompanyWideAccess || department.members.length > 0 || department.boards.length > 0
    })

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
    departments: visibleDepartments.map((department) => ({
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
