// =============================================
//  routes/prof.ts — VERSION OPTION A (ÉLÈVES DU COURS)
// =============================================
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middlewares/auth.js";
const prisma = new PrismaClient();
const router = Router();
// 🔐 Toutes les routes ici nécessitent un token
router.use(authRequired);
/**
 * 🧑‍🏫 GET /prof/planning
 * - Sessions dont il est prof
 * - Sessions où il est co-prof d’un module
 * - Les élèves du COURS (via les sous-groupes)
 */
router.get("/planning", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Utilisateur non authentifié." });
        }
        // 🔍 Récupération des sessions liées au prof
        const sessions = await prisma.courseSession.findMany({
            where: {
                OR: [
                    { professorId: userId },
                    { course: { professors: { some: { id: userId } } } },
                ],
            },
            orderBy: { startTime: "asc" },
            include: {
                course: {
                    include: {
                        subGroups: {
                            include: {
                                students: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                    },
                },
                professor: {
                    select: { id: true, firstName: true, lastName: true },
                },
                salle: {
                    select: { id: true, name: true },
                },
            },
        });
        // 📦 Formatage pour FullCalendar
        const formatted = sessions.map((s) => {
            // 🔥 récupération des élèves du cours
            const students = s.course.subGroups.flatMap((sg) => sg.students);
            return {
                id: s.id,
                title: `${s.course.name} — ${s.professor
                    ? `${s.professor.firstName} ${s.professor.lastName}`
                    : "—"}${s.salle ? " 📍 " + s.salle.name : ""}`,
                start: s.startTime,
                end: s.endTime,
                extendedProps: {
                    course: s.course,
                    professor: s.professor,
                    salle: s.salle,
                    students: students, // 🔥 ICI : les vrais élèves du module
                },
                backgroundColor: "#2563eb",
                borderColor: "#1e3a8a",
                textColor: "#ffffff",
            };
        });
        console.log(`👨‍🏫 Prof ${userId} → ${formatted.length} sessions trouvées`);
        res.json(formatted);
    }
    catch (err) {
        console.error("❌ Erreur GET /prof/planning :", err);
        res.status(500).json({ error: "Erreur chargement planning prof." });
    }
});
export default router;
