/*
  Warnings:

  - You are about to drop the column `filiereId` on the `Level` table. All the data in the column will be lost.
  - You are about to drop the column `levelId` on the `SubGroup` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Level` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Level" DROP CONSTRAINT "Level_filiereId_fkey";

-- DropForeignKey
ALTER TABLE "SubGroup" DROP CONSTRAINT "SubGroup_levelId_fkey";

-- DropIndex
DROP INDEX "Level_filiereId_code_deletedAt_key";

-- DropIndex
DROP INDEX "Level_filiereId_idx";

-- DropIndex
DROP INDEX "SubGroup_levelId_idx";

-- AlterTable
ALTER TABLE "Filiere" ADD COLUMN     "levelId" TEXT;

-- AlterTable
ALTER TABLE "Level" DROP COLUMN "filiereId";

-- AlterTable
ALTER TABLE "SubGroup" DROP COLUMN "levelId",
ADD COLUMN     "filiereId" TEXT;

-- CreateIndex
CREATE INDEX "Filiere_levelId_idx" ON "Filiere"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");

-- CreateIndex
CREATE INDEX "SubGroup_filiereId_idx" ON "SubGroup"("filiereId");

-- AddForeignKey
ALTER TABLE "SubGroup" ADD CONSTRAINT "SubGroup_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filiere" ADD CONSTRAINT "Filiere_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
