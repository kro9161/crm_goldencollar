/*
  Warnings:

  - You are about to drop the column `level` on the `SubGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SubGroup" DROP COLUMN "level",
ADD COLUMN     "levelId" TEXT;

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "filiereId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Level_filiereId_idx" ON "Level"("filiereId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_filiereId_code_deletedAt_key" ON "Level"("filiereId", "code", "deletedAt");

-- CreateIndex
CREATE INDEX "SubGroup_levelId_idx" ON "SubGroup"("levelId");

-- AddForeignKey
ALTER TABLE "SubGroup" ADD CONSTRAINT "SubGroup_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE CASCADE ON UPDATE CASCADE;
