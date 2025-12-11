/*
  Warnings:

  - A unique constraint covering the columns `[teacherNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "specialty" TEXT,
ADD COLUMN     "teacherNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_teacherNumber_key" ON "User"("teacherNumber");
