// crm-backend/src/routes/eleves.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";


const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);

/**
 * 📌 GET /eleves/planning/:id
 * 🎯 Récupérer le planning de l'élève
 * Accessible par l'élève lui-même OU par admin/administratif
 */
router.get("/planning/:id", async (req: any, res) => {
  try {
    const { id: studentId } = req.params;
    const { id: currentUserId, role } = req.user || {};
    let academicYearId = (req.query.academicYearId as string) || undefined;
    
    console.log("🎓 GET /eleves/planning/:id - Élève ID:", studentId);
    console.log("👤 User connecté:", currentUserId, "role:", role);

    // Vérifier les droits : soit c'est l'élève lui-même, soit admin/administratif
    if (role !== "admin" && role !== "administratif" && currentUserId !== studentId) {
      console.log("❌ Accès refusé - pas le bon élève");
      return res.status(403).json({ error: "Accès refusé" });
    }

    // 0️⃣ Année cible : query ou année courante
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

    // 1️⃣ Récupérer l'élève et ses sous-groupes/filières pour l'année cible
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: "eleve" },
      include: {
        filieres: {
          where: { deletedAt: null },
          select: { id: true, code: true }
        },
        subGroups: {
          where: { deletedAt: null },
          select: { id: true, code: true }
        }
      }
    });

    console.log("📚 Élève trouvé:", {
      id: student?.id,
      filieres: student?.filieres.length,
      subGroups: student?.subGroups.length
    });

    if (!student) {
      console.log("❌ Élève non trouvé:", studentId);
      return res.status(404).json({ error: "Élève non trouvé" });
    }

    const filiereIds = student.filieres.map(f => f.id);
    const subGroupIds = student.subGroups.map(sg => sg.id);

    console.log("🔍 Recherche sessions avec:", {
      filiereIds: filiereIds.length,
      subGroupIds: subGroupIds.length
    });

    // Filtrer les sous-groupes appartenant à l'année ciblée
    const groupsForYear = await prisma.group.findMany({
      where: { academicYearId, deletedAt: null },
      select: { id: true }
    });
    const groupIdsForYear = new Set(groupsForYear.map(g => g.id));
    const subGroupIdsForYear = subGroupIds.filter(id => groupIdsForYear.has(id as any));

    // Vérifier une inscription (enrollment) de l'élève sur l'année cible
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, academicYearId, deletedAt: null }
    });
    if (!enrollment) {
      return res.json([]); // pas inscrit sur cette année
    }

    // 2️⃣ Récupérer toutes les sessions de cours liées aux filières/sous-groupes de l'élève et à l'année
    const sessions = await prisma.courseSession.findMany({
      where: {
        deletedAt: null,
        course: { academicYearId, deletedAt: null },
        OR: [
          // Sessions liées au sous-groupe de l'élève
          { targetSubGroupId: { in: subGroupIdsForYear } },
          // Sessions liées aux cours de ses filières
          {
            course: {
              filiere: {
                id: { in: filiereIds }
              }
            }
          }
        ]
      },
      orderBy: { startTime: "asc" },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            filiere: { select: { id: true, code: true, label: true } },
            professors: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        professor: { select: { id: true, firstName: true, lastName: true } },
        salle: { select: { id: true, name: true } },
        targetSubGroup: { select: { id: true, code: true } }
      }
    });

    console.log("✅ Sessions trouvées:", sessions.length);

    const formatted = sessions.map((s) => ({
      id: s.id,
      title: `${s.course?.name ?? "Cours"} — ${
        s.professor
          ? `${s.professor.firstName} ${s.professor.lastName}`
          : "—"
      }${s.salle ? " 📍 " + s.salle.name : ""}`,
      start: s.startTime,
      end: s.endTime,
      extendedProps: {
        courseId: s.courseId,
        courseName: s.course?.name,
        professor: s.professor,
        salleName: s.salle?.name,
        targetSubGroup: s.targetSubGroup?.code,
        filiere: s.course?.filiere?.code,
        niveau: s.course?.filiere?.label,
      }
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Erreur GET /eleves/planning/:id :", err);
    res.status(500).json({ error: "Erreur lors du chargement du planning" });
  }
});

// ⚠️ IMPORTANT: Les routes suivantes sont réservées aux admin/administratif
router.use(requireRole("admin", "administratif"));


/**
 * 📌 GET /eleves
 * Liste tous les élèves (avec sous-groupe si assigné)
 */
router.get("/", async (req, res) => {
  try {
    let academicYearId = (req.query.academicYearId as string) || undefined;
    console.log("🔍 GET /eleves - academicYearId reçu dans query :", academicYearId);
    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      if (!currentYear) {
        return res.status(400).json({ error: "Aucune année académique courante" });
      }
      academicYearId = currentYear.id;
      console.log("✅ Année courante sélectionnée :", academicYearId);
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId,
        deletedAt: null,
        role: "eleve"
      } as any,
      include: {
        student: {
          include: {
            subGroups: {
              where: { deletedAt: null },
              include: {
                group: true,
                filiere: true,
              },
            },
            filieres: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const eleves = enrollments
      .map(e => e.student)
      .filter((u): u is NonNullable<typeof u> => !!u);

    console.log(`📚 Retour de ${eleves.length} élèves pour l'année ${academicYearId}`);
    res.json(eleves);
  } catch (err) {
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
    const { email, firstName, lastName, subGroupId, filiereIds, academicYearId } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Cet email existe déjà" });

    const password = Math.random().toString(36).slice(-8);

    // Trouver l'année cible (paramètre ou année courante)
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

    console.log("✅ Création élève sur année:", targetYearId);

    const created = await prisma.$transaction(async (tx) => {
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
        }
      });

      await tx.studentEnrollment.create({
        data: {
          studentId: user.id,
          academicYearId: targetYearId!,
          role: "eleve",
          mainSubGroupId: subGroupId || undefined,
        },
      });

      return user;
    });

    res.status(201).json({
      message: "Élève créé",
      temporaryPassword: password,
      eleve: created,
    });
  } catch (err) {
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
    const { firstName, lastName, email, subGroupId, filiereIds } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(email ? { email } : {}),
        ...(subGroupId !== undefined
          ? { 
              subGroups: subGroupId 
                ? { set: [], connect: { id: subGroupId } }
                : { set: [] }
            }
          : {}
        ),
        ...(filiereIds !== undefined
          ? {
              filieres: filiereIds.length
                ? { set: [], connect: filiereIds.map((id: string) => ({ id })) }
                : { set: [] }
            }
          : {}
        )
      },
      include: {
        subGroups: {
          include: { group: true },
        },
        filieres: true,
      },
    });

    res.json(updated);
  } catch (err) {
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
  } catch (err) {
    console.error("❌ Erreur DELETE /eleves/:id :", err);
    res.status(500).json({ error: "Erreur suppression élève" });
  }
});

export default router;
