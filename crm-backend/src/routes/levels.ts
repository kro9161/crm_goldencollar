import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

/* ===================================================
   Sécurité
=================================================== */
router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/* ===================================================
   GET /levels
   Liste des niveaux (BAC+1 → BAC+5)
=================================================== */
router.get("/", async (_req, res) => {
  try {
    const levels = await prisma.level.findMany({
      where: { deletedAt: null },
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: { filieres: true },
        },
      },
    });

    res.json(levels);
  } catch (err) {
    console.error("❌ GET /levels", err);
    res.status(500).json({ error: "Erreur chargement niveaux" });
  }
});

/* ===================================================
   POST /levels
   Créer un niveau (BAC+1, BAC+2…)
=================================================== */
router.post("/", async (req, res) => {
  try {
    const { code, label } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "code requis" });
    }

    const level = await prisma.level.create({
      data: {
        code: code.toUpperCase().trim(),
        label: label?.trim() || null,
      },
      include: {
        _count: {
          select: { filieres: true },
        },
      },
    });

    res.status(201).json(level);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "Ce niveau existe déjà",
      });
    }

    console.error("❌ POST /levels", err);
    res.status(500).json({ error: "Erreur création niveau" });
  }
});

/* ===================================================
   PATCH /levels/:id
   Modifier un niveau
=================================================== */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { code, label } = req.body;

    const updated = await prisma.level.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase().trim() }),
        ...(label !== undefined && { label: label?.trim() || null }),
      },
      include: {
        _count: {
          select: { filieres: true },
        },
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Niveau introuvable" });
    }
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "Ce code de niveau existe déjà",
      });
    }

    console.error("❌ PATCH /levels/:id", err);
    res.status(500).json({ error: "Erreur modification niveau" });
  }
});

/* ===================================================
   DELETE /levels/:id
   Soft delete
=================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.level.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ ok: true, id });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Niveau introuvable" });
    }

    console.error("❌ DELETE /levels/:id", err);
    res.status(500).json({ error: "Erreur suppression niveau" });
  }
});

export default router;
