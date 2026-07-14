import type { PrismaClient } from '@prisma/client'
import { defaultBoardColumns } from '../board/board-defaults.js'
import {
  assertBoardBelongsToCompany,
  assertBoardHasNoOpenTasks,
  assertCanDeleteBoard,
  assertCanManageCompanyWorkspace,
  assertDepartmentBelongsToCompany,
  createBoardKeyBase,
} from './company-helpers.js'
import { getCompanyWorkspace } from './company-query-repository.js'
import {
  CompanyError,
  type CompanyWorkspace,
  type CreateBoardInput,
  type DeleteBoardInput,
  type UpdateBoardInput,
} from './company-types.js'

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
      members: { create: { userId: input.userId, role: 'MANAGER' } },
      columns: { create: defaultBoardColumns },
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
    where: { id: input.boardId },
    data: { name: input.name.trim(), description: input.description?.trim() || null },
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
  await prisma.board.delete({ where: { id: input.boardId } })
  return getCompanyWorkspace(prisma, input)
}

async function createUniqueBoardKey(prisma: PrismaClient, departmentId: string, name: string) {
  const baseKey = createBoardKeyBase(name)
  const existingBoards = await prisma.board.findMany({
    where: { departmentId, key: { startsWith: baseKey } },
    select: { key: true },
  })
  const existingKeys = new Set(existingBoards.map((board) => board.key))

  if (!existingKeys.has(baseKey)) return baseKey

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const key = `${baseKey}${suffix}`
    if (!existingKeys.has(key)) return key
  }

  throw new CompanyError('Could not create a unique board key')
}
