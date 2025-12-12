import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const router = Router();
const prisma = new PrismaClient();

router.use(authRequired);

/* ---------------------------------------------------
   📘 GET /courses
   Liste des cours (LÉGÈRE)
--------------------------------------------------- */
router.get(
  "/",
  requireRole("admin", "administratif", "prof"),
  async (req, res) => {
    try {
      const academicYearId =
        (req.query.academicYearId as string) ||
        (req.headers["x-academic-year-id"] as string);

      if (!academicYearId) {
        return res.json([]); // ✅ toujours un tableau
      }

      const courses = await prisma.course.findMany({
        where: {
          academicYearId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          code: true,
          coef: true,
          totalHours: true,
          totalSessions: true,
          filiere: {
            select: { id: true, code: true, label: true },
          },
        },
        orderBy: { name: "asc" },
      });

      res.json(courses);
    } catch (err) {
      console.error("❌ GET /courses", err);
      res.status(500).json([]);
    }
  }
);

/* ---------------------------------------------------
   📘 GET /courses/:id
   Détails d’un cours
--------------------------------------------------- */
router.get(
  "/:id",
  requireRole("admin", "administratif", "prof"),
  async (req, res) => {
    try {
      const course = await prisma.course.findFirst({
        where: {
          id: req.params.id,
          deletedAt: null,
        },
        include: {
          filiere: true,
          professors: {
            where: { deletedAt: null },
            select: { id: true, firstName: true, lastName: true },
          },
          subGroups: {
            where: { deletedAt: null },
            include: { group: true },
          },
        },
      });

      if (!course) {
        return res.status(404).json({ error: "Cours introuvable" });
      }

      res.json(course);
    } catch (err) {
      console.error("❌ GET /courses/:id", err);
      res.status(500).json({ error: "Erreur chargement cours" });
    }
  }
);

/* ---------------------------------------------------
   ➕ POST /courses
--------------------------------------------------- */
router.post(
  "/",
  requireRole("admin", "administratif"),
  async (req, res) => {
    try {
      const {
        name,
        academicYearId,
        filiereId,
        professorIds = [],
        subGroupIds = [],
        totalHours,
        totalSessions,
        coef,
      } = req.body;

      if (!name || !academicYearId) {
        return res.status(400).json({
          error: "name et academicYearId requis",
        });
      }

      const course = await prisma.course.create({
        data: {
          name,
          academicYearId,
          filiereId: filiereId || null,
          coef: coef ?? 1,
          totalHours: totalHours ?? null,
          totalSessions: totalSessions ?? null,
          professors: {
            connect: professorIds.map((id: string) => ({ id })),
          },
          subGroups: {
            connect: subGroupIds.map((id: string) => ({ id })),
          },
        },
      });

      res.status(201).json(course);
    } catch (err) {
      console.error("❌ POST /courses", err);
      res.status(500).json({ error: "Erreur création cours" });
    }
  }
);

/* ---------------------------------------------------
   ✏️ PATCH /courses/:id
--------------------------------------------------- */
router.patch(
  "/:id",
  requireRole("admin", "administratif"),
  async (req, res) => {
    try {
      const {
        name,
        filiereId,
        professorIds,
        subGroupIds,
        totalHours,
        totalSessions,
        coef,
      } = req.body;

      const course = await prisma.course.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(filiereId !== undefined && { filiereId: filiereId || null }),
          ...(coef !== undefined && { coef }),
          ...(totalHours !== undefined && { totalHours }),
          ...(totalSessions !== undefined && { totalSessions }),
          ...(professorIds && {
            professors: {
              set: [],
              connect: professorIds.map((id: string) => ({ id })),
            },
          }),
          ...(subGroupIds && {
            subGroups: {
              set: [],
              connect: subGroupIds.map((id: string) => ({ id })),
            },
          }),
        },
      });

      res.json(course);
    } catch (err) {
      console.error("❌ PATCH /courses/:id", err);
      res.status(500).json({ error: "Erreur modification cours" });
    }
  }
);

/* ---------------------------------------------------
   🗑️ DELETE /courses/:id (soft delete)
--------------------------------------------------- */
router.delete(
  "/:id",
  requireRole("admin", "administratif"),
  async (req, res) => {
    try {
      await prisma.course.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("❌ DELETE /courses/:id", err);
      res.status(500).json({ error: "Erreur suppression cours" });
    }
  }
);

export default router;
