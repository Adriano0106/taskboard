import type { PrismaClient } from '@prisma/client'
import { BoardError } from './board-types.js'
import type {
  KanbanTaskWatcher,
  TaskWatcherInput,
  UpdateTaskWatcherInput,
} from './board-types.js'

export async function listTaskWatchers(
  prisma: PrismaClient,
  input: TaskWatcherInput,
): Promise<KanbanTaskWatcher[]> {
  await assertTaskBelongsToCompany(prisma, input)

  const watchers = await prisma.taskWatcher.findMany({
    where: {
      taskId: input.taskId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      user: true,
    },
  })

  return watchers.map((watcher) => ({
    userId: watcher.userId,
    name: watcher.user.name,
    email: watcher.user.email,
    createdAt: watcher.createdAt.toISOString(),
  }))
}

export async function addTaskWatcher(
  prisma: PrismaClient,
  input: UpdateTaskWatcherInput,
): Promise<KanbanTaskWatcher[]> {
  await assertTaskBelongsToCompany(prisma, input)
  await assertUserBelongsToCompany(prisma, input)

  await prisma.taskWatcher.upsert({
    where: {
      taskId_userId: {
        taskId: input.taskId,
        userId: input.watcherUserId,
      },
    },
    update: {},
    create: {
      taskId: input.taskId,
      userId: input.watcherUserId,
    },
  })

  return listTaskWatchers(prisma, input)
}

export async function removeTaskWatcher(
  prisma: PrismaClient,
  input: UpdateTaskWatcherInput,
): Promise<KanbanTaskWatcher[]> {
  await assertTaskBelongsToCompany(prisma, input)

  await prisma.taskWatcher.deleteMany({
    where: {
      taskId: input.taskId,
      userId: input.watcherUserId,
    },
  })

  return listTaskWatchers(prisma, input)
}

async function assertTaskBelongsToCompany(prisma: PrismaClient, input: TaskWatcherInput) {
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

async function assertUserBelongsToCompany(prisma: PrismaClient, input: UpdateTaskWatcherInput) {
  const membership = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId: input.watcherUserId,
        companyId: input.companyId,
      },
    },
  })

  if (!membership) {
    throw new BoardError('Watcher does not belong to the current company')
  }
}
