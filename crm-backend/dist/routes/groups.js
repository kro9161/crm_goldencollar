// crm-backend/src/routes/groups.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middlewares/auth.js";
const prisma = new PrismaClient();
const router = Router();
router.use(authRequired);
// 📌 GET - Tous les groupes
router.get("/", async (_req, res) => {
    try {
        const groups = await prisma.group.findMany({
            include: { subGroups: true },
            orderBy: { name: "asc" },
        });
        res.json(groups);
    }
    catch (err) {
        console.error("Erreur GET /groups", err);
        res.status(500).json({ error: "Erreur chargement groupes" });
    }
});
// 📌 POST - Créer un groupe
router.post("/", async (req, res) => {
    try {
        const { name, label } = req.body;
        const created = await prisma.group.create({
            data: {
                name,
                label: label ?? null,
            },
        });
        res.status(201).json(created);
    }
    catch (err) {
        console.error("Erreur POST /groups", err);
        res.status(500).json({ error: "Erreur création groupe" });
    }
});
// 📌 PATCH - Modifier un groupe
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
    }
    catch (err) {
        console.error("Erreur PATCH /groups/:id", err);
        res.status(500).json({ error: "Erreur modification groupe" });
    }
});
// 📌 DELETE - Supprimer un groupe
router.delete("/:id", async (req, res) => {
    try {
        await prisma.group.delete({ where: { id: req.params.id } });
        res.json({ message: "Groupe supprimé" });
    }
    catch (err) {
        console.error("Erreur DELETE /groups/:id", err);
        res.status(500).json({ error: "Erreur suppression groupe" });
    }
});
export default router;
