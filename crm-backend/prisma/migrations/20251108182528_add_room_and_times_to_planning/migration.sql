/*
  Warnings:

  - You are about to drop the column `date` on the `CourseSession` table. All the data in the column will be lost.
  - Added the required column `endTime` to the `CourseSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `CourseSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CourseSession" DROP COLUMN "date",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "salleId" TEXT,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
