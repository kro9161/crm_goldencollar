/*
  Warnings:

  - A unique constraint covering the columns `[academicYearId,name,deletedAt]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[groupId,code,deletedAt]` on the table `SubGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Group_academicYearId_name_key";

-- DropIndex
DROP INDEX "SubGroup_groupId_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "Group_academicYearId_name_deletedAt_key" ON "Group"("academicYearId", "name", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubGroup_groupId_code_deletedAt_key" ON "SubGroup"("groupId", "code", "deletedAt");
