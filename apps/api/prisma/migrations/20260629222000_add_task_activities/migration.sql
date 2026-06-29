CREATE TYPE "TaskActivityType" AS ENUM (
  'CREATED',
  'COMMENTED',
  'MOVED',
  'PRIORITY_CHANGED',
  'ASSIGNEE_CHANGED'
);

CREATE TABLE "TaskActivity" (
  "id" TEXT NOT NULL,
  "type" "TaskActivityType" NOT NULL,
  "metadata" JSONB,
  "taskId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");

ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
