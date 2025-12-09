import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, AuthedRequest } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/**
 * 🗓️ GET /planning
 * - admin        : voit tout
 * - administratif: voit ce qu'il a créé
 * - prof         : voit ce où il est prof OU co-prof sur le cours
 */
router.get("/", async (req: AuthedRequest, res) => {
  try {
    const { id: userId, role } = req.user || {};
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    // Année cible : query ou année courante par défaut
    let academicYearId = (req.query.academicYearId as string) || undefined;
    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true }
      });
      if (!currentYear) {
        return res.status(400).json({ error: "Aucune année académique courante" });
      }
      academicYearId = currentYear.id;
    }

    let whereClause: any = { deletedAt: null };

    if (role === "admin") {
      // Admin voit TOUT
      console.log("👤 ADMIN - voit TOUT");
      whereClause = { deletedAt: null };
    } else if (role === "administratif") {
      // Administratif voit TOUT
      console.log("👤 ADMINISTRATIF - voit TOUT");
      whereClause = { deletedAt: null };
    } else if (role === "prof") {
      console.log("👤 PROF ID:", userId);
      whereClause = {
        deletedAt: null,
        OR: [
          { professorId: userId },
          { course: { professors: { some: { id: userId } } } },
        ],
      };
    }
    
    // Filtrer par année (s'applique à TOUS les rôles)
    console.log("🎓 Filtre par année:", academicYearId);
    if (whereClause.OR) {
      // Prof
      whereClause = {
        deletedAt: null,
        course: { academicYearId, deletedAt: null },
        OR: [
          { professorId: userId },
          { course: { professors: { some: { id: userId } } } },
        ],
      };
    } else {
      // Admin/administratif
      whereClause.course = {
        academicYearId,
        deletedAt: null
      };
    }

    console.log("👤 Utilisateur connecté :", { userId, role });
    console.log("🔍 Filtre appliqué :", JSON.stringify(whereClause, null, 2));

    const sessions = await prisma.courseSession.findMany({
      where: whereClause,
      orderBy: { startTime: "asc" },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            professors: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        professor: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        salle: { select: { id: true, name: true } },

        // 🎯 pour l’appel élève
        targetGroup: true,
        targetSubGroup: {
          include: {
            students: {
              where: {
                deletedAt: null,
                enrollments: {
                  some: { academicYearId, deletedAt: null }
                }
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    console.log("📦 Sessions renvoyées :", sessions.length);
    console.log("📦 Exemple session :", sessions[0]);
    console.log("📦 Salles renvoyées :", sessions.map((s) => s.salle?.name));

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
        courseId: s.course?.id,
        courseName: s.course?.name ?? "",
        professorId: s.professor?.id ?? null,
        professorName: s.professor
          ? `${s.professor.firstName} ${s.professor.lastName}`
          : "",
        createdById: s.createdBy?.id ?? null,
        createdByName: s.createdBy
          ? `${s.createdBy.firstName} ${s.createdBy.lastName}`
          : "",
        salleId: s.salle?.id ?? null,
        salleName: s.salle?.name ?? "",

        // 👇 infos pour l’appel
        targetGroup: s.targetGroup || null,
        targetSubGroup: s.targetSubGroup || null,
        students: s.targetSubGroup?.students ?? [],
      },
      backgroundColor: "#2563eb",
      borderColor: "#1e3a8a",
      textColor: "#fff",
    }));

    // 🔥 Désactiver le cache pour que les changements apparaissent immédiatement
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.json(formatted);
  } catch (err) {
    console.error("❌ Erreur GET /planning :", err);
    res.status(500).json({ error: "Erreur chargement du planning" });
  }
});

/**
 * 📌 POST /planning/bulk
 * Création multiple de sessions à partir du secrétariat
 */
router.post("/bulk", async (req: AuthedRequest, res) => {
  try {
    const { sessions } = req.body;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: "Aucune session fournie" });
    }
    if (!req.user?.id) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const created = await Promise.all(
      sessions.map(async (s: any) => {
        // 🔥 Récupération du module + sous-groupes
        const moduleData = await prisma.course.findUnique({
          where: { id: s.courseId },
          include: {
            subGroups: {
              select: {
                id: true,
                groupId: true,
              },
            },
          },
        });

        // 🔥 On prend le premier sous-groupe (comme Moodle fait)
        const firstSubGroup = moduleData?.subGroups?.[0] ?? null;

        return prisma.courseSession.create({
          // 🧪 on passe par l’UncheckedCreate (ids scalaires)
          data: {
            startTime: new Date(s.start),
            endTime: new Date(s.end),
            date: new Date(s.start),

            courseId: s.courseId,
            createdById: req.user!.id,

            professorId: s.professorId ?? null,
            salleId: s.roomId ?? null,

            // 🎯 affectation automatique pour l’appel élève
            targetGroupId: firstSubGroup?.groupId ?? null,
            targetSubGroupId: firstSubGroup?.id ?? null,
          },
          include: {
            course: { select: { id: true, name: true } },
            professor: {
              select: { id: true, firstName: true, lastName: true },
            },
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            salle: { select: { id: true, name: true } },
          },
        });
      })
    );

    res.status(201).json(created);
  } catch (err) {
    console.error("❌ Erreur POST /planning/bulk :", err);
    res.status(500).json({ error: "Erreur création des sessions" });
  }
});

/**
 * ✏️ PATCH /planning/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const { courseId, teacherId, roomId, startTime, endTime } = req.body;

    const updated = await prisma.courseSession.update({
      where: { id: req.params.id },
      data: {
        ...(courseId && { courseId }),
        ...(teacherId && { professorId: teacherId }),
        ...(roomId && { salleId: roomId }),
        ...(startTime && {
          startTime: new Date(startTime),
          date: new Date(startTime),
        }),
        ...(endTime && { endTime: new Date(endTime) }),
      },
      include: {
        course: true,
        professor: true,
        createdBy: true,
        salle: true,
      },
    });

    // 🔥 Désactiver le cache
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(updated);
  } catch (err) {
    console.error("Erreur PATCH /planning/:id :", err);
    res.status(500).json({ error: "Erreur mise à jour session" });
  }
});

/**
 * 🗑️ DELETE /planning/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.courseSession.delete({ where: { id: req.params.id } });
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ message: "Session supprimée" });
  } catch (err) {
    console.error("Erreur DELETE /planning/:id :", err);
    res.status(500).json({ error: "Erreur suppression session" });
  }
});

// ⛔️ C’EST ICI QUE TU AJOUTES LA PROTECTION PROF
router.use("/prof", requireRole("prof", "admin")); 
// ⛔️ ICI — ICI — ICI


/**
 * 🧑‍🏫 GET /prof/planning
 * Planning du prof connecté + infos élèves pour l’appel
 */
router.get("/prof/planning", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user.id;

    const sessions = await prisma.courseSession.findMany({
      where: {
        OR: [
          { professorId: userId },
          { course: { professors: { some: { id: userId } } } },
        ],
      },
      orderBy: { startTime: "asc" },
      include: {
        course: { select: { id: true, name: true } },
        professor: { select: { id: true, firstName: true, lastName: true } },
        salle: { select: { id: true, name: true } },

        targetGroup: true,
        targetSubGroup: {
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
    });

    const formatted = sessions.map((s) => ({
      id: s.id,
      title: `${s.course.name} — ${
        s.professor
          ? `${s.professor.firstName} ${s.professor.lastName}`
          : "—"
      }${s.salle ? " 📍 " + s.salle.name : ""}`,
      start: s.startTime,
      end: s.endTime,
    extendedProps: {
  courseId: s.course.id,      // 👈 indispensable
  sessionId: s.id,            // 👈 utile aussi
  course: s.course,
  professor: s.professor,
  salle: s.salle,
  targetGroup: s.targetGroup || null,
  targetSubGroup: s.targetSubGroup || null,
  students: s.targetSubGroup?.students ?? [],
},

    }));

    // 🔥 Désactiver le cache pour prof
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(formatted);
  } catch (err) {
    console.error("Erreur /prof/planning :", err);
    res.status(500).json({ error: "Erreur chargement planning prof" });
  }
});

export default router;
