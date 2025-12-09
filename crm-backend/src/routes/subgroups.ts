
import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authRequired, requireRole } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/**
 * DELETE /subgroups/:subGroupId/filieres/:filiereId
 * Dissocie une filière d'un sous-groupe (ne supprime pas la filière globalement)
 */
router.delete("/:subGroupId/filieres/:filiereId", async (req, res) => {
  try {
    const { subGroupId, filiereId } = req.params;
    // Vérifier que la liaison existe
    const link = await prisma.subGroupFiliere.findUnique({
      where: { subGroupId_filiereId: { subGroupId, filiereId } },
    });
    if (!link) {
      return res.status(404).json({ error: "Liaison non trouvée" });
    }
    await prisma.subGroupFiliere.delete({
      where: { subGroupId_filiereId: { subGroupId, filiereId } },
    });
    res.json({ message: "Filière dissociée du sous-groupe" });
  } catch (e) {
    console.error("Erreur DELETE /subgroups/:subGroupId/filieres/:filiereId :", e);
    res.status(500).json({ error: "Erreur suppression liaison filière/sous-groupe" });
  }
});

/**
 * POST /subgroups/:id/filieres
 * Crée une filière et la lie directement à ce sous-groupe (champ filiereId)
 */
router.post("/:id/filieres", async (req, res) => {
  try {
    const { code, label, academicYearId, levelId } = req.body;
    if (!code || !academicYearId) {
      return res.status(400).json({ error: "code et academicYearId requis" });
    }
    // Vérifier unicité code+année
    let filiere = await prisma.filiere.findFirst({
      where: { code: code.trim().toUpperCase(), academicYearId, deletedAt: null },
    });
    if (!filiere) {
      // Créer la filière si elle n'existe pas
      filiere = await prisma.filiere.create({
        data: {
          code: code.trim().toUpperCase(),
          label: label?.trim() || null,
          academicYearId,
          ...(levelId && { levelId }),
        },
      });
    }
    // Vérifier que le sous-groupe existe
    const subGroup = await prisma.subGroup.findUnique({ where: { id: req.params.id, deletedAt: null } });
    if (!subGroup) {
      return res.status(404).json({ error: 'Sous-groupe non trouvé' });
    }
    // Vérifier si la liaison existe déjà
    const alreadyLinked = await prisma.subGroupFiliere.findUnique({
      where: { subGroupId_filiereId: { subGroupId: req.params.id, filiereId: filiere.id } },
    });
    if (alreadyLinked) {
      return res.status(400).json({ error: "Cette filière est déjà liée à ce sous-groupe" });
    }
    // Créer la liaison
    await prisma.subGroupFiliere.create({
      data: { subGroupId: req.params.id, filiereId: filiere.id },
    });
    // Retourner le sous-groupe avec toutes ses filières
    const result = await prisma.subGroup.findUnique({
      where: { id: req.params.id },
      include: {
        group: true,
        subGroupFilieres: { include: { filiere: true } },
      },
    });
    res.status(201).json(result);
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Sous-groupe non trouvé' });
    }
    if (e.code === 'P2002') {
      return res.status(400).json({ error: 'Cette filière existe déjà pour cette année' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erreur création filière liée au sous-groupe' });
  }
});
/**
 * 📌 GET /subgroups/:id
 * Récupère un sous-groupe par son ID (hors deleted)
 */
router.get("/:id", async (req, res) => {
  try {
    const subGroup = await prisma.subGroup.findUnique({
      where: { id: req.params.id },
      include: { group: true, subGroupFilieres: { include: { filiere: true } }, students: true, courses: true },
    });
    if (!subGroup || subGroup.deletedAt) {
      return res.status(404).json({ error: "Sous-groupe non trouvé" });
    }
    res.json(subGroup);
  } catch (err) {
    console.error("Erreur GET /subgroups/:id :", err);
    res.status(500).json({ error: "Erreur chargement sous-groupe" });
  }
});

/**
 * 📌 GET /subgroups
 * Liste tous les sous-groupes
 */
router.get("/", async (req, res) => {
  try {
    const academicYearId = (req.query.academicYearId as string) || (req.headers["x-academic-year-id"] as string);
    
    let yearIds: string[];
    if (academicYearId) {
      yearIds = [academicYearId];
    } else {
      const currentYears = await prisma.academicYear.findMany({
        where: { isCurrent: true, isArchived: false, deletedAt: null },
        select: { id: true },
      });
      yearIds = currentYears.map((y) => y.id);
    }

    // SubGroup n'a pas academicYearId; on passe par Group.academicYearId
    const subGroups = await prisma.subGroup.findMany({
      where: { 
        group: { academicYearId: { in: yearIds } }, 
        deletedAt: null 
      },
      include: {
        group: true,
        courses: true,
        students: {
          where: {
            deletedAt: null,
            enrollments: {
              some: {
                academicYearId: { in: yearIds },
                deletedAt: null
              }
            }
          }
        },
      },
      orderBy: { code: "asc" },
    });

    res.json(subGroups);
  } catch (err) {
    console.error("Erreur GET /subgroups :", err);
    res.status(500).json({ error: "Erreur chargement sous-groupes" });
  }
});

/**
 * 📌 GET /subgroups/by-group/:groupId
 * Liste les sous-groupes d’un groupe précis
 */
router.get("/by-group/:groupId", async (req, res) => {
  try {
    const academicYearId = (req.query.academicYearId as string) || (req.headers["x-academic-year-id"] as string);
    const subGroups = await prisma.subGroup.findMany({
      where: { groupId: req.params.groupId, deletedAt: null },
      include: {
        students: academicYearId ? {
          where: {
            deletedAt: null,
            enrollments: {
              some: { academicYearId, deletedAt: null }
            }
          }
        } : undefined
      },
      orderBy: { code: "asc" },
    });

    res.json(subGroups);
  } catch (err) {
    console.error("Erreur GET /subgroups/by-group :", err);
    res.status(500).json({ error: "Erreur chargement sous-groupes du groupe" });
  }
});

/**
 * 🗑️ DELETE /subgroups/:id
 * Supprimer un sous-groupe (soft delete)
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.subGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: "Sous-groupe supprimé" });
  } catch (err) {
    console.error("Erreur DELETE /subgroups/:id :", err);
    res.status(500).json({ error: "Erreur suppression sous-groupe" });
  }
});

/**
 * ➕ POST /subgroups
 * Créer un sous-groupe
 */
router.post("/", async (req, res) => {
  try {

    const { code, label, groupId } = req.body;

    if (!code || !groupId) {
      return res.status(400).json({ error: "Code et groupId requis." });
    }
    // Safety: ensure provided group belongs to selected academicYearId if header/query provided
    const academicYearId = (req.query.academicYearId as string) || (req.headers["x-academic-year-id"] as string);
    if (academicYearId) {
      const grp = await prisma.group.findUnique({ where: { id: groupId } });
      if (!grp || grp.academicYearId !== academicYearId) {
        return res.status(400).json({ error: "groupId ne correspond pas à academicYearId" });
      }
    }



    // À la création, NE PAS lier de filière par défaut

    const created = await prisma.subGroup.create({
      data: {
        code,
        label: label ?? null,
        groupId,
      },
      include: { group: true, subGroupFilieres: { include: { filiere: true } }, students: true, courses: true, targetSessions: true, mainEnrollments: true },
    });

    res.status(201).json(created);
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "Ce code de sous-groupe existe déjà." });
    }

    console.error("Erreur POST /subgroups :", e);
    res.status(500).json({ error: "Erreur création sous-groupe." });
  }
});

/**
 * ✏️ PATCH /subgroups/:id
 * Modifier un sous-groupe
 */
router.patch("/:id", async (req, res) => {
  try {

    const { code, label, groupId, filiereId } = req.body;


    // Si filiereId fourni, vérifier qu'elle n'est pas déjà liée à un autre sous-groupe actif (hors ce sous-groupe)
    if (filiereId) {
      const existing = await prisma.subGroup.findFirst({
        where: {
          filiereId,
          id: { not: req.params.id },
          deletedAt: null,
        },
      });
      if (existing) {
        return res.status(400).json({ error: "Cette filière est déjà liée à un autre sous-groupe." });
      }
    }

    const updated = await prisma.subGroup.update({
      where: { id: req.params.id },
      data: {
        ...(code !== undefined ? { code } : {}),
        ...(label !== undefined ? { label } : {}),
        ...(groupId !== undefined ? { groupId } : {}),
        ...(filiereId !== undefined ? { filiereId: filiereId || null } : {}),
      },
      include: { group: true, filiere: true },
    });

    res.json(updated);
  } catch (e: any) {
    console.error("Erreur PATCH /subgroups/:id :", e);

    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "Ce code existe déjà." });
    }

    res.status(500).json({ error: "Erreur mise à jour sous-groupe." });
  }
});
export default router;
