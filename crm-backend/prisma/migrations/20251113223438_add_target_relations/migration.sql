/*
  Warnings:

  - You are about to drop the column `targetLevel` on the `CourseSession` table. All the data in the column will be lost.
  - You are about to drop the column `targetSession` on the `CourseSession` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SubGroup_code_key";

-- AlterTable
ALTER TABLE "CourseSession" DROP COLUMN "targetLevel",
DROP COLUMN "targetSession";

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_targetSubGroupId_fkey" FOREIGN KEY ("targetSubGroupId") REFERENCES "SubGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
