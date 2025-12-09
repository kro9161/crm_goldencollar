// crm-backend/src/routes/groups.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

import { authRequired, requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "administratif")); // 🔒 Sécurité

// ---------------------------------------------------
// GET — Tous les groupes des années en cours (ou année spécifique)
// ---------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { academicYearId } = req.query;

    let yearIds: string[] = [];

    if (academicYearId) {
      // Filtrer par une année spécifique (mode archivé)
      yearIds = [academicYearId as string];
    } else {
      // Récupérer toutes les années en cours (Octobre ET Février)
      const currentYears = await prisma.academicYear.findMany({
        where: { isCurrent: true, isArchived: false },
        select: { id: true, name: true, session: true }
      });
      yearIds = currentYears.map(y => y.id);
    }

    const groups = await prisma.group.findMany({
      where: { 
        academicYearId: { in: yearIds },
        deletedAt: null 
      },
      include: { 
        subGroups: { 
          where: { deletedAt: null } 
        },
        academicYear: {
          select: { id: true, name: true, session: true }
        }
      },
      orderBy: { name: "asc" },
    });

    const formatted = groups.map((g) => ({
      id: g.id,
      name: g.name,
      label: g.label,
      academicYearId: g.academicYearId,
      academicYear: g.academicYear, // Inclure les infos de l'année (nom, session)
      subGroupCount: g.subGroups.length,
    }));

    res.json(formatted);

  } catch (err) {
    console.error("Erreur GET /groups", err);
    res.status(500).json({ error: "Erreur chargaement groupes" });
  }
});

// ---------------------------------------------------
// POST — Créer un groupe
// ---------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { name, label, academicYearId } = req.body;
    if (!academicYearId) {
      return res.status(400).json({ error: "academicYearId requis" });
    }

    const created = await prisma.group.create({
      data: {
        name,
        label: label ?? null,
        academicYearId,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Erreur POST /groups", err);
    res.status(500).json({ error: "Erreur création groupe" });
  }
});

// ---------------------------------------------------
// PATCH — Modifier un groupe
// ---------------------------------------------------
router.patch("/:id", async (req, res) => {
  try {
    const { name, label } = req.body;

    const updated = await prisma.group.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(label !== undefined && { label }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Erreur PATCH /groups/:id", err);
    res.status(500).json({ error: "Erreur modification groupe" });
  }
});

// ---------------------------------------------------
// DELETE — Supprimer un groupe (soft delete + cascade sous-groupes)
// ---------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete des sous-groupes associés
    await prisma.subGroup.updateMany({
      where: { groupId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    
    // Soft delete du groupe
    await prisma.group.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: "Groupe supprimé" });
  } catch (err) {
    console.error("Erreur DELETE /groups/:id", err);
    res.status(500).json({ error: "Erreur suppression groupe" });
  }
});

export default router;
