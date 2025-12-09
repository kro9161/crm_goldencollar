/*
  Warnings:

  - A unique constraint covering the columns `[studentId,academicYearId,role]` on the table `StudentEnrollment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StudentEnrollment" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'eleve';

-- CreateIndex
CREATE INDEX "StudentEnrollment_academicYearId_role_idx" ON "StudentEnrollment"("academicYearId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentId_academicYearId_role_key" ON "StudentEnrollment"("studentId", "academicYearId", "role");
