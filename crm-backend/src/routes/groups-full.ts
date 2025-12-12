// crm-backend/src/routes/groups-full.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "administratif"));  // 🔥 Sécurisation
/**
 * 📌 GET /groups/full
 * Renvoie toute la structure :
 * - groupes
 * - sous-groupes
 * - niveaux
 * - sessions
 * - nombre d'élèves par sous-groupe
 */
router.get("/full", async (_req, res) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        subGroups: {
          include: {
            students: { select: { id: true } }, // on ne récupère que l'id pour compter
          },
          orderBy: { code: "asc" }
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = groups.map((g) => ({
      id: g.id,
      name: g.name,
      label: g.label,
      subGroups: g.subGroups.map((sg) => ({
        id: sg.id,
        code: sg.code,
        label: sg.label,
        studentsCount: sg.students.length,
      })),
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Erreur GET /groups/full :", err);
    res.status(500).json({ error: "Erreur chargement structure groupes" });
  }
});

export default router;
