-- DropIndex
DROP INDEX "Task_friendlyId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Task_boardId_friendlyId_key" ON "Task"("boardId", "friendlyId");
