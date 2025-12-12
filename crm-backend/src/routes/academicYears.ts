// crm-backend/src/routes/academicYears.ts

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole, AuthedRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

/**
 * --- Simple in-memory cache ---
 * Reset toutes les 60s ou à la moindre écriture (POST / PATCH / DELETE)
 */
let yearsCache: { data: any; expires: number } | null = null;

router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/**
 * 📅 GET /academic-years
 * Liste toutes les années académiques (non supprimées)
 */
router.get("/", async (req, res) => {
  try {
    const now = Date.now();

    if (yearsCache && yearsCache.expires > now) {
      return res.json(yearsCache.data);
    }

    const years = await prisma.academicYear.findMany({
      where: { deletedAt: null },
      orderBy: [
        { isCurrent: "desc" },
        { session: "asc" },
        { name: "asc" },
      ],
    });

    yearsCache = {
      data: years,
      expires: now + 60_000,
    };

    res.json(years);
  } catch (err) {
    console.error("❌ Erreur GET /academic-years:", err);
    res.status(500).json({ error: "Erreur chargement années académiques" });
  }
});

/**
 * 🔄 Invalidation du cache sur toute écriture
 */
["post", "patch", "delete"].forEach((method) => {
  (router as any)[method]("*", (req: any, res: any, next: any) => {
    yearsCache = null;
    next();
  });
});

/**
 * 📅 GET /academic-years/current
 * Récupère l'année académique en cours
 */
router.get("/current", async (req, res) => {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true, isArchived: false },
      include: {
        periodes: true,
        _count: {
          select: {
            groups: true,
            courses: true,
            enrollments: true,
          },
        },
      },
    });

    if (!currentYear) {
      return res.status(404).json({
        error: "Aucune année académique active.",
      });
    }

    res.json(currentYear);
  } catch (err) {
    console.error("❌ Erreur GET /academic-years/current:", err);
    res.status(500).json({ error: "Erreur récupération année courante" });
  }
});

/**
 * 📋 GET /academic-years/:id/details
 */
router.get("/:id/details", async (req, res) => {
  try {
    const { id } = req.params;

    const year = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        groups: {
          where: { deletedAt: null },
          include: {
            subGroups: {
              where: { deletedAt: null },
              include: {
                students: {
                  where: { deletedAt: null },
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        courses: {
          where: { deletedAt: null },
          include: {
            professors: {
              where: { deletedAt: null },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            subGroups: {
              where: { deletedAt: null },
              select: { id: true, code: true, label: true },
            },
          },
        },
      },
    });

    if (!year) {
      return res.status(404).json({ error: "Année introuvable" });
    }

    res.json(year);
  } catch (err) {
    console.error("❌ Erreur GET /academic-years/:id/details:", err);
    res.status(500).json({ error: "Erreur récupération détails année" });
  }
});

/**
 * ➕ POST /academic-years
 */
router.post("/", async (req: AuthedRequest, res) => {
  try {
    const { name, session, startDate, endDate, isCurrent } = req.body;

    if (!name || !session || !startDate || !endDate) {
      return res.status(400).json({
        error: "Champs requis : name, session, startDate, endDate",
      });
    }

    if (!["octobre", "fevrier"].includes(session.toLowerCase())) {
      return res.status(400).json({
        error: "Session doit être 'octobre' ou 'fevrier'",
      });
    }

    const year = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        session: session.toLowerCase(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: Boolean(isCurrent),
      },
    });

    res.status(201).json(year);
  } catch (err: any) {
    console.error("❌ Erreur POST /academic-years:", err);

    if (err.code === "P2002") {
      return res.status(409).json({
        error: "Une année avec ce nom existe déjà",
      });
    }

    res.status(500).json({ error: "Erreur création année académique" });
  }
});

/**
 * ✏️ PATCH /academic-years/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, session, startDate, endDate } = req.body;

    const data: any = {};

    if (name) data.name = name.trim();
    if (session) {
      if (!["octobre", "fevrier"].includes(session.toLowerCase())) {
        return res.status(400).json({
          error: "Session doit être 'octobre' ou 'fevrier'",
        });
      }
      data.session = session.toLowerCase();
    }
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);

    const updated = await prisma.academicYear.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Erreur PATCH /academic-years/:id:", err);
    res.status(500).json({ error: "Erreur modification année" });
  }
});

/**
 * 🗑️ DELETE /academic-years/:id (soft delete)
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const year = await prisma.academicYear.findUnique({ where: { id } });

    if (year?.isCurrent) {
      return res.status(400).json({
        error: "Impossible de supprimer l'année en cours",
      });
    }

    await prisma.academicYear.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erreur DELETE /academic-years/:id:", err);
    res.status(500).json({ error: "Erreur suppression année" });
  }
});

export default router;
