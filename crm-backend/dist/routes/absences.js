// src/routes/absences.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middlewares/auth.js";
const prisma = new PrismaClient();
const router = Router();
router.use(authRequired);
// 🔹 Liste toutes les absences / présences (pour la vue admin)
router.get("/", async (_req, res) => {
    try {
        const data = await prisma.presence.findMany({
            include: {
                student: { select: { firstName: true, lastName: true, email: true } },
                session: {
                    include: {
                        course: { select: { name: true, day: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(data);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur de chargement des absences." });
    }
});
// 🔹 Marquer les présences/absences d'une session
router.post("/mark", async (req, res) => {
    const { courseId, date, presences } = req.body;
    if (!courseId || !date || !Array.isArray(presences)) {
        return res.status(400).json({ error: "Données manquantes ou invalides." });
    }
    try {
        const session = await prisma.courseSession.create({
            data: {
                date: new Date(date),
                startTime: new Date(date),
                endTime: new Date(new Date(date).getTime() + 2 * 60 * 60 * 1000),
                courseId,
                createdById: req.user.id,
            },
        });
        const created = await prisma.$transaction(presences.map((p) => prisma.presence.create({
            data: {
                sessionId: session.id,
                studentId: p.studentId,
                status: p.status,
                reason: p.reason || null,
                justified: p.justified || false,
            },
        })));
        res.json({ session, count: created.length });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur lors de la création des présences." });
    }
});
// 🔹 Modifier une absence (justifiée / validée)
router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { justified, validatedByAdmin, status, reason } = req.body;
    try {
        const up = await prisma.presence.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(reason && { reason }),
                ...(justified !== undefined && { justified }),
                ...(validatedByAdmin !== undefined && { validatedByAdmin }),
            },
            include: {
                student: true,
                session: { include: { course: true } },
            },
        });
        res.json(up);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur lors de la mise à jour de l'absence." });
    }
});
// 🔹 Supprimer une absence
router.delete("/:id", async (req, res) => {
    try {
        await prisma.presence.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur lors de la suppression." });
    }
});
export default router;
