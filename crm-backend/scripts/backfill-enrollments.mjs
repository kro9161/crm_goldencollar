import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Backfill des StudentEnrollment pour assurer que chaque utilisateur rattaché
 * à une année courante/active possède une inscription sur cette année.
 *
 * Stratégie :
 * 1) Trouver l'année courante (isCurrent=true, non archivée, non supprimée).
 * 2) Lister les users non supprimés (role eleve/prof/admin/administratif).
 * 3) Pour chaque user, si pas d'enrollment sur l'année courante, en créer une.
 *    - role conservé
 *    - mainSubGroupId pris si l'utilisateur a un sous-groupe unique rattaché à l'année courante
 * 4) Log des créations.
 */

async function main() {
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true, isArchived: false, deletedAt: null },
  });

  if (!currentYear) {
    console.log("❌ Aucune année courante active (non archivée). Abandon.");
    return;
  }

  console.log("➡️  Année courante :", currentYear.name, currentYear.session, currentYear.id);

  const users = await prisma.user.findMany({
    where: { deletedAt: null, role: { in: ["eleve", "prof", "admin", "administratif"] } },
    include: {
      subGroups: {
        where: { deletedAt: null, group: { academicYearId: currentYear.id } },
        include: { group: true },
      },
      enrollments: {
        where: { deletedAt: null },
      },
    },
  });

  let created = 0;
  for (const user of users) {
    const already = user.enrollments.find((e) => e.academicYearId === currentYear.id && !e.deletedAt);
    if (already) continue;

    // Choisir un sous-groupe principal si un seul sous-groupe sur cette année
    const mainSubGroupId = user.subGroups.length === 1 ? user.subGroups[0].id : null;

    await prisma.studentEnrollment.create({
      data: {
        studentId: user.id,
        academicYearId: currentYear.id,
        role: user.role,
        mainSubGroupId: mainSubGroupId || undefined,
      },
    });
    created += 1;
    console.log(`✅ Enrollment créé pour ${user.email} (${user.role})`);
  }

  console.log(`🎯 Backfill terminé. Enrollments créés: ${created}`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
