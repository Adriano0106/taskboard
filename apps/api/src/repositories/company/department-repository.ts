import type { PrismaClient } from '@prisma/client'
import {
  assertCanManageCompanyWorkspace,
  assertDepartmentBelongsToCompany,
} from './company-helpers.js'
import { getCompanyWorkspace } from './company-query-repository.js'
import {
  CompanyError,
  type CompanyWorkspace,
  type CreateDepartmentInput,
  type DeleteDepartmentInput,
  type UpdateDepartmentInput,
} from './company-types.js'

export async function createDepartment(
  prisma: PrismaClient,
  input: CreateDepartmentInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)
  await prisma.department.create({ data: { name: input.name.trim(), companyId: input.companyId } })
  return getCompanyWorkspace(prisma, input)
}

export async function renameDepartment(
  prisma: PrismaClient,
  input: UpdateDepartmentInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)
  await assertDepartmentBelongsToCompany(prisma, input.companyId, input.departmentId)
  await prisma.department.update({
    where: { id: input.departmentId },
    data: { name: input.name.trim() },
  })
  return getCompanyWorkspace(prisma, input)
}

export async function deleteDepartment(
  prisma: PrismaClient,
  input: DeleteDepartmentInput,
): Promise<CompanyWorkspace> {
  await assertCanManageCompanyWorkspace(prisma, input)
  const department = await prisma.department.findFirst({
    where: { id: input.departmentId, companyId: input.companyId },
    include: { _count: { select: { boards: true } } },
  })

  if (!department) throw new CompanyError('Department does not belong to the current company')
  if (department._count.boards > 0) throw new CompanyError('Only empty departments can be deleted')

  await prisma.department.delete({ where: { id: input.departmentId } })
  return getCompanyWorkspace(prisma, input)
}
