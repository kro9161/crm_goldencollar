// crm-backend/src/routes/eleves.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/**
 * 📌 GET /eleves
 * Liste des élèves pour une année académique
 */
router.get("/", async (req, res) => {
  let academicYearId = req.query.academicYearId as string | undefined;

  if (!academicYearId) {
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true, isArchived: false, deletedAt: null },
      select: { id: true },
    });
    if (!currentYear) {
      return res.status(400).json({ error: "Aucune année académique courante" });
    }
    academicYearId = currentYear.id;
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      academicYearId,
      role: "eleve",
      deletedAt: null,
    },
    select: {
      student: {
        include: {
          subGroups: { include: { group: true } },
          filieres: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const eleves = enrollments
    .map((e) => e.student)
    .filter((u) => u && !u.deletedAt);

  res.json(eleves);
});

/**
 * 📌 POST /eleves
 * Créer un élève
 */
router.post("/", async (req, res) => {
  const {
    email,
    firstName,
    lastName,
    academicYearId,
    subGroupId,
    filiereIds,
  } = req.body;

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }

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

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ error: "Cet email existe déjà" });
  }

  const password = Math.random().toString(36).slice(-8);

  const eleve = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        firstName,
        lastName,
        role: "eleve",
        password: bcrypt.hashSync(password, 10),
        subGroups: subGroupId
          ? { connect: { id: subGroupId } }
          : undefined,
        filieres: filiereIds?.length
          ? { connect: filiereIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        subGroups: { include: { group: true } },
        filieres: true,
      },
    });

    await tx.studentEnrollment.create({
      data: {
        studentId: user.id,
        academicYearId: targetYearId!,
        role: "eleve",
        mainSubGroupId: subGroupId || null,
      },
    });

    return user;
  });

  res.status(201).json({
    message: "Élève créé",
    temporaryPassword: password,
    eleve,
  });
});

/**
 * 📌 PATCH /eleves/:id
 * Modifier un élève
 */
router.patch("/:id", async (req, res) => {
  try {
    const {
      dateOfBirth,
      registrationDate,
      subGroupId,
      filiereIds,
      ...rest
    } = req.body;

    const data: any = {
      ...rest,
    };

    // ✅ Date de naissance
    if (dateOfBirth === "") {
      data.dateOfBirth = null;
    } else if (dateOfBirth) {
      data.dateOfBirth = new Date(dateOfBirth);
    }

    // ✅ Date d'inscription
    if (registrationDate === "") {
      data.registrationDate = null;
    } else if (registrationDate) {
      data.registrationDate = new Date(registrationDate);
    }

    // ✅ Sous-groupe
    if (subGroupId !== undefined) {
      data.subGroups = subGroupId
        ? { set: [], connect: { id: subGroupId } }
        : { set: [] };
    }

    // ✅ Filières
    if (filiereIds !== undefined) {
      data.filieres = filiereIds.length
        ? { set: filiereIds.map((id: string) => ({ id })) }
        : { set: [] };
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      include: {
        subGroups: { include: { group: true } },
        filieres: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Erreur PATCH /eleves/:id", err);
    res.status(500).json({ error: "Erreur mise à jour élève" });
  }
});


/**
 * 📌 DELETE /eleves/:id
 * Soft delete
 */
router.delete("/:id", async (req, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });

  res.json({ ok: true });
});

export default router;
