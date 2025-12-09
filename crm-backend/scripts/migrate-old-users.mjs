import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Migre les utilisateurs "orphelins" (sans enrollment) vers l'année archivée correspondante
 */

async function main() {
  // Trouver tous les users (eleves + profs) sans StudentEnrollment
  const usersWithoutEnrollment = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { in: ["eleve", "prof"] },
      enrollments: { none: {} },
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
  });

  console.log(`📚 Utilisateurs sans enrollment : ${usersWithoutEnrollment.length}`);

  if (usersWithoutEnrollment.length === 0) {
    console.log("✅ Tous les utilisateurs ont déjà un enrollment.");
    return;
  }

  // Trouver l'année archivée la plus récente (avant la courante)
  const archivedYear = await prisma.academicYear.findFirst({
    where: { isArchived: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!archivedYear) {
    console.log("❌ Aucune année archivée trouvée. Impossible de migrer.");
    return;
  }

  console.log(`📅 Année archivée cible : ${archivedYear.name} (${archivedYear.session})`);
  console.log();

  // Créer un enrollment pour chaque utilisateur orphelin vers l'année archivée
  for (const user of usersWithoutEnrollment) {
    await prisma.studentEnrollment.create({
      data: {
        studentId: user.id,
        academicYearId: archivedYear.id,
        role: user.role,
      },
    });
    console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.role}) → ${archivedYear.name}`);
  }

  console.log();
  console.log(`🎉 ${usersWithoutEnrollment.length} utilisateurs migrés vers l'année archivée "${archivedYear.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
