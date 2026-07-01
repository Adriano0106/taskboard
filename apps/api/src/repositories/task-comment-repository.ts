import type { PrismaClient } from '@prisma/client'
import { assertBoardPermission } from '../scoped-permissions.js'
import { BoardError } from './board-types.js'
import type { CreateTaskCommentInput, KanbanTaskComment, TaskCommentInput } from './board-types.js'
import { createTaskActivity } from './task-activity-writer.js'

export async function listTaskComments(
  prisma: PrismaClient,
  input: TaskCommentInput,
): Promise<KanbanTaskComment[]> {
  await assertBoardPermission(prisma, input, 'ViewBoard', (message) => new BoardError(message))
  await assertTaskBelongsToCompany(prisma, input)

  const comments = await prisma.taskComment.findMany({
    where: {
      taskId: input.taskId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      author: true,
    },
  })

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    authorName: comment.author.name,
    createdAt: comment.createdAt.toISOString(),
  }))
}

export async function createTaskComment(
  prisma: PrismaClient,
  input: CreateTaskCommentInput,
): Promise<KanbanTaskComment> {
  await assertBoardPermission(prisma, input, 'CommentTask', (message) => new BoardError(message))
  await assertTaskBelongsToCompany(prisma, input)

  const comment = await prisma.$transaction(async (transaction) => {
    const createdComment = await transaction.taskComment.create({
      data: {
        content: input.content.trim(),
        taskId: input.taskId,
        authorId: input.userId,
      },
      include: {
        author: true,
      },
    })

    await createTaskActivity(transaction, {
      actorId: input.userId,
      taskId: input.taskId,
      type: 'COMMENTED',
      metadata: {
        commentId: createdComment.id,
      },
    })

    return createdComment
  })

  return {
    id: comment.id,
    content: comment.content,
    authorName: comment.author.name,
    createdAt: comment.createdAt.toISOString(),
  }
}

async function assertTaskBelongsToCompany(prisma: PrismaClient, input: TaskCommentInput) {
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
