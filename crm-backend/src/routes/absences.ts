// src/routes/absences.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, AuthedRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);

// 🔹 Liste toutes les absences / présences (pour la vue admin)
router.get("/", async (req, res) => {
  try {
    let academicYearId = (req.query.academicYearId as string) || undefined;
    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      if (!currentYear) {
        return res.status(400).json({ error: "Aucune année académique courante" });
      }
      academicYearId = currentYear.id;
    }

    let yearIds: string[];
    if (academicYearId) {
      yearIds = [academicYearId];
    } else {
      const currentYears = await prisma.academicYear.findMany({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      yearIds = currentYears.map((y) => y.id);
    }

    const data = await prisma.presence.findMany({
      where: {
        session: {
          course: {
            academicYearId: { in: yearIds }
          }
        }
      },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        session: {
          include: {
            course: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur de chargement des absences." });
  }
});

// 🔹 Marquer les présences/absences d'une session
router.post("/mark", async (req: AuthedRequest, res) => {
  const { courseId, date, presences } = req.body;

  if (!courseId || !date || !Array.isArray(presences)) {
    return res.status(400).json({ error: "Données manquantes ou invalides." });
  }

  try {
   const session = await prisma.courseSession.create({
  data: {
    date: new Date(date),
    startTime: new Date(date),
    endTime: new Date(new Date(date).getTime() + 2 * 60 * 60 * 1000),
    courseId,
    createdById: req.user!.id,
  },
});


    const created = await prisma.$transaction(
      presences.map((p: any) =>
        prisma.presence.create({
          data: {
            sessionId: session.id,
            studentId: p.studentId,
            status: p.status,
            reason: p.reason || null,
            justified: p.justified || false,
          },
        })
      )
    );

    res.json({ session, count: created.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur lors de la création des présences." });
  }
});

// 🔹 Modifier une absence (justifiée / validée)
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { justified, validatedByAdmin, status, reason } = req.body;

  try {
    const up = await prisma.presence.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(reason && { reason }),
        ...(justified !== undefined && { justified }),
        ...(validatedByAdmin !== undefined && { validatedByAdmin }),
      },
      include: {
        student: true,
        session: { include: { course: true } },
      },
    });

    res.json(up);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'absence." });
  }
});

// 🔹 Supprimer une absence
router.delete("/:id", async (req, res) => {
  try {
    await prisma.presence.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

/**
 * 📊 GET /absences/sessions
 * Retourne toutes les sessions avec résumé de présence (groupé)
 */
router.get("/sessions", async (req, res) => {
  try {
    let academicYearId = req.query.academicYearId as string;
    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      if (!currentYear) {
        return res.status(400).json({ error: "Aucune année académique courante" });
      }
      academicYearId = currentYear.id;
    }

    // Récupérer toutes les sessions avec présences
    const sessions = await prisma.courseSession.findMany({
      where: {
        deletedAt: null,
        course: { academicYearId, deletedAt: null },
        presences: { some: {} } // Seulement les sessions qui ont des présences
      },
      include: {
        course: { select: { name: true } },
        professor: { select: { firstName: true, lastName: true } },
        targetSubGroup: { select: { code: true } },
        presences: { select: { status: true } }
      },
      orderBy: { date: "desc" }
    });

    // Formatter avec les statistiques
    const formatted = sessions.map(s => {
      const total = s.presences.length;
      const presents = s.presences.filter(p => p.status === "present").length;
      const absents = s.presences.filter(p => p.status === "absent").length;
      const retards = s.presences.filter(p => p.status === "retard").length;
      const justifies = s.presences.filter(p => p.status === "justifie").length;

      return {
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        courseName: s.course.name,
        professorName: s.professor 
          ? `${s.professor.firstName} ${s.professor.lastName}`
          : "—",
        subGroupName: s.targetSubGroup?.code || "—",
        totalStudents: total,
        presents,
        absents,
        retards,
        justifies
      };
    });

    res.json(formatted);
  } catch (e) {
    console.error("❌ Erreur GET /absences/sessions :", e);
    res.status(500).json({ error: "Erreur de chargement des sessions." });
  }
});

/**
 * 📋 GET /absences/session/:id
 * Retourne les détails de présence pour une session spécifique
 */
router.get("/session/:id", async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    const presences = await prisma.presence.findMany({
      where: { sessionId },
      include: {
        student: { select: { firstName: true, lastName: true } }
      },
      orderBy: { student: { lastName: "asc" } }
    });

    const formatted = presences.map(p => ({
      id: p.id,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      status: p.status,
      justified: p.justified,
      reason: p.reason
    }));

    res.json(formatted);
  } catch (e) {
    console.error("❌ Erreur GET /absences/session/:id :", e);
    res.status(500).json({ error: "Erreur de chargement des détails." });
  }
});

export default router;
