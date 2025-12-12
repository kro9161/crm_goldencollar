import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import { authRequired, requireRole, AuthedRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

/**
 * 🔐 Sécurité
 * - Auth obligatoire
 * - ADMIN uniquement
 */
router.use(authRequired);
router.use(requireRole("admin"));

/**
 * 📄 Page HTML d’administration des permissions
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/permissions", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../public/admin-permissions.html"));
});

/**
 * 📋 GET /permissions/list
 * Liste toutes les permissions + leurs liens par rôle
 */
router.get("/permissions/list", async (_req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      include: {
        roleLinks: true,
      },
      orderBy: {
        key: "asc",
      },
    });

    res.json(permissions);
  } catch (err) {
    console.error("❌ GET /permissions/list", err);
    res.status(500).json({ error: "Erreur chargement permissions" });
  }
});

/**
 * 🔄 POST /permissions/toggle
 * Active / désactive une permission pour un rôle
 */
router.post("/permissions/toggle", async (req: AuthedRequest, res) => {
  try {
    const { role, key, value } = req.body;

    // ✅ Validation stricte
    if (
      typeof role !== "string" ||
      typeof key !== "string" ||
      typeof value !== "boolean"
    ) {
      return res.status(400).json({
        error: "Payload invalide (role, key, value requis)",
      });
    }

    // 🔹 Crée la permission si elle n’existe pas
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        label: key,
      },
    });

    // 🔹 Lien rôle ↔ permission
    const rolePermission = await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role,
          permissionId: permission.id,
        },
      },
      update: {
        value,
      },
      create: {
        role,
        permissionId: permission.id,
        value,
      },
    });

    res.json(rolePermission);
  } catch (err) {
    console.error("❌ POST /permissions/toggle", err);
    res.status(500).json({ error: "Erreur modification permission" });
  }
});

export default router;
