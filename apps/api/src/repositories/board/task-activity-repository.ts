import type { PrismaClient } from '@prisma/client'
import { assertBoardPermission } from '../../scoped-permissions.js'
import { BoardError } from './board-types.js'
import type { KanbanTaskActivity, TaskActivityInput } from './board-types.js'

export async function listTaskActivities(
  prisma: PrismaClient,
  input: TaskActivityInput,
): Promise<KanbanTaskActivity[]> {
  await assertBoardPermission(prisma, input, 'ViewBoard', (message) => new BoardError(message))
  await assertTaskBelongsToCompany(prisma, input)

  const activities = await prisma.taskActivity.findMany({
    where: {
      taskId: input.taskId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      actor: true,
    },
  })

  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    actorName: activity.actor.name,
    metadata: normalizeActivityMetadata(activity.metadata),
    createdAt: activity.createdAt.toISOString(),
  }))
}

async function assertTaskBelongsToCompany(prisma: PrismaClient, input: TaskActivityInput) {
  const task = await prisma.task.findFirst({
    where: {
      id: input.taskId,
      board: {
        department: {
          companyId: input.companyId,
        },
      },
    },
    select: {
      id: true,
    },
  })

  if (!task) {
    throw new BoardError('Task does not belong to the current company')
  }
}

function normalizeActivityMetadata(metadata: unknown): Record<string, string | null> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {}
  }

  const normalizedMetadata: Record<string, string | null> = {}

  for (const [key, value] of Object.entries(metadata)) {
    normalizedMetadata[key] = typeof value === 'string' ? value : null
  }

  return normalizedMetadata
}
