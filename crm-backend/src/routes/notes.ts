import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole, AuthedRequest } from "../middlewares/auth.js";

const router = Router();
const prisma = new PrismaClient();

/* ===================================================
   Sécurité globale
=================================================== */
router.use(authRequired);

/* ===================================================
   POST /notes
   Créer une note
   Rôles : admin, administratif, prof
=================================================== */
router.post(
  "/",
  requireRole("admin", "administratif", "prof"),
  async (req: AuthedRequest, res) => {
    try {
      const { studentId, courseId, valeur, commentaire, sessionId } = req.body;

      if (!studentId || !courseId || valeur === undefined) {
        return res.status(400).json({
          error: "studentId, courseId et valeur sont requis",
        });
      }

      const note = await prisma.note.create({
        data: {
          studentId,
          courseId,
          valeur: Number(valeur),
          commentaire: commentaire?.trim() || null,
          sessionId: sessionId || null,
        },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          course: {
            select: { id: true, name: true },
          },
        },
      });

      res.status(201).json(note);
    } catch (err) {
      console.error("❌ POST /notes", err);
      res.status(500).json({ error: "Erreur création note" });
    }
  }
);

/* ===================================================
   GET /notes/eleve/:id
   Récupérer les notes d’un élève
   - l’élève lui-même
   - admin / administratif / prof
=================================================== */
router.get("/eleve/:id", async (req: AuthedRequest, res) => {
  try {
    const askedStudentId = req.params.id;
    const user = req.user!;

    // 🔐 Sécurité : un élève ne voit que ses notes
    if (user.role === "eleve" && user.id !== askedStudentId) {
      return res.status(403).json({ error: "Accès interdit" });
    }

    const notes = await prisma.note.findMany({
      where: {
        studentId: askedStudentId,
        deletedAt: null,
      },
      include: {
        course: {
          select: { id: true, name: true },
        },
        session: {
          select: {
            id: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(notes);
  } catch (err) {
    console.error("❌ GET /notes/eleve/:id", err);
    res.status(500).json({ error: "Erreur chargement notes" });
  }
});

export default router;
