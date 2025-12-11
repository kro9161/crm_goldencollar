-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "handicap" BOOLEAN,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "registrationDate" TIMESTAMP(3),
ADD COLUMN     "scholarship" BOOLEAN,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "studentNumber" TEXT;
