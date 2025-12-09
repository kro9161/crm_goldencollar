// =============================================
//  routes/prof.ts — VERSION OPTION A (ÉLÈVES DU COURS)
// =============================================

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, AuthedRequest } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

// 🔐 Toutes les routes ici nécessitent un token
router.use(authRequired);
router.use(requireRole("prof", "admin"));

/**
 * 🧑‍🏫 GET /prof/planning
 * - Sessions dont il est prof
 * - Sessions où il est co-prof d’un module
 * - Les élèves du COURS (via les sous-groupes)
 */
router.get("/planning", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié." });
    }

    // 🔍 Récupération des sessions liées au prof
    const sessions = await prisma.courseSession.findMany({
      where: {
        deletedAt: null,
        OR: [
          { professorId: userId },
          { course: { professors: { some: { id: userId } } } },
        ],
      },
      orderBy: { startTime: "asc" },
      include: {
        course: {
          include: {
            filiere: {
              include: {
                users: {
                  where: { role: "eleve", deletedAt: null },
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        professor: {
          select: { id: true, firstName: true, lastName: true },
        },
        salle: {
          select: { id: true, name: true },
        },
        targetSubGroup: {
          include: {
            students: {
              where: { role: "eleve", deletedAt: null },
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // 📦 Formatage pour FullCalendar
    const formatted = sessions.map((s) => {
      // 🔥 Élèves : soit du targetSubGroup, soit de la filière du cours
      const students = s.targetSubGroup?.students?.length
        ? s.targetSubGroup.students
        : s.course.filiere?.users ?? [];

      console.log(`📚 Session ${s.id} - Cours: ${s.course.name}`);
      console.log(`   - Filière: ${s.course.filiere?.code}`);
      console.log(`   - TargetSubGroup: ${s.targetSubGroup?.id}`);
      console.log(`   - Nb élèves filière: ${s.course.filiere?.users?.length ?? 0}`);
      console.log(`   - Nb élèves subGroup: ${s.targetSubGroup?.students?.length ?? 0}`);
      console.log(`   - Total élèves retournés: ${students.length}`);

      return {
        id: s.id,
        title: `${s.course.name} — ${
          s.professor
            ? `${s.professor.firstName} ${s.professor.lastName}`
            : "—"
        }${s.salle ? " 📍 " + s.salle.name : ""}`,
        start: s.startTime,
        end: s.endTime,
        extendedProps: {
          course: s.course,
          professor: s.professor,
          salle: s.salle,
          students: students, // 🔥 ICI : les élèves de la filière ou du sous-groupe
        },
        backgroundColor: "#2563eb",
        borderColor: "#1e3a8a",
        textColor: "#ffffff",
      };
    });

    console.log(`👨‍🏫 Prof ${userId} → ${formatted.length} sessions trouvées`);
    res.json(formatted);
  } catch (err) {
    console.error("❌ Erreur GET /prof/planning :", err);
    res.status(500).json({ error: "Erreur chargement planning prof." });
  }
});

export default router;
