import express from "express";
import { PrismaClient } from "@prisma/client";
const router = express.Router();
const prisma = new PrismaClient();
// 🔍 GET - Liste des cours
router.get("/", async (_req, res) => {
    try {
        const courses = await prisma.course.findMany({
            include: {
                professors: true,
                subGroups: {
                    include: {
                        group: true
                    }
                }
            },
            orderBy: { name: "asc" },
        });
        res.json(courses);
    }
    catch (err) {
        console.error("Erreur chargement cours :", err);
        res.status(500).json({ error: "Erreur lors du chargement des cours" });
    }
});
// ➕ POST - Créer un cours
router.post("/", async (req, res) => {
    try {
        const { name, type, domain, totalHours, totalSessions, professorIds, subGroupIds, } = req.body;
        const course = await prisma.course.create({
            data: {
                name,
                type,
                domain,
                totalHours: totalHours ? parseInt(totalHours) : null,
                totalSessions: totalSessions ? parseInt(totalSessions) : null,
                professors: {
                    connect: professorIds?.map((id) => ({ id })) || [],
                },
                subGroups: {
                    connect: subGroupIds?.map((id) => ({ id })) || [],
                },
            },
            include: {
                professors: true,
                subGroups: {
                    include: { group: true }
                },
            },
        });
        res.status(201).json(course);
    }
    catch (err) {
        console.error("Erreur création cours :", err);
        res.status(500).json({ error: "Erreur lors de la création du cours" });
    }
});
// ✏️ PATCH - Modifier un cours
router.patch("/:id", async (req, res) => {
    try {
        const { name, type, domain, totalHours, totalSessions, professorIds, subGroupIds, } = req.body;
        const updated = await prisma.course.update({
            where: { id: req.params.id },
            data: {
                name,
                type,
                domain,
                totalHours: totalHours ? parseInt(totalHours) : null,
                totalSessions: totalSessions ? parseInt(totalSessions) : null,
                professors: {
                    set: [],
                    connect: professorIds?.map((id) => ({ id })) || [],
                },
                subGroups: {
                    set: [],
                    connect: subGroupIds?.map((id) => ({ id })) || [],
                },
            },
            include: {
                professors: true,
                subGroups: {
                    include: { group: true }
                },
            },
        });
        res.json(updated);
    }
    catch (err) {
        console.error("Erreur mise à jour cours :", err);
        res.status(500).json({ error: "Erreur lors de la modification du cours" });
    }
});
// 🗑️ DELETE - Supprimer un cours
router.delete("/:id", async (req, res) => {
    try {
        await prisma.course.delete({
            where: { id: req.params.id },
        });
        res.json({ message: "Cours supprimé" });
    }
    catch (err) {
        console.error("Erreur suppression cours :", err);
        res.status(500).json({ error: "Erreur lors de la suppression du cours" });
    }
});
export default router;
