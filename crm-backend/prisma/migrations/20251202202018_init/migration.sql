-- CreateTable
CREATE TABLE "Filiere" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "subGroupId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Filiere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Filiere_subGroupId_idx" ON "Filiere"("subGroupId");

-- CreateIndex
CREATE INDEX "Filiere_academicYearId_idx" ON "Filiere"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Filiere_code_subGroupId_academicYearId_key" ON "Filiere"("code", "subGroupId", "academicYearId");

-- AddForeignKey
ALTER TABLE "Filiere" ADD CONSTRAINT "Filiere_subGroupId_fkey" FOREIGN KEY ("subGroupId") REFERENCES "SubGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filiere" ADD CONSTRAINT "Filiere_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
