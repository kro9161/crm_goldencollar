import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, AuthedRequest } from "../middlewares/auth.js";

const router = Router();
const prisma = new PrismaClient();

router.use(authRequired);

/* -----------------------------------------------------------
   1️⃣  POST /courses/:sessionId/attendance
   Enregistre la présence/absence d’une séance
----------------------------------------------------------- */
router.post("/courses/:sessionId/attendance", async (req: AuthedRequest, res) => {
  try {
    const { sessionId } = req.params;
    const data = req.body as { studentId: string; status: string }[];

    if (!data || data.length === 0) {
      return res.status(400).json({ error: "Aucune donnée d'appel fournie" });
    }

    // Supprimer d’abord les anciennes présences pour cette séance
    await prisma.presence.deleteMany({ where: { sessionId } });

    // Réinsérer les nouvelles présences
    const inserted = await prisma.presence.createMany({
      data: data.map((d) => ({
        sessionId,
        studentId: d.studentId,
        status: d.status,
        justified: d.status === "justifie",
      })),
    });

    res.status(201).json({ message: "Présences enregistrées", count: inserted.count });
  } catch (error) {
    console.error("❌ Erreur POST /courses/:sessionId/attendance", error);
    res.status(500).json({ error: "Erreur enregistrement appel" });
  }
});

/* -----------------------------------------------------------
   2️⃣  GET /eleve/absences/:id
   Récupère toutes les absences d’un élève
----------------------------------------------------------- */
router.get("/eleve/absences/:id", async (req, res) => {
  try {
    const studentId = req.params.id;
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

    const absences = await prisma.presence.findMany({
      where: { 
        studentId,
        session: { course: { academicYearId, deletedAt: null } }
      },
      include: {
        session: {
          include: {
            course: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(absences);
  } catch (error) {
    console.error("❌ Erreur GET /eleve/absences/:id", error);
    res.status(500).json({ error: "Erreur récupération absences" });
  }
});

export default router;
