import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authRequired, requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin"));

/* ===================================================
   POST /import/json
   Import structuré (groupes, sous-groupes, cours, users)
=================================================== */
router.post("/json", async (req, res) => {
  try {
    const payload = req.body ?? {};

    /* -------------------------------
       1️⃣ Année académique courante
    -------------------------------- */
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        isCurrent: true,
        isArchived: false,
        deletedAt: null,
      },
    });

    if (!academicYear) {
      return res.status(400).json({
        error: "Aucune année académique active",
      });
    }

    const report = {
      groupsCreated: 0,
      subGroupsCreated: 0,
      coursesCreated: 0,
      coursesLinkedToSubGroups: 0,
      professorsLinked: 0,
      usersCreated: 0,
      usersAssigned: 0,
    };

    /* ===================================================
       2️⃣ GROUPES / SOUS-GROUPES / COURS
    =================================================== */
    if (Array.isArray(payload.groups)) {
      for (const g of payload.groups) {
        // ---- Groupe ----
        const group = await prisma.group.upsert({
          where: {
            academicYearId_name_deletedAt: {
              academicYearId: academicYear.id,
              name: g.name,
              deletedAt: null,
            },
          },
          update: {
            label: g.label ?? null,
          },
          create: {
            name: g.name,
            label: g.label ?? null,
            academicYearId: academicYear.id,
          },
        });

        report.groupsCreated++;

        // ---- Sous-groupes ----
        if (Array.isArray(g.subGroups)) {
          for (const sg of g.subGroups) {
            const subGroup = await prisma.subGroup.upsert({
              where: {
                groupId_code_deletedAt: {
                  groupId: group.id,
                  code: sg.code,
                  deletedAt: null,
                },
              },
              update: {
                label: sg.label ?? null,
              },
              create: {
                code: sg.code,
                label: sg.label ?? null,
                groupId: group.id,
              },
            });

            report.subGroupsCreated++;

            // ---- Cours / modules ----
            if (Array.isArray(sg.modules)) {
              for (const m of sg.modules) {
                let course = await prisma.course.findFirst({
                  where: {
                    name: m.name,
                    academicYearId: academicYear.id,
                    deletedAt: null,
                  },
                });

                if (!course) {
                  course = await prisma.course.create({
                    data: {
                      name: m.name,
                      academicYearId: academicYear.id,
                    },
                  });

                  report.coursesCreated++;
                }

                // Lier cours ↔ sous-groupe
                await prisma.course.update({
                  where: { id: course.id },
                  data: {
                    subGroups: {
                      connect: { id: subGroup.id },
                    },
                  },
                });

                report.coursesLinkedToSubGroups++;

                // ---- Professeur ----
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
                    },
                  });

                  await prisma.course.update({
                    where: { id: course.id },
                    data: {
                      professors: {
                        connect: { id: prof.id },
                      },
                    },
                  });

                  report.professorsLinked++;
                }
              }
            }
          }
        }
      }
    }

    /* ===================================================
       3️⃣ UTILISATEURS (élèves / profs)
    =================================================== */
    if (Array.isArray(payload.users)) {
      for (const u of payload.users) {
        const existingUser = await prisma.user.findUnique({
          where: { email: u.email },
        });

        let subGroup = null;
        if (u.subGroupCode) {
          subGroup = await prisma.subGroup.findFirst({
            where: { code: u.subGroupCode, deletedAt: null },
          });
        }

        if (!existingUser) {
          const password =
            Math.random().toString(36).slice(2, 10) + "A1!";

          const user = await prisma.user.create({
            data: {
              email: u.email,
              firstName: u.firstName || "",
              lastName: u.lastName || "",
              role: u.role || "eleve",
              password: bcrypt.hashSync(password, 10),
              subGroups: subGroup
                ? { connect: { id: subGroup.id } }
                : undefined,
            },
          });

          if (user.role === "eleve") {
            await prisma.studentEnrollment.create({
              data: {
                studentId: user.id,
                academicYearId: academicYear.id,
                role: "eleve",
                mainSubGroupId: subGroup?.id,
              },
            });
          }

          report.usersCreated++;
        } else if (subGroup) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              subGroups: { connect: { id: subGroup.id } },
            },
          });

          report.usersAssigned++;
        }
      }
    }

    res.json({ status: "ok", report });
  } catch (err) {
    console.error("❌ Erreur import JSON :", err);
    res.status(500).json({ error: "Erreur import JSON" });
  }
});

/* ===================================================
   GET /import/export/json
   Export complet (debug / sauvegarde)
=================================================== */
router.get("/export/json", async (_req, res) => {
  const data = {
    academicYears: await prisma.academicYear.findMany(),
    groups: await prisma.group.findMany({
      include: { subGroups: true },
    }),
    users: await prisma.user.findMany(),
    courses: await prisma.course.findMany({
      include: {
        subGroups: true,
        professors: true,
        academicYear: true,
      },
    }),
    rooms: await prisma.room.findMany(),
    sessions: await prisma.courseSession.findMany(),
    presences: await prisma.presence.findMany(),
  };

  res.json(data);
});

export default router;
