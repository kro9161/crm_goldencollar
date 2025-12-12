// crm-backend/src/routes/filieres.ts

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

/**
 * --- Simple in-memory cache ---
 * Reset toutes les 60s ou à la moindre écriture
 */
let filieresCache: { data: any; expires: number } | null = null;

router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/**
 * 📚 GET /filieres
 * Liste des filières (par année académique ou années courantes)
 * ?academicYearId=xxx (optionnel)
 */
router.get("/", async (req, res) => {
  try {
    const academicYearId = req.query.academicYearId as string | undefined;
    const now = Date.now();

    if (!academicYearId && filieresCache && filieresCache.expires > now) {
      return res.json(filieresCache.data);
    }

    let yearIds: string[];

    if (academicYearId) {
      yearIds = [academicYearId];
    } else {
      const currentYears = await prisma.academicYear.findMany({
        where: {
          isCurrent: true,
          isArchived: false,
          deletedAt: null,
        },
        select: { id: true },
      });
      yearIds = currentYears.map((y) => y.id);
    }

    const filieres = await prisma.filiere.findMany({
      where: {
        academicYearId: { in: yearIds },
        deletedAt: null,
      },
      include: {
        level: true,
        academicYear: {
          select: { id: true, name: true, session: true },
        },
        _count: {
          select: { users: true, courses: true },
        },
      },
      orderBy: { code: "asc" },
    });

    if (!academicYearId) {
      filieresCache = {
        data: filieres,
        expires: now + 60_000,
      };
    }

    res.json(filieres);
  } catch (err) {
    console.error("❌ Erreur GET /filieres:", err);
    res.status(500).json({ error: "Erreur chargement filières" });
  }
});

/**
 * 🔄 Invalidation du cache sur écriture
 */
["post", "patch", "delete"].forEach((method) => {
  (router as any)[method]("*", (req: any, res: any, next: any) => {
    filieresCache = null;
    next();
  });
});

/**
 * ➕ POST /filieres
 * Créer une filière
 */
router.post("/", async (req, res) => {
  try {
    const { code, label, academicYearId, levelId } = req.body;

    if (!code || !academicYearId) {
      return res.status(400).json({
        error: "Champs requis : code, academicYearId",
      });
    }

    const filiere = await prisma.filiere.create({
      data: {
        code: code.trim().toUpperCase(),
        label: label?.trim() || null,
        academicYearId,
        ...(levelId && { levelId }),
      },
      include: {
        level: true,
        _count: {
          select: { users: true, courses: true },
        },
      },
    });

    res.status(201).json(filiere);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "Cette filière existe déjà pour cette année",
      });
    }
    console.error("❌ Erreur POST /filieres:", err);
    res.status(500).json({ error: "Erreur création filière" });
  }
});

/**
 * ✏️ PATCH /filieres/:id
 * Modifier une filière
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { code, label, levelId } = req.body;

    const filiere = await prisma.filiere.update({
      where: { id },
      data: {
        ...(code && { code: code.trim().toUpperCase() }),
        ...(label !== undefined && { label: label?.trim() || null }),
        ...(levelId !== undefined && { levelId: levelId || null }),
      },
      include: {
        level: true,
        _count: {
          select: { users: true, courses: true },
        },
      },
    });

    res.json(filiere);
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Filière non trouvée" });
    }
    console.error("❌ Erreur PATCH /filieres/:id:", err);
    res.status(500).json({ error: "Erreur modification filière" });
  }
});

/**
 * 🗑️ DELETE /filieres/:id
 * Suppression logique
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.filiere.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ ok: true, id });
  } catch (err) {
    console.error("❌ Erreur DELETE /filieres/:id:", err);
    res.status(500).json({ error: "Erreur suppression filière" });
  }
});

export default router;
