// crm-backend/src/routes/eleves.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middlewares/auth.js";
const prisma = new PrismaClient();
const router = Router();
router.use(authRequired);
/**
 * 📌 GET /eleves
 * Liste tous les élèves (avec sous-groupe si assigné)
 */
router.get("/", async (_req, res) => {
    try {
        const eleves = await prisma.user.findMany({
            where: { role: "eleve" },
            include: {
                subGroups: {
                    include: {
                        group: true,
                    },
                },
            },
            orderBy: { lastName: "asc" },
        });
        res.json(eleves);
    }
    catch (err) {
        console.error("❌ Erreur GET /eleves :", err);
        res.status(500).json({ error: "Erreur lors du chargement des élèves" });
    }
});
/**
 * 📌 POST /eleves
 * Créer un élève (sans mot de passe visible)
 */
router.post("/", async (req, res) => {
    try {
        const { email, firstName, lastName, subGroupId } = req.body;
        if (!email || !firstName || !lastName) {
            return res.status(400).json({ error: "Champs obligatoires manquants" });
        }
        const existing = await prisma.user.findFirst({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: "Cet email existe déjà" });
        }
        const password = Math.random().toString(36).slice(-8); // mot de passe temporaire
        const created = await prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                password,
                role: "eleve",
                subGroupId: subGroupId || null,
            },
        });
        res.status(201).json({
            message: "Élève créé",
            temporaryPassword: password,
            eleve: created,
        });
    }
    catch (err) {
        console.error("❌ Erreur POST /eleves :", err);
        res.status(500).json({ error: "Erreur création élève" });
    }
});
/**
 * 📌 PATCH /eleves/:id
 * Modifier un élève
 */
router.patch("/:id", async (req, res) => {
    try {
        const { firstName, lastName, email, subGroupId } = req.body;
        const updated = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                ...(firstName !== undefined ? { firstName } : {}),
                ...(lastName !== undefined ? { lastName } : {}),
                ...(email !== undefined ? { email } : {}),
                ...(subGroupId !== undefined ? { subGroupId } : {}),
            },
            include: {
                subGroups: {
                    include: { group: true },
                },
            },
        });
        res.json(updated);
    }
    catch (err) {
        console.error("❌ Erreur PATCH /eleves/:id :", err);
        res.status(500).json({ error: "Erreur mise à jour élève" });
    }
});
/**
 * 📌 DELETE /eleves/:id
 */
router.delete("/:id", async (req, res) => {
    try {
        await prisma.user.delete({
            where: { id: req.params.id },
        });
        res.json({ message: "Élève supprimé" });
    }
    catch (err) {
        console.error("❌ Erreur DELETE /eleves/:id :", err);
        res.status(500).json({ error: "Erreur suppression élève" });
    }
});
export default router;
