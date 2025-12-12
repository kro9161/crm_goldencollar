// crm-backend/src/routes/users.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authRequired, requireRole, AuthedRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

// 🔐 Sécurité globale
router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/* ============================================================
   GET /users
   - Liste les utilisateurs inscrits sur une année académique
   - Filtres : role, search, email, prénom, nom
============================================================ */
router.get("/", async (req, res) => {
  try {
    const {
      role,
      academicYearId,
      search,
      email,
      firstName,
      lastName,
    } = req.query as Record<string, string | undefined>;

    // 🎓 Année cible
    let yearId = academicYearId;
    if (!yearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      if (!currentYear) {
        return res.status(400).json({ error: "Aucune année académique courante" });
      }
      yearId = currentYear.id;
    }

    // 🔍 Filtre enrollment
    const enrollmentWhere: any = {
      academicYearId: yearId,
      deletedAt: null,
      ...(role && { role }),
    };

    // 🔍 Filtres utilisateur
    if (search || email || firstName || lastName) {
      enrollmentWhere.student = {
        AND: [
          ...(search
            ? [{
                OR: [
                  { email: { contains: search, mode: "insensitive" } },
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                ],
              }]
            : []),
          ...(email ? [{ email: { contains: email, mode: "insensitive" } }] : []),
          ...(firstName ? [{ firstName: { contains: firstName, mode: "insensitive" } }] : []),
          ...(lastName ? [{ lastName: { contains: lastName, mode: "insensitive" } }] : []),
        ],
      };
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      orderBy: { createdAt: "asc" },
      select: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            photoUrl: true,
            phone: true,
            address: true,
            nationality: true,
            status: true,
            studentNumber: true,
            scholarship: true,
            handicap: true,
            subGroups: {
              where: { deletedAt: null },
              select: {
                id: true,
                code: true,
                group: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const users = enrollments.map(e => e.student);
    res.json(users);
  } catch (err) {
    console.error("❌ GET /users :", err);
    res.status(500).json({ error: "Erreur chargement utilisateurs" });
  }
});

/* ============================================================
   POST /users
   - Crée un utilisateur
   - L’inscrit sur une année académique
============================================================ */
router.post("/", async (req: AuthedRequest, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      role,
      academicYearId,
      subGroupCodes,
      phone,
      address,
      photoUrl,
      dateOfBirth,
      nationality,
      status,
      teacherNumber,
      specialty,
      hireDate,
    } = req.body;

    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    // 🎓 Année cible
    let yearId = academicYearId;
    if (!yearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      if (!currentYear) {
        return res.status(400).json({ error: "Aucune année académique courante" });
      }
      yearId = currentYear.id;
    }

    const tempPassword = "Ecole123!";

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          password: bcrypt.hashSync(tempPassword, 10),
          phone: phone || null,
          address: address || null,
          photoUrl: photoUrl || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          nationality: nationality || null,
          status: status || null,
          teacherNumber: teacherNumber || null,
          specialty: specialty || null,
          hireDate: hireDate ? new Date(hireDate) : null,
          subGroups: subGroupCodes
            ? { connect: subGroupCodes.map((code: string) => ({ code })) }
            : undefined,
        },
      });

      await tx.studentEnrollment.create({
        data: {
          studentId: user.id,
          academicYearId: yearId!,
          role,
        },
      });

      return user;
    });

    res.status(201).json({
      user: createdUser,
      temporaryPassword: tempPassword,
    });
  } catch (err) {
    console.error("❌ POST /users :", err);
    res.status(500).json({ error: "Erreur création utilisateur" });
  }
});

/* ============================================================
   PATCH /users/:id
============================================================ */
router.patch("/:id", async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      role,
      subGroupCodes,
      phone,
      address,
      photoUrl,
      dateOfBirth,
      nationality,
      status,
      teacherNumber,
      specialty,
      hireDate,
    } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(email && { email: email.trim() }),
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(role && { role }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(dateOfBirth !== undefined && {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        }),
        ...(nationality !== undefined && { nationality }),
        ...(status !== undefined && { status }),
        ...(teacherNumber !== undefined && { teacherNumber }),
        ...(specialty !== undefined && { specialty }),
        ...(hireDate !== undefined && {
          hireDate: hireDate ? new Date(hireDate) : null,
        }),
        ...(subGroupCodes && {
          subGroups: {
            set: [],
            connect: subGroupCodes.map((code: string) => ({ code })),
          },
        }),
      },
      include: {
        subGroups: { include: { group: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ PATCH /users :", err);
    res.status(500).json({ error: "Erreur mise à jour utilisateur" });
  }
});

/* ============================================================
   DELETE /users/:id
   ⚠️ volontairement HARD DELETE (à revoir plus tard)
============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE /users :", err);
    res.status(500).json({ error: "Erreur suppression utilisateur" });
  }
});

export default router;
