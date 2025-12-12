// =============================================
// routes/subgroups.ts — VERSION PROPRE & STABLE
// =============================================

import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

// 🔐 Sécurité globale
router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/* =====================================================
   GET /subgroups
   - Tous les sous-groupes
   - Filtrés par année si fournie
===================================================== */
router.get("/", async (req, res) => {
  try {
    const academicYearId =
      (req.query.academicYearId as string) ||
      (req.headers["x-academic-year-id"] as string);

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

    const subGroups = await prisma.subGroup.findMany({
      where: {
        deletedAt: null,
        group: { academicYearId: { in: yearIds } },
      },
      include: {
        group: true,
        subGroupFilieres: { include: { filiere: true } },
        students: {
          where: {
            deletedAt: null,
            enrollments: {
              some: { academicYearId: { in: yearIds }, deletedAt: null },
            },
          },
        },
        courses: true,
      },
      orderBy: { code: "asc" },
    });

    res.json(subGroups);
  } catch (err) {
    console.error("❌ GET /subgroups :", err);
    res.status(500).json({ error: "Erreur chargement sous-groupes" });
  }
});

/* =====================================================
   GET /subgroups/:id
===================================================== */
router.get("/:id", async (req, res) => {
  try {
    const subGroup = await prisma.subGroup.findUnique({
      where: { id: req.params.id },
      include: {
        group: true,
        subGroupFilieres: { include: { filiere: true } },
        students: true,
        courses: true,
      },
    });

    if (!subGroup || subGroup.deletedAt) {
      return res.status(404).json({ error: "Sous-groupe non trouvé" });
    }

    res.json(subGroup);
  } catch (err) {
    console.error("❌ GET /subgroups/:id :", err);
    res.status(500).json({ error: "Erreur chargement sous-groupe" });
  }
});

/* =====================================================
   GET /subgroups/by-group/:groupId
===================================================== */
router.get("/by-group/:groupId", async (req, res) => {
  try {
    const academicYearId =
      (req.query.academicYearId as string) ||
      (req.headers["x-academic-year-id"] as string);

    const subGroups = await prisma.subGroup.findMany({
      where: {
        groupId: req.params.groupId,
        deletedAt: null,
      },
      include: {
        students: academicYearId
          ? {
              where: {
                deletedAt: null,
                enrollments: {
                  some: { academicYearId, deletedAt: null },
                },
              },
            }
          : undefined,
      },
      orderBy: { code: "asc" },
    });

    res.json(subGroups);
  } catch (err) {
    console.error("❌ GET /subgroups/by-group :", err);
    res.status(500).json({ error: "Erreur chargement sous-groupes du groupe" });
  }
});

/* =====================================================
   POST /subgroups
===================================================== */
router.post("/", async (req, res) => {
  try {
    const { code, label, groupId } = req.body;

    if (!code || !groupId) {
      return res.status(400).json({ error: "code et groupId requis" });
    }

    const created = await prisma.subGroup.create({
      data: {
        code,
        label: label ?? null,
        groupId,
      },
      include: {
        group: true,
        subGroupFilieres: { include: { filiere: true } },
        students: true,
        courses: true,
      },
    });

    res.status(201).json(created);
  } catch (e: any) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: "Ce code de sous-groupe existe déjà" });
    }

    console.error("❌ POST /subgroups :", e);
    res.status(500).json({ error: "Erreur création sous-groupe" });
  }
});

/* =====================================================
   PATCH /subgroups/:id
===================================================== */
router.patch("/:id", async (req, res) => {
  try {
    const { code, label, groupId } = req.body;

    const updated = await prisma.subGroup.update({
      where: { id: req.params.id },
      data: {
        ...(code !== undefined && { code }),
        ...(label !== undefined && { label }),
        ...(groupId !== undefined && { groupId }),
      },
      include: {
        group: true,
        subGroupFilieres: { include: { filiere: true } },
        students: true,
        courses: true,
      },
    });

    res.json(updated);
  } catch (e: any) {
    console.error("❌ PATCH /subgroups/:id :", e);

    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return res.status(409).json({ error: "Code déjà utilisé" });
    }

    res.status(500).json({ error: "Erreur modification sous-groupe" });
  }
});

/* =====================================================
   DELETE /subgroups/:id (soft delete)
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.subGroup.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE /subgroups/:id :", err);
    res.status(500).json({ error: "Erreur suppression sous-groupe" });
  }
});

/* =====================================================
   POST /subgroups/:id/filieres
   - crée OU lie une filière
===================================================== */
router.post("/:id/filieres", async (req, res) => {
  try {
    const { code, label, academicYearId, levelId } = req.body;

    if (!code || !academicYearId) {
      return res.status(400).json({ error: "code et academicYearId requis" });
    }

    let filiere = await prisma.filiere.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        academicYearId,
        deletedAt: null,
      },
    });

    if (!filiere) {
      filiere = await prisma.filiere.create({
        data: {
          code: code.trim().toUpperCase(),
          label: label?.trim() || null,
          academicYearId,
          ...(levelId && { levelId }),
        },
      });
    }

    await prisma.subGroupFiliere.create({
      data: {
        subGroupId: req.params.id,
        filiereId: filiere.id,
      },
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("❌ POST /subgroups/:id/filieres :", err);
    res.status(500).json({ error: "Erreur liaison filière" });
  }
});

/* =====================================================
   DELETE /subgroups/:subGroupId/filieres/:filiereId
===================================================== */
router.delete("/:subGroupId/filieres/:filiereId", async (req, res) => {
  try {
    await prisma.subGroupFiliere.delete({
      where: {
        subGroupId_filiereId: {
          subGroupId: req.params.subGroupId,
          filiereId: req.params.filiereId,
        },
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE liaison filière :", err);
    res.status(500).json({ error: "Erreur suppression liaison filière" });
  }
});

export default router;
