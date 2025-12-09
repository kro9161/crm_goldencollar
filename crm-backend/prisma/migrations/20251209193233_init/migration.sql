/*
  Warnings:

  - You are about to drop the column `filiereId` on the `SubGroup` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SubGroup" DROP CONSTRAINT "SubGroup_filiereId_fkey";

-- DropIndex
DROP INDEX "SubGroup_filiereId_idx";

-- AlterTable
ALTER TABLE "SubGroup" DROP COLUMN "filiereId";

-- CreateTable
CREATE TABLE "SubGroupFiliere" (
    "subGroupId" TEXT NOT NULL,
    "filiereId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubGroupFiliere_pkey" PRIMARY KEY ("subGroupId","filiereId")
);

-- AddForeignKey
ALTER TABLE "SubGroupFiliere" ADD CONSTRAINT "SubGroupFiliere_subGroupId_fkey" FOREIGN KEY ("subGroupId") REFERENCES "SubGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubGroupFiliere" ADD CONSTRAINT "SubGroupFiliere_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
