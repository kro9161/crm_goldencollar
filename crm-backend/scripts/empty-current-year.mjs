import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Supprime tous les enrollments de l'année courante pour repartir de zéro
 */

async function main() {
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true, isArchived: false, deletedAt: null },
  });

  if (!currentYear) {
    console.log("❌ Aucune année courante active.");
    return;
  }

  console.log("➡️  Année courante à vider :", currentYear.name, currentYear.id);

  const deleted = await prisma.studentEnrollment.deleteMany({
    where: { academicYearId: currentYear.id },
  });

  console.log(`🗑️  ${deleted.count} enrollments supprimés de l'année courante`);
  console.log("✅ L'année courante est maintenant vide. Tu peux créer de nouveaux élèves/profs.");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
