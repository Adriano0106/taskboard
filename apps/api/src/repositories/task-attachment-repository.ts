import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { BoardError } from './board-types.js'
import type {
  CreateTaskAttachmentInput,
  DeleteTaskAttachmentInput,
  DownloadTaskAttachmentInput,
  DownloadTaskAttachmentResult,
  KanbanTaskAttachment,
  TaskAttachmentInput,
} from './board-types.js'
import type { StorageProvider } from './storage-provider.js'
import { createTaskActivity } from './task-activity-writer.js'

export const taskAttachmentMaxSizeBytes = 3 * 1024 * 1024

export async function listTaskAttachments(
  prisma: PrismaClient,
  input: TaskAttachmentInput,
): Promise<KanbanTaskAttachment[]> {
  await assertTaskBelongsToCompany(prisma, input)

  const attachments = await prisma.taskAttachment.findMany({
    where: {
      taskId: input.taskId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      uploader: true,
    },
  })

  return attachments.map(mapTaskAttachment)
}

export async function createTaskAttachment(
  prisma: PrismaClient,
  storageProvider: StorageProvider,
  input: CreateTaskAttachmentInput,
): Promise<KanbanTaskAttachment> {
  await assertTaskBelongsToCompany(prisma, input)

  const content = Buffer.from(input.contentBase64, 'base64')

  if (content.byteLength === 0) {
    throw new BoardError('Attachment file is empty')
  }

  if (content.byteLength > taskAttachmentMaxSizeBytes) {
    throw new BoardError('Attachment exceeds the 3 MB limit')
  }

  const safeFileName = input.fileName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'attachment'
  const storageKey = `tasks/${input.taskId}/${randomUUID()}-${safeFileName}`

  await storageProvider.write(storageKey, content)

  try {
    const attachment = await prisma.$transaction(async (transaction) => {
      const createdAttachment = await transaction.taskAttachment.create({
        data: {
          fileName: safeFileName,
          contentType: input.contentType || 'application/octet-stream',
          sizeBytes: content.byteLength,
          storageKey,
          taskId: input.taskId,
          uploaderId: input.userId,
        },
        include: {
          uploader: true,
        },
      })

      await createTaskActivity(transaction, {
        actorId: input.userId,
        taskId: input.taskId,
        type: 'ATTACHMENT_ADDED',
        metadata: {
          attachmentId: createdAttachment.id,
          fileName: createdAttachment.fileName,
        },
      })

      return createdAttachment
    })

    return mapTaskAttachment(attachment)
  } catch (error) {
    await storageProvider.delete(storageKey)
    throw error
  }
}

export async function downloadTaskAttachment(
  prisma: PrismaClient,
  storageProvider: StorageProvider,
  input: DownloadTaskAttachmentInput,
): Promise<DownloadTaskAttachmentResult> {
  await assertTaskBelongsToCompany(prisma, input)

  const attachment = await prisma.taskAttachment.findFirst({
    where: {
      id: input.attachmentId,
      taskId: input.taskId,
    },
  })

  if (!attachment) {
    throw new BoardError('Attachment does not belong to the current task')
  }

  return {
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    content: await storageProvider.read(attachment.storageKey),
  }
}

export async function deleteTaskAttachment(
  prisma: PrismaClient,
  storageProvider: StorageProvider,
  input: DeleteTaskAttachmentInput,
): Promise<KanbanTaskAttachment[]> {
  await assertTaskBelongsToCompany(prisma, input)

  const attachment = await prisma.taskAttachment.findFirst({
    where: {
      id: input.attachmentId,
      taskId: input.taskId,
    },
  })

  if (!attachment) {
    throw new BoardError('Attachment does not belong to the current task')
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.taskAttachment.delete({
      where: {
        id: attachment.id,
      },
    })
    await createTaskActivity(transaction, {
      actorId: input.userId,
      taskId: input.taskId,
      type: 'ATTACHMENT_REMOVED',
      metadata: {
        attachmentId: attachment.id,
        fileName: attachment.fileName,
      },
    })
  })
  await storageProvider.delete(attachment.storageKey)

  return listTaskAttachments(prisma, input)
}

async function assertTaskBelongsToCompany(prisma: PrismaClient, input: TaskAttachmentInput) {
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

function mapTaskAttachment(attachment: {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploader: {
    name: string
  }
  createdAt: Date
}): KanbanTaskAttachment {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    uploaderName: attachment.uploader.name,
    createdAt: attachment.createdAt.toISOString(),
  }
}
