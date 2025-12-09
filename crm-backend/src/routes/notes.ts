import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, AuthedRequest } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const prisma = new PrismaClient();

router.use(authRequired);

// ➕ Créer une note
router.post("/", requireRole("admin", "administratif", "prof"), async (req: AuthedRequest, res) => {
  try {
    const { studentId, courseId, valeur, commentaire, sessionId } = req.body;

    if (!studentId || !courseId || valeur === undefined) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    const note = await prisma.note.create({
      data: {
        studentId,
        courseId,
        valeur: parseFloat(valeur),
        commentaire: commentaire || null,
        sessionId: sessionId || null,
      },
      include: { student: true, course: true },
    });

    res.status(201).json(note);
  } catch (err) {
    console.error("Erreur POST /notes :", err);
    res.status(500).json({ error: "Erreur création note" });
  }
});

// 🔍 Récupérer les notes d’un élève
router.get("/eleve/:id", async (req, res) => {
  try {

    const askedId = req.params.id;
const user = req.user;

if (user.role === "eleve" && user.id !== askedId) {
  return res.status(403).json({ error: "Accès interdit." });
}

    const notes = await prisma.note.findMany({
      where: { studentId: req.params.id },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(notes);
  } catch (err) {
    console.error("Erreur GET /notes/eleve :", err);
    res.status(500).json({ error: "Erreur chargement notes" });
  }
});

export default router;
