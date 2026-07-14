import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { assertCanManageCompanyWorkspace } from './company-helpers.js'
import { listCompanyMembers } from './company-query-repository.js'
import {
  CompanyError,
  type CompanyMemberSummary,
  type CreateCompanyMemberInput,
  type UpdateCompanyMemberInput,
  type UpdateCompanyMemberStatusInput,
} from './company-types.js'

export async function createCompanyMember(
  prisma: PrismaClient,
  input: CreateCompanyMemberInput,
): Promise<CompanyMemberSummary[]> {
  await assertCanManageCompanyWorkspace(prisma, input)
  const email = input.email.trim().toLowerCase()
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  })

  if (existingUser?.memberships.some((membership) => membership.companyId === input.companyId)) {
    throw new CompanyError('User is already a company member')
  }

  const passwordHash = await bcrypt.hash(input.password, 12)
  await prisma.$transaction(async (transaction) => {
    const user =
      existingUser ??
      (await transaction.user.create({
        data: { name: input.name.trim(), email, passwordHash },
      }))

    if (existingUser) {
      await transaction.user.update({
        where: { id: existingUser.id },
        data: { name: input.name.trim(), passwordHash },
      })
    }

    await transaction.companyMember.create({
      data: { companyId: input.companyId, userId: user.id, role: input.role },
    })
  })

  return listCompanyMembers(prisma, input)
}

export async function updateCompanyMemberRole(
  prisma: PrismaClient,
  input: UpdateCompanyMemberInput,
): Promise<CompanyMemberSummary[]> {
  await assertCanManageCompanyWorkspace(prisma, input)
  if (input.memberUserId === input.userId) throw new CompanyError('You cannot change your own role')

  const membership = await findCompanyMember(prisma, input.companyId, input.memberUserId)
  if (!membership) throw new CompanyError('Company member was not found')
  if (membership.role === 'OWNER' && input.role !== 'OWNER') {
    await assertCompanyHasAnotherOwner(prisma, input.companyId, input.memberUserId)
  }

  await prisma.companyMember.update({
    where: { userId_companyId: { userId: input.memberUserId, companyId: input.companyId } },
    data: { role: input.role },
  })
  return listCompanyMembers(prisma, input)
}

export async function updateCompanyMemberStatus(
  prisma: PrismaClient,
  input: UpdateCompanyMemberStatusInput,
): Promise<CompanyMemberSummary[]> {
  await assertCanManageCompanyWorkspace(prisma, input)
  if (input.memberUserId === input.userId)
    throw new CompanyError('You cannot change your own status')

  const membership = await findCompanyMember(prisma, input.companyId, input.memberUserId)
  if (!membership) throw new CompanyError('Company member was not found')
  if (!input.isActive && membership.role === 'OWNER') {
    await assertCompanyHasAnotherOwner(prisma, input.companyId, input.memberUserId)
  }

  await prisma.companyMember.update({
    where: { userId_companyId: { userId: input.memberUserId, companyId: input.companyId } },
    data: { isActive: input.isActive },
  })
  return listCompanyMembers(prisma, input)
}

async function findCompanyMember(prisma: PrismaClient, companyId: string, userId: string) {
  return prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
  })
}

async function assertCompanyHasAnotherOwner(
  prisma: PrismaClient,
  companyId: string,
  ignoredUserId: string,
) {
  const otherOwner = await prisma.companyMember.findFirst({
    where: { companyId, isActive: true, role: 'OWNER', userId: { not: ignoredUserId } },
    select: { id: true },
  })

  if (!otherOwner) throw new CompanyError('Company must have at least one owner')
}
