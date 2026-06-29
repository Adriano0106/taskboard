import { buildApp } from './app.js'
import { environment } from './env.js'
import { prisma } from './prisma.js'

const app = await buildApp({
  jwtSecret: environment.JWT_SECRET,
  platformAdminEmails: environment.PLATFORM_ADMIN_EMAILS.split(',')
    .map((adminEmail) => adminEmail.trim().toLowerCase())
    .filter(Boolean),
  webOrigin: environment.WEB_ORIGIN,
})

try {
  await app.listen({
    port: environment.API_PORT,
    host: '0.0.0.0',
  })
} catch (error) {
  app.log.error(error)
  await prisma.$disconnect()
  process.exit(1)
}

const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']

for (const shutdownSignal of shutdownSignals) {
  process.on(shutdownSignal, async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}
