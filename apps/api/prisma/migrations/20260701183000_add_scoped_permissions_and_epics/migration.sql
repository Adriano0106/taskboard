CREATE TYPE "ScopedRole" AS ENUM ('MANAGER', 'MEMBER', 'VIEWER');
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "AccessRequestScope" AS ENUM ('DEPARTMENT', 'BOARD', 'EPIC');

CREATE TABLE "DepartmentMember" (
  "id" TEXT NOT NULL,
  "role" "ScopedRole" NOT NULL DEFAULT 'MEMBER',
  "departmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DepartmentMember_pkey" PRIMARY KEY ("id")
);

INSERT INTO "DepartmentMember" ("id", "role", "departmentId", "userId", "createdAt", "updatedAt")
SELECT
  'dm_' || md5(random()::text || clock_timestamp()::text || "Department"."id" || "CompanyMember"."userId"),
  CASE
    WHEN "CompanyMember"."role" IN ('OWNER', 'ADMIN') THEN 'MANAGER'::"ScopedRole"
    ELSE 'MEMBER'::"ScopedRole"
  END,
  "Department"."id",
  "CompanyMember"."userId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Department"
INNER JOIN "CompanyMember" ON "CompanyMember"."companyId" = "Department"."companyId"
ON CONFLICT DO NOTHING;

ALTER TABLE "BoardMember" ADD COLUMN "roleNext" "ScopedRole" NOT NULL DEFAULT 'MEMBER';

UPDATE "BoardMember"
SET "roleNext" = CASE
  WHEN "role" = 'OWNER' THEN 'MANAGER'::"ScopedRole"
  WHEN "role" = 'ADMIN' THEN 'MANAGER'::"ScopedRole"
  WHEN "role" = 'VIEWER' THEN 'VIEWER'::"ScopedRole"
  ELSE 'MEMBER'::"ScopedRole"
END;

ALTER TABLE "BoardMember" DROP COLUMN "role";
ALTER TABLE "BoardMember" RENAME COLUMN "roleNext" TO "role";

CREATE TABLE "Epic" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "companyId" TEXT NOT NULL,
  "ownerDepartmentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Epic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EpicTaskLink" (
  "id" TEXT NOT NULL,
  "epicId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EpicTaskLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessRequest" (
  "id" TEXT NOT NULL,
  "scope" "AccessRequestScope" NOT NULL,
  "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "companyId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "departmentId" TEXT,
  "boardId" TEXT,
  "epicId" TEXT,
  "requestedRole" "ScopedRole" NOT NULL DEFAULT 'VIEWER',
  "decisionMessage" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepartmentMember_departmentId_userId_key" ON "DepartmentMember"("departmentId", "userId");
CREATE INDEX "DepartmentMember_userId_idx" ON "DepartmentMember"("userId");
CREATE INDEX "BoardMember_userId_idx" ON "BoardMember"("userId");
CREATE INDEX "Epic_companyId_createdAt_idx" ON "Epic"("companyId", "createdAt");
CREATE INDEX "Epic_ownerDepartmentId_createdAt_idx" ON "Epic"("ownerDepartmentId", "createdAt");
CREATE UNIQUE INDEX "EpicTaskLink_epicId_taskId_key" ON "EpicTaskLink"("epicId", "taskId");
CREATE INDEX "EpicTaskLink_taskId_idx" ON "EpicTaskLink"("taskId");
CREATE INDEX "EpicTaskLink_boardId_idx" ON "EpicTaskLink"("boardId");
CREATE INDEX "AccessRequest_companyId_status_createdAt_idx" ON "AccessRequest"("companyId", "status", "createdAt");
CREATE INDEX "AccessRequest_requesterId_status_idx" ON "AccessRequest"("requesterId", "status");
CREATE INDEX "AccessRequest_departmentId_status_idx" ON "AccessRequest"("departmentId", "status");
CREATE INDEX "AccessRequest_boardId_status_idx" ON "AccessRequest"("boardId", "status");
CREATE INDEX "AccessRequest_epicId_status_idx" ON "AccessRequest"("epicId", "status");

ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Epic" ADD CONSTRAINT "Epic_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Epic" ADD CONSTRAINT "Epic_ownerDepartmentId_fkey" FOREIGN KEY ("ownerDepartmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EpicTaskLink" ADD CONSTRAINT "EpicTaskLink_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EpicTaskLink" ADD CONSTRAINT "EpicTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EpicTaskLink" ADD CONSTRAINT "EpicTaskLink_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
