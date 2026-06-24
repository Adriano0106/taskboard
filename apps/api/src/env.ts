import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  API_PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must have at least 16 characters'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
})

export const environment = environmentSchema.parse(process.env)
