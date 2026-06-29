import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const projectRootDirectory = resolve(currentDirectory, '../../..')
const environmentFilePaths = [resolve(process.cwd(), '.env'), resolve(projectRootDirectory, '.env')]

for (const environmentFilePath of environmentFilePaths) {
  if (existsSync(environmentFilePath)) {
    config({
      path: environmentFilePath,
    })
  }
}

const environmentSchema = z.object({
  API_PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must have at least 16 characters'),
  PLATFORM_ADMIN_EMAILS: z.string().default(''),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
})

export const environment = environmentSchema.parse(process.env)
