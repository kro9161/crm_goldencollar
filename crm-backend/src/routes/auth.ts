import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const router = Router();

/**
 * 🔐 POST /auth/login
 * Authentification utilisateur
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({
        error: "Email et mot de passe requis",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    // 🔒 Toujours le même message (sécurité)
    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const passwordOk = bcrypt.compareSync(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "24h" }
    );

    // ✅ Réponse propre pour le front
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    console.error("❌ POST /auth/login", err);
    res.status(500).json({ error: "Erreur interne d'authentification" });
  }
});

export default router;
