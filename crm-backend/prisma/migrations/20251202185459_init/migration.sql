/*
  Warnings:

  - A unique constraint covering the columns `[academicYearId,code]` on the table `Periode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `session` to the `AcademicYear` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "session" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Periode" ADD COLUMN     "code" TEXT,
ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Periode_academicYearId_code_key" ON "Periode"("academicYearId", "code");
