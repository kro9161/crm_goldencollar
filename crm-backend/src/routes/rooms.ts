// crm-backend/src/routes/rooms.ts

import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const router = Router();
const prisma = new PrismaClient();

/**
 * 🔐 Sécurité
 * - utilisateur connecté
 * - rôle admin ou administratif
 */
router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/**
 * 🧭 GET /rooms
 * Liste de toutes les salles
 */
router.get("/", async (_req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { name: "asc" },
    });

    res.json(rooms);
  } catch (err) {
    console.error("❌ Erreur GET /rooms :", err);
    res.status(500).json({ error: "Erreur chargement des salles" });
  }
});

/**
 * ➕ POST /rooms
 * Créer une salle
 */
router.post("/", async (req, res) => {
  const { name, capacity } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "Le nom de la salle est obligatoire",
    });
  }

  try {
    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        capacity: capacity ?? null,
      },
    });

    res.status(201).json(room);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({
        error: "Une salle avec ce nom existe déjà",
      });
    }

    console.error("❌ Erreur POST /rooms :", err);
    res.status(500).json({ error: "Erreur création salle" });
  }
});

/**
 * ✏️ PATCH /rooms/:id
 * Modifier une salle
 */
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, capacity } = req.body;

  try {
    const updated = await prisma.room.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(capacity !== undefined && { capacity }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Erreur PATCH /rooms/:id :", err);
    res.status(500).json({ error: "Erreur modification salle" });
  }
});

/**
 * 🗑️ DELETE /rooms/:id
 * Suppression définitive
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.room.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erreur DELETE /rooms/:id :", err);
    res.status(500).json({ error: "Erreur suppression salle" });
  }
});

export default router;
