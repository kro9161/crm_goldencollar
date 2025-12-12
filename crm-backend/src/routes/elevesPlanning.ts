// crm-backend/src/routes/elevesPlanning.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);

/**
 * 📌 GET /eleves/planning/:id
 * 🎯 Planning d’un élève
 * Accessible par l’élève lui-même OU admin/administratif
 */
router.get("/planning/:id", async (req: any, res) => {
  try {
    const { id: studentId } = req.params;
    const { id: currentUserId, role } = req.user || {};
    let academicYearId = (req.query.academicYearId as string) || undefined;

    // 🔐 Sécurité
    if (
      role !== "admin" &&
      role !== "administratif" &&
      currentUserId !== studentId
    ) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    // 🎓 Année cible
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

    // 👤 Élève + sous-groupes
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: "eleve" },
      include: {
        subGroups: {
          where: { deletedAt: null },
          include: {
            subGroupFilieres: {
              include: { filiere: true },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Élève introuvable" });
    }

    const subGroupIds = student.subGroups.map((sg) => sg.id);

    // 🎓 Vérifier inscription sur l’année
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        academicYearId,
        deletedAt: null,
      },
    });

    if (!enrollment) {
      return res.json([]);
    }

    // 🗂 Sous-groupes appartenant bien à l’année
    const groupsForYear = await prisma.group.findMany({
      where: { academicYearId, deletedAt: null },
      select: { id: true },
    });
    const validGroupIds = new Set(groupsForYear.map((g) => g.id));

    const subGroupIdsForYear = student.subGroups
      .filter((sg) => validGroupIds.has(sg.groupId))
      .map((sg) => sg.id);

    // 📅 Sessions
    const sessions = await prisma.courseSession.findMany({
      where: {
        deletedAt: null,
        course: {
          academicYearId,
          deletedAt: null,
        },
        OR: [
          { targetSubGroupId: { in: subGroupIdsForYear } },
          {
            course: {
              subGroups: {
                some: { id: { in: subGroupIdsForYear } },
              },
            },
          },
        ],
      },
      orderBy: { startTime: "asc" },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            subGroups: {
              select: {
                subGroupFilieres: {
                  include: {
                    filiere: {
                      select: { id: true, code: true, label: true },
                    },
                  },
                },
              },
            },
          },
        },
        professor: { select: { firstName: true, lastName: true } },
        salle: { select: { name: true } },
        targetSubGroup: { select: { code: true } },
      },
    });

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
        filieres:
          s.course?.subGroups.flatMap((sg) =>
            sg.subGroupFilieres.map((sgf) => ({
              id: sgf.filiere?.id,
              code: sgf.filiere?.code,
              label: sgf.filiere?.label,
            }))
          ) || [],
      },
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Erreur planning élève :", err);
    res.status(500).json({ error: "Erreur chargement planning" });
  }
});

export default router;
