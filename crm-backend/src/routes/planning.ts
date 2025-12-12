import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole, AuthedRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

/* ---------------------------------------------------
   Sécurité globale
--------------------------------------------------- */
router.use(authRequired);

/* ---------------------------------------------------
   🗓️ GET /planning
   - admin / administratif : voient TOUT
   - prof : voit SES cours uniquement
   ⚠️ PAS d’élèves ici (performance)
--------------------------------------------------- */
router.get(
  "/",
  requireRole("admin", "administratif", "prof"),
  async (req: AuthedRequest, res) => {
    try {
      const { id: userId, role } = req.user!;

      // 🎓 Année cible
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

      const baseWhere = {
        deletedAt: null,
        course: {
          academicYearId,
          deletedAt: null,
        },
      };

      let whereClause: any = baseWhere;

      if (role === "prof") {
        whereClause = {
          ...baseWhere,
          OR: [
            { professorId: userId },
            { course: { professors: { some: { id: userId } } } },
          ],
        };
      }

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
          targetGroup: true,
          targetSubGroup: true,
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
          courseId: s.course?.id ?? null,
          courseName: s.course?.name ?? "",
          professorId: s.professor?.id ?? null,
          professorName: s.professor
            ? `${s.professor.firstName} ${s.professor.lastName}`
            : "",
          salleId: s.salle?.id ?? null,
          salleName: s.salle?.name ?? "",
          targetGroup: s.targetGroup ?? null,
          targetSubGroup: s.targetSubGroup ?? null,
        },
      }));

      res.set("Cache-Control", "no-store");
      res.json(formatted);
    } catch (err) {
      console.error("❌ Erreur GET /planning :", err);
      res.status(500).json({ error: "Erreur chargement planning" });
    }
  }
);

/* ---------------------------------------------------
   🧑‍🏫 GET /planning/prof
   Planning du prof connecté
   ➕ élèves pour l’appel
--------------------------------------------------- */
router.get(
  "/prof",
  requireRole("prof", "admin"),
  async (req: AuthedRequest, res) => {
    try {
      const userId = req.user!.id;

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
                where: { deletedAt: null },
                select: { id: true, firstName: true, lastName: true },
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
          courseId: s.course.id,
          sessionId: s.id,
          salle: s.salle,
          targetGroup: s.targetGroup ?? null,
          targetSubGroup: s.targetSubGroup ?? null,
          students: s.targetSubGroup?.students ?? [],
        },
      }));

      res.set("Cache-Control", "no-store");
      res.json(formatted);
    } catch (err) {
      console.error("❌ Erreur GET /planning/prof :", err);
      res.status(500).json({ error: "Erreur planning prof" });
    }
  }
);

/* ---------------------------------------------------
   📌 POST /planning/bulk
--------------------------------------------------- */
router.post(
  "/bulk",
  requireRole("admin", "administratif"),
  async (req: AuthedRequest, res) => {
    try {
      const { sessions } = req.body;
      if (!Array.isArray(sessions) || sessions.length === 0) {
        return res.status(400).json({ error: "Aucune session fournie" });
      }

      const created = await Promise.all(
        sessions.map(async (s: any) => {
          const course = await prisma.course.findUnique({
            where: { id: s.courseId },
            include: { subGroups: true },
          });

          const firstSubGroup = course?.subGroups?.[0] ?? null;

          return prisma.courseSession.create({
            data: {
              startTime: new Date(s.start),
              endTime: new Date(s.end),
              date: new Date(s.start),
              courseId: s.courseId,
              professorId: s.professorId ?? null,
              salleId: s.roomId ?? null,
              createdById: req.user!.id,
              targetGroupId: firstSubGroup?.groupId ?? null,
              targetSubGroupId: firstSubGroup?.id ?? null,
            },
          });
        })
      );

      res.status(201).json(created);
    } catch (err) {
      console.error("❌ Erreur POST /planning/bulk :", err);
      res.status(500).json({ error: "Erreur création sessions" });
    }
  }
);

/* ---------------------------------------------------
   ✏️ PATCH /planning/:id
--------------------------------------------------- */
router.patch(
  "/:id",
  requireRole("admin", "administratif"),
  async (req, res) => {
    try {
      const { startTime, endTime, courseId, teacherId, roomId } = req.body;

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
      });

      res.json(updated);
    } catch (err) {
      console.error("❌ Erreur PATCH /planning/:id :", err);
      res.status(500).json({ error: "Erreur modification session" });
    }
  }
);

/* ---------------------------------------------------
   🗑️ DELETE /planning/:id
--------------------------------------------------- */
router.delete(
  "/:id",
  requireRole("admin", "administratif"),
  async (req, res) => {
    try {
      await prisma.courseSession.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (err) {
      console.error("❌ Erreur DELETE /planning/:id :", err);
      res.status(500).json({ error: "Erreur suppression session" });
    }
  }
);

export default router;
