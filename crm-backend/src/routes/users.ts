import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authRequired, requireRole, AuthedRequest } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "administratif"));

// 1) GET USERS
router.get("/", async (req, res) => {
  const role = (req.query.role as string) || undefined;
  const academicYearId = (req.query.academicYearId as string) || undefined;

  try {
    // Si pas d'année spécifiée, récupérer l'année courante
    let targetYearId = academicYearId;
    if (!targetYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null }
      });
      if (!currentYear) {
        return res.status(400).json({ error: "Aucune année académique courante trouvée." });
      }
      targetYearId = currentYear.id;
    }

    // 🔥 NOUVEAU: Filtrer via StudentEnrollment
    let enrollmentWhere: any = {
      academicYearId: targetYearId,
      deletedAt: null
    };

    if (role) {
      enrollmentWhere.role = role;
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      orderBy: { createdAt: "asc" },
      include: {
        student: {
          include: {
            subGroups: {
              where: { deletedAt: null },
              include: { 
                group: true
              },
            },
            courses: role === "prof" ? {
              where: { 
                deletedAt: null,
                academicYearId: targetYearId
              },
              select: {
                id: true,
                name: true,
              }
            } : false,
          }
        }
      }
    });

    // Extraire les users depuis les enrollments
    const users = enrollments.map(e => e.student);

    res.json(users);
  } catch (e) {
    console.error("Erreur /users GET:", e);
    res.status(500).json({ error: "Erreur lors du chargement des utilisateurs." });
  }
});

// 2) CREATE USER
router.post("/", async (req: AuthedRequest, res) => {
  const { email, firstName, lastName, role, subGroupCodes, academicYearId } = req.body;

  if (!email || !firstName || !lastName || !role) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  const tmpPass = "Ecole123!";

  try {
    // 1) Trouver l'année cible (paramètre ou année courante)
    let targetYearId = academicYearId as string | undefined;
    if (!targetYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });

      if (!currentYear) {
        return res.status(400).json({ error: "Aucune année académique courante" });
      }
      targetYearId = currentYear.id;
    }

    // Vérifier que l'année existe vraiment
    const yearExists = await prisma.academicYear.findUnique({
      where: { id: targetYearId },
      select: { id: true },
    });

    if (!yearExists) {
      console.error("❌ Année académique introuvable:", targetYearId);
      return res.status(400).json({ error: "Année académique invalide ou supprimée" });
    }

    console.log("✅ Création user sur année:", targetYearId);

    // 2) Créer l'utilisateur + inscription à l'année (StudentEnrollment)
    const result = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          password: bcrypt.hashSync(tmpPass, 10),
          subGroups: subGroupCodes
            ? { connect: subGroupCodes.map((code: string) => ({ code })) }
            : undefined,
        },
        include: {
          subGroups: { include: { group: true } },
        },
      });

      await tx.studentEnrollment.create({
        data: {
          studentId: createdUser.id,
          academicYearId: targetYearId!,
          role: role || "eleve",
        },
      });

      return createdUser;
    });

    res.status(201).json({
      user: result,
      temporaryPassword: tmpPass,
    });
  } catch (e) {
    console.error("Erreur /users POST:", e);
    res.status(500).json({ error: "Erreur lors de la création." });
  }
});

// 3) UPDATE USER
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName, role, subGroupCodes } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(email ? { email: email.trim() } : {}),
        ...(firstName ? { firstName: firstName.trim() } : {}),
        ...(lastName ? { lastName: lastName.trim() } : {}),
        ...(role ? { role } : {}),
        ...(subGroupCodes
          ? {
              subGroups: {
                set: [],
                connect: subGroupCodes.map(code => ({ code })),
              },
            }
          : {}),
      },
      include: {
        subGroups: { include: { group: true } },
      },
    });

    res.json(updated);
  } catch (e) {
    console.error("Erreur /users PATCH:", e);
    res.status(500).json({ error: "Erreur lors de la modification." });
  }
});

// 4) DELETE USER
router.delete("/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("Erreur /users DELETE:", e);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

export default router;
