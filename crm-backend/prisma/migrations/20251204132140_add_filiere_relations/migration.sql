/*
  Warnings:

  - You are about to drop the column `subGroupId` on the `Filiere` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code,academicYearId]` on the table `Filiere` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Filiere" DROP CONSTRAINT "Filiere_subGroupId_fkey";

-- DropIndex
DROP INDEX "Filiere_code_subGroupId_academicYearId_key";

-- DropIndex
DROP INDEX "Filiere_subGroupId_idx";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "filiereId" TEXT;

-- AlterTable
ALTER TABLE "Filiere" DROP COLUMN "subGroupId";

-- CreateTable
CREATE TABLE "_UserFilieres" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserFilieres_AB_unique" ON "_UserFilieres"("A", "B");

-- CreateIndex
CREATE INDEX "_UserFilieres_B_index" ON "_UserFilieres"("B");

-- CreateIndex
CREATE INDEX "Course_filiereId_idx" ON "Course"("filiereId");

-- CreateIndex
CREATE UNIQUE INDEX "Filiere_code_academicYearId_key" ON "Filiere"("code", "academicYearId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFilieres" ADD CONSTRAINT "_UserFilieres_A_fkey" FOREIGN KEY ("A") REFERENCES "Filiere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFilieres" ADD CONSTRAINT "_UserFilieres_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
