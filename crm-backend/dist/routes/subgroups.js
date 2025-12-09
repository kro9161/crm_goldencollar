// crm-backend/src/routes/subgroups.ts
import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authRequired } from "../middlewares/auth.js";
const prisma = new PrismaClient();
const router = Router();
router.use(authRequired);
/**
 * 📌 GET /subgroups
 * Liste tous les sous-groupes
 */
router.get("/", async (_req, res) => {
    try {
        const subGroups = await prisma.subGroup.findMany({
            include: {
                group: true,
                courses: true,
                students: true,
            },
            orderBy: { code: "asc" },
        });
        res.json(subGroups);
    }
    catch (err) {
        console.error("Erreur GET /subgroups :", err);
        res.status(500).json({ error: "Erreur chargement sous-groupes" });
    }
});
/**
 * 📌 GET /subgroups/by-group/:groupId
 * Liste les sous-groupes d’un groupe précis
 */
router.get("/by-group/:groupId", async (req, res) => {
    try {
        const subGroups = await prisma.subGroup.findMany({
            where: { groupId: req.params.groupId },
            orderBy: { code: "asc" },
        });
        res.json(subGroups);
    }
    catch (err) {
        console.error("Erreur GET /subgroups/by-group :", err);
        res.status(500).json({ error: "Erreur chargement sous-groupes du groupe" });
    }
});
/**
 * ➕ POST /subgroups
 * Créer un sous-groupe
 */
router.post("/", async (req, res) => {
    try {
        const { code, label, level, session, groupId } = req.body;
        if (!code || !groupId) {
            return res.status(400).json({ error: "Code et groupId requis." });
        }
        const created = await prisma.subGroup.create({
            data: {
                code,
                label: label ?? null,
                level: level ?? null,
                session: session ?? null,
                groupId,
            },
            include: { group: true },
        });
        res.status(201).json(created);
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return res.status(409).json({ error: "Ce code de sous-groupe existe déjà." });
        }
        console.error("Erreur POST /subgroups :", e);
        res.status(500).json({ error: "Erreur création sous-groupe." });
    }
});
/**
 * ✏️ PATCH /subgroups/:id
 * Modifier un sous-groupe
 */
router.patch("/:id", async (req, res) => {
    try {
        const { code, label, level, session, groupId } = req.body;
        const updated = await prisma.subGroup.update({
            where: { id: req.params.id },
            data: {
                ...(code !== undefined ? { code } : {}),
                ...(label !== undefined ? { label } : {}),
                ...(level !== undefined ? { level } : {}),
                ...(session !== undefined ? { session } : {}),
                ...(groupId !== undefined ? { groupId } : {}),
            },
            include: { group: true },
        });
        res.json(updated);
    }
    catch (e) {
        console.error("Erreur PATCH /subgroups/:id :", e);
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return res.status(409).json({ error: "Ce code existe déjà." });
        }
        res.status(500).json({ error: "Erreur mise à jour sous-groupe." });
    }
});
/**
 * 🗑️ DELETE /subgroups/:id
 */
router.delete("/:id", async (req, res) => {
    try {
        await prisma.subGroup.delete({
            where: { id: req.params.id },
        });
        res.json({ message: "Sous-groupe supprimé" });
    }
    catch (err) {
        console.error("Erreur DELETE /subgroups/:id :", err);
        res.status(500).json({ error: "Erreur lors de la suppression." });
    }
});
export default router;
