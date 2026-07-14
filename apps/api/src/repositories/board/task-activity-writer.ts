import type { Prisma, TaskActivityType } from '@prisma/client'

export interface CreateTaskActivityInput {
  actorId: string
  taskId: string
  type: TaskActivityType
  metadata?: Record<string, string | null>
}

export async function createTaskActivity(
  prisma: Prisma.TransactionClient,
  input: CreateTaskActivityInput,
) {
  await prisma.taskActivity.create({
    data: {
      actorId: input.actorId,
      taskId: input.taskId,
      type: input.type,
      metadata: input.metadata ?? {},
    },
  })
}
