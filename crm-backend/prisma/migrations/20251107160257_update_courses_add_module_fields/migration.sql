/*
  Warnings:

  - You are about to drop the column `roomId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_roomId_fkey";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "roomId",
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "totalHours" INTEGER,
ADD COLUMN     "totalSessions" INTEGER,
ADD COLUMN     "type" TEXT;

-- DropTable
DROP TABLE "Room";
