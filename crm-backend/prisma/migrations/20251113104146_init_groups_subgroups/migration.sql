/*
  Warnings:

  - You are about to drop the column `classId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Class` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_CourseClasses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_classId_fkey";

-- DropForeignKey
ALTER TABLE "_CourseClasses" DROP CONSTRAINT "_CourseClasses_A_fkey";

-- DropForeignKey
ALTER TABLE "_CourseClasses" DROP CONSTRAINT "_CourseClasses_B_fkey";

-- AlterTable
ALTER TABLE "CourseSession" ADD COLUMN     "targetGroupId" TEXT,
ADD COLUMN     "targetLevel" TEXT,
ADD COLUMN     "targetSession" TEXT,
ADD COLUMN     "targetSubGroupId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "classId",
ADD COLUMN     "subGroupId" TEXT;

-- DropTable
DROP TABLE "Class";

-- DropTable
DROP TABLE "_CourseClasses";

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "level" TEXT,
    "session" TEXT,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "SubGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CourseSubGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubGroup_code_key" ON "SubGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "_CourseSubGroups_AB_unique" ON "_CourseSubGroups"("A", "B");

-- CreateIndex
CREATE INDEX "_CourseSubGroups_B_index" ON "_CourseSubGroups"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_subGroupId_fkey" FOREIGN KEY ("subGroupId") REFERENCES "SubGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubGroup" ADD CONSTRAINT "SubGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseSubGroups" ADD CONSTRAINT "_CourseSubGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseSubGroups" ADD CONSTRAINT "_CourseSubGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "SubGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
