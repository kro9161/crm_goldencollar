// crm-backend/src/routes/importExport.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authRequired, requireRole } from '../middlewares/auth.js';

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin"));

/* ---------------------------------------------------
   POST /import/json
--------------------------------------------------- */
router.post('/json', async (req, res) => {
  try {
    const payload = req.body || {};

    // 1️⃣ Année scolaire active obligatoire
    const year = await prisma.academicYear.findFirst({
      where: { isCurrent: true, isArchived: false }
    });

    if (!year) {
      return res.status(400).json({
        error: "Aucune année scolaire active. Créez une AcademicYear d'abord."
      });
    }

    const report = {
      groupsCreated: 0,
      subGroupsCreated: 0,
      coursesCreated: 0,
      professorsLinked: 0,
      coursesLinkedToSubGroups: 0,
      usersCreated: 0,
      usersAssigned: 0,
    };

    /* ---------------------------------------------------
       2️⃣ IMPORT GROUPS + SUBGROUPS + COURSES
    --------------------------------------------------- */
    if (Array.isArray(payload.groups)) {
      for (const g of payload.groups) {

        // Groupe (unique par année scolaire)
        const group = await prisma.group.upsert({
          where: {
            academicYearId_name: { academicYearId: year.id, name: g.name }
          },
          update: { label: g.label || null },
          create: {
            name: g.name,
            label: g.label || null,
            academicYearId: year.id,
          }
        });

        report.groupsCreated++;

        // ---- Sous-groupes ----
        if (Array.isArray(g.subGroups)) {
          for (const sg of g.subGroups) {

            const subGroup = await prisma.subGroup.upsert({
              where: { code: sg.code }, // pas unique → ok
              update: {
                label: sg.label || null,
                level: sg.level || null,
                session: sg.session || null,
                groupId: group.id,
              },
              create: {
                code: sg.code,
                label: sg.label || null,
                level: sg.level || null,
                session: sg.session || null,
                groupId: group.id,
              }
            });

            report.subGroupsCreated++;

            // ---- Modules / Cours ----
            if (Array.isArray(sg.modules)) {
              for (const m of sg.modules) {

                // Cherche un cours EXISTANT dans CETTE année
                let course = await prisma.course.findFirst({
                  where: {
                    name: m.name,
                    academicYearId: year.id
                  }
                });

                if (!course) {
                  course = await prisma.course.create({
                    data: {
                      name: m.name,
                      academicYearId: year.id
                    }
                  });

                  report.coursesCreated++;
                }

                // Connecter course → subgroup
                await prisma.course.update({
                  where: { id: course.id },
                  data: {
                    subGroups: { connect: [{ id: subGroup.id }] }
                  }
                });

                report.coursesLinkedToSubGroups++;

                // ---- PROF ----
                if (m.professorEmail) {
                  const prof = await prisma.user.upsert({
                    where: { email: m.professorEmail },
                    update: {},
                    create: {
                      email: m.professorEmail,
                      firstName: m.professorFirstName || "Prof",
                      lastName: m.professorLastName || "",
                      role: "prof",
                      password: bcrypt.hashSync("Prof123!", 10),
                    }
                  });

                  await prisma.course.update({
                    where: { id: course.id },
                    data: {
                      professors: { connect: [{ id: prof.id }] }
                    }
                  });

                  report.professorsLinked++;
                }
              }
            }
          }
        }
      }
    }

    /* ---------------------------------------------------
       3️⃣ IMPORT USERS (élèves / profs / admin)
    --------------------------------------------------- */
    if (Array.isArray(payload.users)) {
      for (const u of payload.users) {

        const existing = await prisma.user.findUnique({
          where: { email: u.email }
        });

        // Trouver le subgroup (code non unique → on prend le premier trouvé)
        let subGroup = null;
        if (u.subGroupCode) {
          subGroup = await prisma.subGroup.findFirst({
            where: { code: u.subGroupCode }
          });
        }

        if (!existing) {
          const pwd = Math.random().toString(36).slice(2, 10) + "A1!";

          await prisma.user.create({
            data: {
              email: u.email,
              firstName: u.firstName || "",
              lastName: u.lastName || "",
              role: u.role || "eleve",
              password: bcrypt.hashSync(pwd, 10),
              subGroups: subGroup
                ? { connect: { id: subGroup.id } }
                : undefined,
            }
          });

          report.usersCreated++;
        } else if (subGroup) {
          await prisma.user.update({
            where: { email: u.email },
            data: {
              subGroups: { connect: { id: subGroup.id } }
            }
          });

          report.usersAssigned++;
        }
      }
    }

    return res.json({ status: "ok", report });

  } catch (err) {
    console.error("❌ Erreur import JSON :", err);
    return res.status(500).json({ error: "Erreur lors de l'import JSON" });
  }
});

/* ---------------------------------------------------
   EXPORT JSON COMPLET
--------------------------------------------------- */
router.get("/export/json", async (_req, res) => {
  const data = {
    years: await prisma.academicYear.findMany(),
    groups: await prisma.group.findMany({ include: { subGroups: true } }),
    users: await prisma.user.findMany(),
    courses: await prisma.course.findMany({
      include: {
        subGroups: true,
        professors: true,
        academicYear: true
      }
    }),
    rooms: await prisma.room.findMany(),
    sessions: await prisma.courseSession.findMany(),
    presences: await prisma.presence.findMany(),
  };

  res.json(data);
});

export default router;
