/*
  Warnings:

  - You are about to drop the column `subGroupId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `SubGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_subGroupId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "subGroupId";

-- CreateTable
CREATE TABLE "_UserSubGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserSubGroups_AB_unique" ON "_UserSubGroups"("A", "B");

-- CreateIndex
CREATE INDEX "_UserSubGroups_B_index" ON "_UserSubGroups"("B");

-- CreateIndex
CREATE UNIQUE INDEX "SubGroup_code_key" ON "SubGroup"("code");

-- AddForeignKey
ALTER TABLE "_UserSubGroups" ADD CONSTRAINT "_UserSubGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "SubGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserSubGroups" ADD CONSTRAINT "_UserSubGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
