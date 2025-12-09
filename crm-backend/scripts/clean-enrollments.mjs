import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Nettoie les enrollments en double :
 * - Garde uniquement l'enrollment sur l'année courante active
 * - Supprime les enrollments des années archivées pour éviter les doublons
 */

async function main() {
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true, isArchived: false, deletedAt: null },
  });

  if (!currentYear) {
    console.log("❌ Aucune année courante active. Abandon.");
    return;
  }

  console.log("➡️  Année courante :", currentYear.name, currentYear.id);

  // Récupérer tous les enrollments
  const allEnrollments = await prisma.studentEnrollment.findMany({
    where: { deletedAt: null },
    include: {
      student: { select: { id: true, email: true } },
      academicYear: { select: { id: true, name: true, isArchived: true, isCurrent: true } },
    },
  });

  // Grouper par utilisateur
  const byUser = new Map();
  for (const e of allEnrollments) {
    if (!byUser.has(e.studentId)) {
      byUser.set(e.studentId, []);
    }
    byUser.get(e.studentId).push(e);
  }

  let deleted = 0;

  for (const [userId, enrollments] of byUser.entries()) {
    // Si l'utilisateur a plusieurs enrollments
    if (enrollments.length > 1) {
      const currentEnrollment = enrollments.find(e => e.academicYearId === currentYear.id);
      
      // Supprimer tous les enrollments SAUF celui de l'année courante
      for (const e of enrollments) {
        if (e.academicYearId !== currentYear.id) {
          await prisma.studentEnrollment.delete({ where: { id: e.id } });
          console.log(`🗑️  Supprimé enrollment de ${e.student.email} sur année archivée ${e.academicYear.name}`);
          deleted++;
        }
      }
    }
  }

  console.log(`🎯 Nettoyage terminé. Enrollments supprimés: ${deleted}`);
  console.log("✅ Les utilisateurs sont maintenant uniquement sur l'année courante.");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
