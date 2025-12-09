// crm-backend/src/routes/rooms.ts
import express from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const router = express.Router();
const prisma = new PrismaClient();

// 🔐 Sécurité : connexion obligatoire + rôle admin ou administratif
router.use(authRequired);
router.use(requireRole("admin", "administratif"));

// 🧭 GET — Liste de toutes les salles
router.get("/", async (_req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { name: "asc" },
    });
    res.json(rooms);
  } catch (err) {
    console.error("Erreur lors du chargement des salles :", err);
    res.status(500).json({ error: "Erreur lors du chargement des salles" });
  }
});

// 🆕 POST — Créer une salle
router.post("/", async (req, res) => {
  const { name, capacity } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Le nom de la salle est obligatoire." });
  }

  try {
    const room = await prisma.room.create({
      data: {
        name,
        capacity: capacity || null,
      } as any,
    });
    res.status(201).json(room);
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ error: "Une salle avec ce nom existe déjà." });
    } else {
      console.error("Erreur création salle :", e);
      res.status(500).json({ error: "Erreur lors de la création de la salle." });
    }
  }
});

// ✏️ PATCH — Modifier une salle
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, capacity } = req.body;

  try {
    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
      } as any,
    });
    res.json(room);
  } catch (e: any) {
    console.error("Erreur modification salle :", e);
    res.status(500).json({ error: "Erreur lors de la modification." });
  }
});

// 🗑️ DELETE — Supprimer une salle
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.room.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("Erreur suppression salle :", e);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

export default router;
