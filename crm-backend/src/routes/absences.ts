import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, AuthedRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);

/**
 * 🔹 GET /absences
 * Liste paginée des absences pour une année académique
 * ⚠️ Retourne TOUJOURS un tableau
 */
router.get("/", async (req, res) => {
  try {
    let academicYearId = req.query.academicYearId as string | undefined;

    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      academicYearId = currentYear?.id;
    }

    if (!academicYearId) {
      return res.json([]); // IMPORTANT : toujours un tableau
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const offset = Math.max(0, Number(req.query.offset) || 0);

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
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        session: {
          select: {
            date: true,
            course: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    res.json(absences);
  } catch (err) {
    console.error("❌ GET /absences", err);
    res.status(500).json({ error: "Erreur chargement absences" });
  }
});

/**
 * 🔹 POST /absences/mark
 * Marquer les présences pour un cours à une date donnée
 */
router.post("/mark", async (req: AuthedRequest, res) => {
  const { courseId, date, presences } = req.body;

  if (!courseId || !date || !Array.isArray(presences)) {
    return res.status(400).json({ error: "Données invalides" });
  }

  try {
    // 🔹 Une session = un cours + une date
    const session = await prisma.courseSession.findFirst({
      where: {
        courseId,
        date: new Date(date),
        deletedAt: null,
      },
    }) ?? await prisma.courseSession.create({
      data: {
        courseId,
        date: new Date(date),
        startTime: new Date(date),
        endTime: new Date(new Date(date).getTime() + 2 * 60 * 60 * 1000),
        createdById: req.user!.id,
      },
    });

    const created = await prisma.$transaction(
      presences.map((p: any) =>
        prisma.presence.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: p.studentId,
            },
          },
          update: {
            status: p.status,
            justified: p.justified || false,
            reason: p.reason || null,
          },
          create: {
            sessionId: session.id,
            studentId: p.studentId,
            status: p.status,
            justified: p.justified || false,
            reason: p.reason || null,
          },
        })
      )
    );

    res.json({ sessionId: session.id, count: created.length });
  } catch (err) {
    console.error("❌ POST /absences/mark", err);
    res.status(500).json({ error: "Erreur création absences" });
  }
});

/**
 * 🔹 PATCH /absences/:id
 * Modifier une absence
 */
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { status, justified, reason, validatedByAdmin } = req.body;

  try {
    const updated = await prisma.presence.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(reason !== undefined && { reason }),
        ...(justified !== undefined && { justified }),
        ...(validatedByAdmin !== undefined && { validatedByAdmin }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ PATCH /absences/:id", err);
    res.status(500).json({ error: "Erreur mise à jour absence" });
  }
});

/**
 * 🔹 DELETE /absences/:id
 * Suppression d'une absence
 */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.presence.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE /absences/:id", err);
    res.status(500).json({ error: "Erreur suppression absence" });
  }
});

export default router;
