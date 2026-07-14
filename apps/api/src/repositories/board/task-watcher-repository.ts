import type { PrismaClient } from '@prisma/client'
import { assertBoardPermission } from '../../scoped-permissions.js'
import { BoardError } from './board-types.js'
import type { KanbanTaskWatcher, TaskWatcherInput, UpdateTaskWatcherInput } from './board-types.js'
import { createTaskActivity } from './task-activity-writer.js'

export async function listTaskWatchers(
  prisma: PrismaClient,
  input: TaskWatcherInput,
): Promise<KanbanTaskWatcher[]> {
  await assertBoardPermission(prisma, input, 'ViewBoard', (message) => new BoardError(message))
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
  await assertBoardPermission(
    prisma,
    input,
    'ManageTaskWatchers',
    (message) => new BoardError(message),
  )
  await assertTaskBelongsToCompany(prisma, input)
  await assertUserBelongsToCompany(prisma, input)

  await prisma.$transaction(async (transaction) => {
    const existingWatcher = await transaction.taskWatcher.findUnique({
      where: {
        taskId_userId: {
          taskId: input.taskId,
          userId: input.watcherUserId,
        },
      },
    })

    if (existingWatcher) {
      return
    }

    const createdWatcher = await transaction.taskWatcher.create({
      data: {
        taskId: input.taskId,
        userId: input.watcherUserId,
      },
      include: {
        user: true,
      },
    })

    await createTaskActivity(transaction, {
      actorId: input.userId,
      taskId: input.taskId,
      type: 'WATCHER_ADDED',
      metadata: {
        watcherId: createdWatcher.userId,
        watcherName: createdWatcher.user.name,
      },
    })
  })

  return listTaskWatchers(prisma, input)
}

export async function removeTaskWatcher(
  prisma: PrismaClient,
  input: UpdateTaskWatcherInput,
): Promise<KanbanTaskWatcher[]> {
  await assertBoardPermission(
    prisma,
    input,
    'ManageTaskWatchers',
    (message) => new BoardError(message),
  )
  await assertTaskBelongsToCompany(prisma, input)

  await prisma.$transaction(async (transaction) => {
    const existingWatcher = await transaction.taskWatcher.findUnique({
      where: {
        taskId_userId: {
          taskId: input.taskId,
          userId: input.watcherUserId,
        },
      },
      include: {
        user: true,
      },
    })

    if (!existingWatcher) {
      return
    }

    await transaction.taskWatcher.delete({
      where: {
        taskId_userId: {
          taskId: input.taskId,
          userId: input.watcherUserId,
        },
      },
    })
    await createTaskActivity(transaction, {
      actorId: input.userId,
      taskId: input.taskId,
      type: 'WATCHER_REMOVED',
      metadata: {
        watcherId: existingWatcher.userId,
        watcherName: existingWatcher.user.name,
      },
    })
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
