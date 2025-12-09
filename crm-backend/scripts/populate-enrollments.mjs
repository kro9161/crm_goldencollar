import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Début de la population des enrollments...\n');

  // 1. Récupérer toutes les années académiques
  const academicYears = await prisma.academicYear.findMany({
    where: { deletedAt: null }
  });

  if (academicYears.length === 0) {
    console.log('❌ Aucune année académique trouvée');
    return;
  }

  console.log(`📅 ${academicYears.length} année(s) académique(s) trouvée(s)\n`);

  // 2. Pour chaque année académique, créer les enrollments
  for (const year of academicYears) {
    console.log(`\n📚 Traitement de l'année : ${year.name} (${year.id})`);
    console.log('─'.repeat(50));

    // 2a. Enrollments pour les admins et administratifs (tous présents dans toutes les années)
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['admin', 'administratif'] },
        deletedAt: null
      }
    });

    console.log(`\n👥 Création des enrollments pour ${admins.length} admin(s)/administratif(s)...`);
    
    for (const admin of admins) {
      try {
        await prisma.studentEnrollment.upsert({
          where: {
            studentId_academicYearId_role: {
              studentId: admin.id,
              academicYearId: year.id,
              role: admin.role
            }
          },
          update: {},
          create: {
            studentId: admin.id,
            academicYearId: year.id,
            role: admin.role,
              status: year.isCurrent ? 'en_cours' : 'termine'
          }
        });
        console.log(`  ✅ ${admin.email} (${admin.role})`);
      } catch (error) {
        console.log(`  ⚠️  Erreur pour ${admin.email}: ${error.message}`);
      }
    }

    // 2b. Enrollments pour les profs qui ont des cours dans cette année
    const profsWithCourses = await prisma.course.findMany({
      where: {
        academicYearId: year.id,
        deletedAt: null
      },
      include: {
        professors: {
          where: { deletedAt: null }
        }
      }
    });

    const uniqueProfs = new Map();
    profsWithCourses.forEach(course => {
      course.professors.forEach(prof => {
        uniqueProfs.set(prof.id, prof);
      });
    });

    console.log(`\n👨‍🏫 Création des enrollments pour ${uniqueProfs.size} professeur(s)...`);
    
    for (const prof of uniqueProfs.values()) {
      try {
        await prisma.studentEnrollment.upsert({
          where: {
            studentId_academicYearId_role: {
              studentId: prof.id,
              academicYearId: year.id,
              role: 'prof'
            }
          },
          update: {},
          create: {
            studentId: prof.id,
            academicYearId: year.id,
            role: 'prof',
              status: year.isCurrent ? 'en_cours' : 'termine'
          }
        });
        console.log(`  ✅ ${prof.email}`);
      } catch (error) {
        console.log(`  ⚠️  Erreur pour ${prof.email}: ${error.message}`);
      }
    }

    // 2c. Enrollments pour les élèves (ceux déjà dans StudentEnrollment avec role par défaut)
    const existingStudentEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: year.id,
        role: 'eleve',
        deletedAt: null
      },
      include: {
        student: true
      }
    });

    console.log(`\n🎓 ${existingStudentEnrollments.length} élève(s) déjà inscrits dans cette année`);
  }

  // 3. Résumé final
  console.log('\n\n' + '═'.repeat(50));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('═'.repeat(50));

  for (const year of academicYears) {
    const counts = await prisma.studentEnrollment.groupBy({
      by: ['role'],
      where: {
        academicYearId: year.id,
        deletedAt: null
      },
      _count: true
    });

    console.log(`\n📅 ${year.name} (${year.isCurrent ? 'ANNÉE COURANTE' : 'archivée'}):`);
    counts.forEach(({ role, _count }) => {
      console.log(`  - ${role}: ${_count} enrollment(s)`);
    });
  }

  console.log('\n✅ Migration terminée avec succès!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
