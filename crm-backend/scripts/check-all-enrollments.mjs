import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const allEnrollments = await prisma.studentEnrollment.findMany({
    where: { deletedAt: null },
    include: {
      student: { select: { firstName: true, lastName: true, email: true, role: true } },
      academicYear: { select: { name: true, session: true, isCurrent: true, isArchived: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`📚 Tous les enrollments (${allEnrollments.length}) :`);
  for (const en of allEnrollments) {
    const year = en.academicYear;
    const student = en.student;
    console.log(`  - ${student?.firstName} ${student?.lastName} (${student?.role}) → ${year?.name} (${year?.session}) [current: ${year?.isCurrent}, archived: ${year?.isArchived}]`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
