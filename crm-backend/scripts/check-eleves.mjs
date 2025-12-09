import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true, isArchived: false, deletedAt: null },
  });

  if (!currentYear) {
    console.log("❌ Aucune année courante active.");
    return;
  }

  console.log("✅ Année courante :", currentYear.name, currentYear.id);
  console.log();

  // 1️⃣ Tous les utilisateurs avec role=eleve
  const allEleves = await prisma.user.findMany({
    where: { role: "eleve", deletedAt: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  console.log(`📚 Tous les élèves (${allEleves.length}) :`);
  for (const e of allEleves) {
    console.log(`  - ${e.firstName} ${e.lastName} (${e.email})`);
  }
  console.log();

  // 2️⃣ Enrollments sur l'année courante
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { academicYearId: currentYear.id, role: "eleve", deletedAt: null },
    include: {
      student: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  console.log(`🎓 Enrollments sur l'année courante "${currentYear.name}" (${enrollments.length}) :`);
  for (const en of enrollments) {
    console.log(`  - ${en.student?.firstName} ${en.student?.lastName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
