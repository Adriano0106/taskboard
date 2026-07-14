import type { PrismaClient } from '@prisma/client'
import { assertCompanyPermission } from '../../permissions.js'
import { isClosedColumnName } from '../board/board-defaults.js'
import { CompanyError, type CompanyMutationInput } from './company-types.js'

export async function assertCanManageCompanyWorkspace(
  prisma: PrismaClient,
  input: CompanyMutationInput,
) {
  const membership = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId: input.userId, companyId: input.companyId } },
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

export async function assertDepartmentBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  departmentId: string,
) {
  const department = await prisma.department.findFirst({ where: { id: departmentId, companyId } })

  if (!department) {
    throw new CompanyError('Department does not belong to the current company')
  }

  return department
}

export async function assertCanDeleteBoard(prisma: PrismaClient, input: CompanyMutationInput) {
  const membership = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId: input.userId, companyId: input.companyId } },
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

export async function assertBoardBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  boardId: string,
) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, department: { companyId } },
  })

  if (!board) {
    throw new CompanyError('Board does not belong to the current company')
  }
}

export async function assertBoardHasNoOpenTasks(prisma: PrismaClient, boardId: string) {
  const tasks = await prisma.task.findMany({ where: { boardId }, include: { column: true } })

  if (tasks.some((task) => !isClosedColumnName(task.column.name))) {
    throw new CompanyError('Only boards without open tasks can be deleted')
  }
}

export function createBoardKeyBase(name: string) {
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
