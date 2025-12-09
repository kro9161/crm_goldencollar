import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authRequired } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
const router = Router();
// Toutes les routes nécessitent un token
router.use(authRequired);
//
// 1️⃣ GET /users — Liste des utilisateurs
//     GET /users?role=eleve → filtre par rôle
//
router.get("/", async (req, res) => {
    const role = req.query.role || undefined;
    try {
        const users = await prisma.user.findMany({
            where: role ? { role } : undefined,
            orderBy: { createdAt: "desc" },
            include: {
                subGroup: {
                    include: { group: true },
                },
            },
        });
        res.json(users);
    }
    catch (e) {
        console.error("Erreur /users GET:", e);
        res.status(500).json({ error: "Erreur lors du chargement des utilisateurs." });
    }
});
//
// 2️⃣ POST /users — Créer un utilisateur
//
router.post("/", async (req, res) => {
    const { email, firstName, lastName, role, subGroupId } = req.body;
    if (!email || !firstName || !lastName || !role) {
        return res.status(400).json({ error: "Champs obligatoires manquants." });
    }
    const tmpPass = "Ecole123!";
    try {
        const user = await prisma.user.create({
            data: {
                email: email.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                role,
                subGroupId: subGroupId || null,
                password: bcrypt.hashSync(tmpPass, 10),
            },
            include: {
                subGroup: { include: { group: true } },
            },
        });
        res.status(201).json({
            user,
            temporaryPassword: tmpPass,
        });
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return res.status(409).json({ error: "Email déjà utilisé." });
        }
        console.error("Erreur /users POST:", e);
        res.status(500).json({ error: "Erreur lors de la création." });
    }
});
//
// 3️⃣ PATCH /users/:id — Modifier un utilisateur
//
router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { email, firstName, lastName, role, subGroupId } = req.body;
    try {
        const updated = await prisma.user.update({
            where: { id },
            data: {
                ...(email !== undefined ? { email: email.trim() } : {}),
                ...(firstName !== undefined ? { firstName: firstName.trim() } : {}),
                ...(lastName !== undefined ? { lastName: lastName.trim() } : {}),
                ...(role !== undefined ? { role } : {}),
                ...(subGroupId !== undefined ? { subGroupId: subGroupId || null } : {}),
            },
            include: {
                subGroup: { include: { group: true } },
            },
        });
        res.json(updated);
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return res.status(409).json({ error: "Email déjà utilisé." });
        }
        console.error("Erreur /users PATCH:", e);
        res.status(500).json({ error: "Erreur lors de la modification." });
    }
});
//
// 4️⃣ DELETE /users/:id — Supprimer un utilisateur
//
router.delete("/:id", async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error("Erreur /users DELETE:", e);
        res.status(500).json({ error: "Erreur lors de la suppression." });
    }
});
export default router;
