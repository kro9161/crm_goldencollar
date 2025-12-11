import { PrismaClient } from '@prisma/client';
import { addDays, addMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
      // Hard delete toutes les données (ordre respectant les contraintes SQL)
      await prisma.presence.deleteMany({});
      await prisma.note.deleteMany({});
      await prisma.courseSession.deleteMany({});
      await prisma.studentEnrollment.deleteMany({});
      // Supprimer la table de jonction SubGroupFiliere avant SubGroup/Filiere
      await prisma.subGroupFiliere.deleteMany({});
      await prisma.subGroup.deleteMany({});
      await prisma.group.deleteMany({});
      await prisma.course.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.filiere.deleteMany({});
      await prisma.academicYear.deleteMany({});
      await prisma.room.deleteMany({});
      console.log("🗑️ Toutes les données ont été hard deleted (base vraiment vide)");
      process.exit(0);
    // Supprime toutes les années académiques (soft delete)
    await prisma.academicYear.updateMany({ data: { deletedAt: new Date() }, where: {} });
  // Purge toutes les données principales (soft delete)
  await prisma.studentEnrollment.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.presence.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.note.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.courseSession.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.course.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.user.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.group.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.subGroup.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.filiere.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.academicYear.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  await prisma.room.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
  console.log("✅ Toutes les données principales ont été soft-deleted (purge)");
  process.exit(0);

  // Années
  const yearFev = await prisma.academicYear.upsert({
    where: { name: '2025-2026 Février' },
    update: {
      session: 'fevrier',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2026-02-01'),
      isCurrent: true,
      isArchived: false,
      deletedAt: null
    },
    create: {
      name: '2025-2026 Février',
      session: 'fevrier',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2026-02-01'),
      isCurrent: true,
      isArchived: false,
      deletedAt: null
    }
  });
  const yearOct = await prisma.academicYear.upsert({
    where: { name: '2025-2026 Octobre' },
    update: {
      session: 'octobre',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-10-01'),
      isCurrent: false,
      isArchived: false,
      deletedAt: null
    },
    create: {
      name: '2025-2026 Octobre',
      session: 'octobre',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-10-01'),
      isCurrent: false,
      isArchived: false,
      deletedAt: null
    }
  });

  // Filières
  const filieres = [
    await prisma.filiere.create({ data: { code: 'INFO', label: 'Informatique', academicYearId: yearFev.id } }),
    await prisma.filiere.create({ data: { code: 'MARK', label: 'Marketing', academicYearId: yearFev.id } }),
    await prisma.filiere.create({ data: { code: 'INFO', label: 'Informatique', academicYearId: yearOct.id } }),
    await prisma.filiere.create({ data: { code: 'MARK', label: 'Marketing', academicYearId: yearOct.id } }),
  ];

  // Salles
  const rooms = [
    await prisma.room.create({ data: { code: 'A101', label: 'Salle A101', name: 'Salle A101', capacity: 30 } }),
    await prisma.room.create({ data: { code: 'B202', label: 'Salle B202', name: 'Salle B202', capacity: 25 } }),
    await prisma.room.create({ data: { code: 'C303', label: 'Salle C303', name: 'Salle C303', capacity: 20 } }),
  ];

  // Groupes et sous-groupes
  const groupsFev = [
    await prisma.group.create({ data: { name: 'BTS Février', academicYearId: yearFev.id } }),
    await prisma.group.create({ data: { name: 'Bachelor Février', academicYearId: yearFev.id } }),
  ];
  const groupsOct = [
    await prisma.group.create({ data: { name: 'BTS Octobre', academicYearId: yearOct.id } }),
    await prisma.group.create({ data: { name: 'Bachelor Octobre', academicYearId: yearOct.id } }),
  ];
  const subGroupsFev = [
    await prisma.subGroup.create({ data: { code: 'BTS-FEV-A', groupId: groupsFev[0].id, academicYearId: yearFev.id } }),
    await prisma.subGroup.create({ data: { code: 'BTS-FEV-B', groupId: groupsFev[0].id, academicYearId: yearFev.id } }),
    await prisma.subGroup.create({ data: { code: 'BACH-FEV-A', groupId: groupsFev[1].id, academicYearId: yearFev.id } }),
  ];
  const subGroupsOct = [
    await prisma.subGroup.create({ data: { code: 'BTS-OCT-A', groupId: groupsOct[0].id, academicYearId: yearOct.id } }),
    await prisma.subGroup.create({ data: { code: 'BTS-OCT-B', groupId: groupsOct[0].id, academicYearId: yearOct.id } }),
    await prisma.subGroup.create({ data: { code: 'BACH-OCT-A', groupId: groupsOct[1].id, academicYearId: yearOct.id } }),
  ];

  // Profs
  const profs = [];
  for (let i = 1; i <= 6; i++) {
    profs.push(await prisma.user.create({
      data: {
        email: `prof${i}@school.local`,
        firstName: `Prof${i}`,
        lastName: i <= 3 ? 'Février' : 'Octobre',
        role: 'prof',
        password: 'Demo123!',
        specialty: i % 2 === 0 ? 'Maths' : 'Français',
        teacherNumber: `P${i}`,
        hireDate: new Date('2020-01-01'),
        status: 'actif',
      }
    }));
  }

  // Élèves
  for (let i = 1; i <= 30; i++) {
    await prisma.user.create({
      data: {
        email: `eleve${i}@school.local`,
        firstName: `Élève${i}`,
        lastName: i <= 15 ? 'Février' : 'Octobre',
        role: 'eleve',
        password: 'Demo123!',
        dateOfBirth: new Date('2005-01-01'),
        status: 'actif',
        studentNumber: `E${i}`,
        subGroups: {
          connect: [
            { id: i <= 5 ? subGroupsFev[0].id : i <= 10 ? subGroupsFev[1].id : i <= 15 ? subGroupsFev[2].id : i <= 20 ? subGroupsOct[0].id : i <= 25 ? subGroupsOct[1].id : subGroupsOct[2].id }
          ]
        },
      }
    });
  }

  // Cours/matières
  const courses = [];
  for (let i = 1; i <= 8; i++) {
    courses.push(await prisma.course.create({
      data: {
        code: `MAT${i}`,
        name: i % 2 === 0 ? 'Mathématiques' : 'Français',
        type: 'cours',
        domain: i % 2 === 0 ? 'Sciences' : 'Lettres',
        totalHours: 30,
        totalSessions: 10,
        academicYearId: i <= 4 ? yearFev.id : yearOct.id,
        filiereId: i <= 4 ? filieres[0].id : filieres[2].id,
        professors: { connect: [{ id: profs[i % profs.length].id }] },
        subGroups: { connect: [
          { id: i <= 2 ? subGroupsFev[0].id : i <= 4 ? subGroupsFev[1].id : i <= 6 ? subGroupsOct[0].id : subGroupsOct[1].id }
        ] },
      }
    }));
  }

  // Plannings (sessions de cours)
  let sessionDate = new Date('2025-10-01T08:00:00');
  for (const course of courses) {
    for (let s = 0; s < 10; s++) {
      await prisma.courseSession.create({
        data: {
          courseId: course.id,
          professorId: course.professors[0]?.id,
          startTime: sessionDate,
          endTime: addMinutes(sessionDate, 120),
          date: sessionDate,
          roomId: rooms[s % rooms.length].id,
          attendanceStatus: s % 3 === 0 ? 'DONE' : 'NOT_STARTED',
          targetSubGroupId: course.subGroups[0]?.id,
        }
      });
      sessionDate = addDays(sessionDate, 2);
    }
  }

  // Absences (aléatoires)
  const eleves = await prisma.user.findMany({ where: { role: 'eleve', deletedAt: null } });
  const sessions = await prisma.courseSession.findMany({});
  for (const session of sessions) {
    for (const eleve of eleves) {
      if (Math.random() < 0.2) {
        await prisma.presence.create({
          data: {
            courseSessionId: session.id,
            userId: eleve.id,
            status: Math.random() < 0.5 ? 'absent' : 'retard',
          }
        });
      }
    }
  }

  console.log('Seed complet terminé !');
}

main().finally(() => prisma.$disconnect());
