import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, AuthedRequest } from "../middlewares/auth.js";

const router = Router();
const prisma = new PrismaClient();

router.use(authRequired);

/* -----------------------------------------------------------
   📋 GET /absences
   Liste des absences (admin / staff)
----------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    let academicYearId = req.query.academicYearId as string | undefined;

    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      if (!currentYear) {
        return res.json([]); // ✅ TOUJOURS un tableau
      }
      academicYearId = currentYear.id;
    }

    const absences = await prisma.presence.findMany({
      where: {
        session: {
          course: {
            academicYearId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        status: true,
        justified: true,
        reason: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        session: {
          select: {
            date: true,
            course: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(absences);
  } catch (err) {
    console.error("❌ GET /absences", err);
    res.status(500).json([]);
  }
});

/* -----------------------------------------------------------
   👤 GET /absences/student/:id
   Absences d’un élève (vue fiche élève)
----------------------------------------------------------- */
router.get("/student/:id", async (req, res) => {
  try {
    const studentId = req.params.id;
    let academicYearId = req.query.academicYearId as string | undefined;

    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      if (!currentYear) {
        return res.json([]);
      }
      academicYearId = currentYear.id;
    }

    const absences = await prisma.presence.findMany({
      where: {
        studentId,
        session: {
          course: {
            academicYearId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        status: true,
        justified: true,
        reason: true,
        session: {
          select: {
            date: true,
            course: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(absences);
  } catch (err) {
    console.error("❌ GET /absences/student/:id", err);
    res.status(500).json([]);
  }
});

/* -----------------------------------------------------------
   📝 POST /absences/session/:sessionId
   Enregistre l’appel d’une séance
----------------------------------------------------------- */
router.post("/session/:sessionId", async (req: AuthedRequest, res) => {
  try {
    const { sessionId } = req.params;
    const presences = req.body as {
      studentId: string;
      status: "present" | "absent" | "retard" | "justifie";
      reason?: string;
    }[];

    if (!Array.isArray(presences)) {
      return res.status(400).json({ error: "Payload invalide" });
    }

    // 🔥 Reset propre des présences de la session
    await prisma.presence.deleteMany({
      where: { sessionId },
    });

    if (presences.length > 0) {
      await prisma.presence.createMany({
        data: presences.map((p) => ({
          sessionId,
          studentId: p.studentId,
          status: p.status,
          justified: p.status === "justifie",
          reason: p.reason || null,
        })),
      });
    }

    res.json({ ok: true, count: presences.length });
  } catch (err) {
    console.error("❌ POST /absences/session/:sessionId", err);
    res.status(500).json({ error: "Erreur enregistrement absences" });
  }
});

export default router;
