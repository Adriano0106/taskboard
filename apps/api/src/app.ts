import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import type { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import { authRoutes } from './http/routes/auth-routes.js'
import { boardRoutes } from './http/routes/board-routes.js'
import { companyRoutes } from './http/routes/company-routes.js'
import { healthRoutes } from './http/routes/health-routes.js'
import { userRoutes } from './http/routes/user-routes.js'
import { prisma } from './prisma.js'
import type { StorageProvider } from './repositories/storage-provider.js'
import { type UserRepository, createPrismaUserRepository } from './repositories/user-repository.js'

export interface BuildAppOptions {
  jwtSecret: string
  platformAdminEmails?: string[]
  webOrigin: string
  prismaClient?: PrismaClient
  storageProvider?: StorageProvider
  userRepository?: UserRepository
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: true,
  })

  const prismaClient = options.prismaClient ?? prisma
  const userRepository = options.userRepository ?? createPrismaUserRepository(prismaClient)

  await app.register(cors, {
    origin: options.webOrigin,
  })

  await app.register(jwt, {
    secret: options.jwtSecret,
  })

  await app.register(healthRoutes)
  await app.register(authRoutes, {
    platformAdminEmails: options.platformAdminEmails ?? [],
    userRepository,
  })
  await app.register(boardRoutes, {
    platformAdminEmails: options.platformAdminEmails ?? [],
    prismaClient,
    storageProvider: options.storageProvider,
  })
  await app.register(userRoutes)
  await app.register(companyRoutes, {
    platformAdminEmails: options.platformAdminEmails ?? [],
    prismaClient,
  })

  return app
}
