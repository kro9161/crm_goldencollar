// crm-backend/src/routes/courses.ts
import express from "express";
import { PrismaClient } from "@prisma/client";

import { authRequired, requireRole } from "../middlewares/auth.js";

const router = express.Router();
const prisma = new PrismaClient();

// ---------------------------------------------------
// APPLY GLOBAL MIDDLEWARES
// ---------------------------------------------------
router.use(authRequired); // 👤 utilisateur doit être connecté

//----------------------------------------------------
// GET - Liste des cours
// Accessible : admin, administratif, prof
//----------------------------------------------------
router.get("/", requireRole("admin", "administratif", "prof"), async (req, res) => {
  try {
    const academicYearId = (req.query.academicYearId as string) || (req.headers["x-academic-year-id"] as string);
    
    let where: any = { deletedAt: null };
    
    if (academicYearId) {
      where.academicYearId = academicYearId;
    } else {
      // Par défaut: toutes les années courantes
      const currentYears = await prisma.academicYear.findMany({
        where: { isCurrent: true, isArchived: false },
        select: { id: true }
      });
      where.academicYearId = { in: currentYears.map(y => y.id) };
    }
    
    const courses = await prisma.course.findMany({
      where,
      include: {
        professors: { where: { deletedAt: null } },
        subGroups: { where: { deletedAt: null }, include: { group: true } },
        academicYear: true,
          filiere: true,
      },
      orderBy: { name: "asc" },
    });

    res.json(courses);
  } catch (err) {
    console.error("Erreur GET /courses :", err);
    res.status(500).json({ error: "Erreur lors du chargement des cours" });
  }
});

// ---------------------------------------------------
// POST - Créer un cours
// Accessible : admin, administratif
// ---------------------------------------------------
router.post("/", requireRole("admin", "administratif"), async (req, res) => {
  try {
    const {
      name,
      type,
      domain,
      totalHours,
      totalSessions,
      professorIds,
      subGroupIds,
      academicYearId,
      filiereId,
    } = req.body;
    if (!academicYearId) {
      return res.status(400).json({ error: "academicYearId requis" });
    }

    const course = await prisma.course.create({
      data: {
        name,
        type,
        domain,
        totalHours: totalHours ? parseInt(totalHours) : null,
        totalSessions: totalSessions ? parseInt(totalSessions) : null,
        academicYearId,
        filiereId: filiereId || null,
        professors: {
          connect: professorIds?.map((id: string) => ({ id })) || [],
        },
        subGroups: {
          connect: subGroupIds?.map((id: string) => ({ id })) || [],
        },
      },
      include: {
        professors: true,
        subGroups: { include: { group: true } },
        academicYear: true,
        filiere: true,
      },
    });

    res.status(201).json(course);
  } catch (err) {
    console.error("Erreur POST /courses :", err);
    res.status(500).json({ error: "Erreur lors de la création du cours" });
  }
});

// ---------------------------------------------------
// PATCH - Modifier un cours
// Accessible : admin, administratif
// ---------------------------------------------------
router.patch("/:id", requireRole("admin", "administratif"), async (req, res) => {
  try {
    const {
      name,
      type,
      domain,
      totalHours,
      totalSessions,
      professorIds,
      subGroupIds,
      filiereId,
    } = req.body;

    const updated = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(domain && { domain }),
        ...(totalHours && { totalHours: parseInt(totalHours) }),
        ...(totalSessions && { totalSessions: parseInt(totalSessions) }),
        ...(filiereId !== undefined && { filiereId: filiereId || null }),
        professors: {
          set: [],
          connect: professorIds?.map((id: string) => ({ id })) || [],
        },
        subGroups: {
          set: [],
          connect: subGroupIds?.map((id: string) => ({ id })) || [],
        },
      },
      include: {
        professors: true,
        subGroups: { include: { group: true } },
        academicYear: true,
        filiere: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Erreur PATCH /courses/:id :", err);
    res.status(500).json({ error: "Erreur lors de la modification du cours" });
  }
});

// ---------------------------------------------------
// DELETE - Supprimer un cours
// Accessible : admin, administratif
// ---------------------------------------------------
router.delete("/:id", requireRole("admin", "administratif"), async (req, res) => {
  try {
    await prisma.course.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Cours supprimé" });
  } catch (err) {
    console.error("Erreur DELETE /courses/:id :", err);
    res.status(500).json({ error: "Erreur lors de la suppression du cours" });
  }
});

export default router;
