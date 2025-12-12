import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

/**
 * --- Simple in-memory cache ---
 * Cache uniquement pour GET /groups sans academicYearId
 * Invalidation automatique sur POST / PATCH / DELETE
 */
let groupsCache: { data: any; expires: number } | null = null;

// ---------------------------------------------------
// MIDDLEWARES
// ---------------------------------------------------
router.use(authRequired);
router.use(requireRole("admin", "administratif")); // 🔒 Accès restreint

// ---------------------------------------------------
// GET /groups
// Groupes des années en cours OU d’une année spécifique
// ---------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const academicYearId = req.query.academicYearId as string | undefined;
    const now = Date.now();

    // ♻️ Cache uniquement si aucune année spécifique demandée
    if (!academicYearId && groupsCache && groupsCache.expires > now) {
      return res.json(groupsCache.data);
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

    const groups = await prisma.group.findMany({
      where: {
        academicYearId: { in: yearIds },
        deletedAt: null,
      },
      include: {
        subGroups: {
          where: { deletedAt: null },
        },
        academicYear: {
          select: { id: true, name: true, session: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = groups.map((g) => ({
      id: g.id,
      name: g.name,
      label: g.label,
      academicYearId: g.academicYearId,
      academicYear: g.academicYear,
      subGroupCount: g.subGroups.length,
    }));

    // 💾 Mise en cache uniquement sans filtre
    if (!academicYearId) {
      groupsCache = {
        data: formatted,
        expires: now + 60_000,
      };
    }

    res.json(formatted);
  } catch (err) {
    console.error("❌ Erreur GET /groups :", err);
    res.status(500).json({ error: "Erreur chargement groupes" });
  }
});

// ---------------------------------------------------
// Invalidation du cache sur toute écriture
// ---------------------------------------------------
["post", "patch", "delete"].forEach((method) => {
  (router as any)[method]("*", (_req: any, _res: any, next: any) => {
    groupsCache = null;
    next();
  });
});

// ---------------------------------------------------
// POST /groups
// Créer un groupe
// ---------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { name, label, academicYearId } = req.body;

    if (!name || !academicYearId) {
      return res.status(400).json({
        error: "Champs requis : name, academicYearId",
      });
    }

    const created = await prisma.group.create({
      data: {
        name: name.trim(),
        label: label?.trim() || null,
        academicYearId,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("❌ Erreur POST /groups :", err);
    res.status(500).json({ error: "Erreur création groupe" });
  }
});

// ---------------------------------------------------
// PATCH /groups/:id
// Modifier un groupe
// ---------------------------------------------------
router.patch("/:id", async (req, res) => {
  try {
    const { name, label } = req.body;

    const updated = await prisma.group.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(label !== undefined && { label: label?.trim() || null }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Erreur PATCH /groups/:id :", err);
    res.status(500).json({ error: "Erreur modification groupe" });
  }
});

// ---------------------------------------------------
// DELETE /groups/:id
// Suppression logique + sous-groupes
// ---------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete des sous-groupes
    await prisma.subGroup.updateMany({
      where: {
        groupId: id,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    // Soft delete du groupe
    await prisma.group.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erreur DELETE /groups/:id :", err);
    res.status(500).json({ error: "Erreur suppression groupe" });
  }
});

export default router;
