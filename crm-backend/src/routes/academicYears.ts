// crm-backend/src/routes/academicYears.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired, requireRole, AuthedRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "administratif"));

/**
 * 📅 GET /academic-years
 * Liste toutes les années académiques (incluant archivées)
 */
router.get("/", async (req, res) => {
  try {
    const { includeArchived } = req.query;

    const where = includeArchived === "true" 
      ? {} 
      : { isArchived: false };

    const years = await prisma.academicYear.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: {
            groups: { where: { deletedAt: null } },
            courses: { where: { deletedAt: null } },
            enrollments: true,
          },
        },
      },
    });

    res.json(years);
  } catch (err) {
    console.error("❌ Erreur GET /academic-years:", err);
    res.status(500).json({ error: "Erreur chargement années académiques" });
  }
});

/**
 * 📅 GET /academic-years/current
 * Récupère l'année académique en cours
 */
router.get("/current", async (req, res) => {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true, isArchived: false },
      include: {
        periodes: true,
        _count: {
          select: {
            groups: true,
            courses: true,
            enrollments: true,
          },
        },
      },
    });

    if (!currentYear) {
      return res.status(404).json({ 
        error: "Aucune année académique active. Créez-en une et activez-la." 
      });
    }

    res.json(currentYear);
  } catch (err) {
    console.error("❌ Erreur GET /academic-years/current:", err);
    res.status(500).json({ error: "Erreur récupération année courante" });
  }
});

/**
 * 📋 GET /academic-years/:id/details
 * Récupère tous les détails d'une année: groupes, sous-groupes, cours, élèves, profs
 */
router.get("/:id/details", async (req, res) => {
  try {
    const { id } = req.params;

    const year = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        groups: {
          where: { deletedAt: null },
          include: {
            subGroups: {
              where: { deletedAt: null },
              include: {
                students: {
                  where: { deletedAt: null },
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
        courses: {
          where: { deletedAt: null },
          include: {
            professors: {
              where: { deletedAt: null },
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            subGroups: {
              where: { deletedAt: null },
              select: { id: true, code: true, label: true },
            },
          },
        },
      },
    });

    if (!year) {
      return res.status(404).json({ error: "Année introuvable" });
    }

    res.json(year);
  } catch (err) {
    console.error("❌ Erreur GET /academic-years/:id/details:", err);
    res.status(500).json({ error: "Erreur récupération détails année" });
  }
});

/**
 * ➕ POST /academic-years
 * Créer une nouvelle année académique
 */
router.post("/", async (req: AuthedRequest, res) => {
  try {
    const { name, session, startDate, endDate, isCurrent } = req.body;

    if (!name || !session || !startDate || !endDate) {
      return res.status(400).json({ 
        error: "Champs requis : name, session (octobre/fevrier), startDate, endDate" 
      });
    }

    // Validation session
    if (!["octobre", "fevrier"].includes(session.toLowerCase())) {
      return res.status(400).json({ 
        error: "Session doit être 'octobre' ou 'fevrier'" 
      });
    }

    // Si on veut activer cette année, on n'empêche PAS d'autres années d'être actives.
    // Règle métier: les sessions Octobre et Février peuvent se chevaucher et être toutes deux actives.
    // Si besoin d'exclusivité par session, décommentez ci-dessous pour désactiver uniquement la même session.
    // if (isCurrent) {
    //   await prisma.academicYear.updateMany({
    //     where: { isCurrent: true, session },
    //     data: { isCurrent: false },
    //   });
    // }

    const year = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        session: session.toLowerCase(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false,
      },
    });

    res.status(201).json(year);
  } catch (err: any) {
    console.error("❌ Erreur POST /academic-years:", err);
    
    // Erreur de contrainte unique
    if (err.code === "P2002") {
      return res.status(409).json({ 
        error: "Une année avec ce nom existe déjà" 
      });
    }
    
    res.status(500).json({ error: "Erreur création année académique" });
  }
});

/**
 * ✏️ PATCH /academic-years/:id
 * Modifier une année académique
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, session, startDate, endDate } = req.body;

    const updateData: any = {};
    
    if (name) updateData.name = name.trim();
    if (session) {
      if (!["octobre", "fevrier"].includes(session.toLowerCase())) {
        return res.status(400).json({ 
          error: "Session doit être 'octobre' ou 'fevrier'" 
        });
      }
      updateData.session = session.toLowerCase();
    }
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    const updated = await prisma.academicYear.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Erreur PATCH /academic-years/:id:", err);
    res.status(500).json({ error: "Erreur modification année" });
  }
});

/**
 * 🔄 PATCH /academic-years/:id/set-current
 * Définir cette année comme année courante (désactive les autres)
 */
router.patch("/:id/set-current", async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'année existe et n'est pas archivée
    const year = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!year) {
      return res.status(404).json({ error: "Année non trouvée" });
    }

    if (year.isArchived) {
      return res.status(400).json({ 
        error: "Impossible d'activer une année archivée" 
      });
    }

    // Exclusivité par session: une seule année courante par session (Oct/Fév)
    await prisma.academicYear.updateMany({
      where: { session: year.session, isCurrent: true },
      data: { isCurrent: false },
    });

    const updated = await prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Erreur PATCH /academic-years/:id/set-current:", err);
    res.status(500).json({ error: "Erreur activation année" });
  }
});

/**
 * 📦 PATCH /academic-years/:id/archive
 * Archiver une année académique
 */
router.patch("/:id/archive", async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query as { force?: string };
    const userId = req.user?.id;

    const year = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!year) {
      return res.status(404).json({ error: "Année non trouvée" });
    }

    if (year.isCurrent && force !== "true") {
      return res.status(400).json({ 
        error: "Impossible d'archiver l'année en cours. Activez d'abord une autre année ou utilisez force=true pour les tests." 
      });
    }

    const archived = await prisma.academicYear.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedById: userId,
        isCurrent: false, // sécurité
      },
    });

    res.json(archived);
  } catch (err) {
    console.error("❌ Erreur PATCH /academic-years/:id/archive:", err);
    res.status(500).json({ error: "Erreur archivage année" });
  }
});

/**
 * 🔓 PATCH /academic-years/:id/unarchive
 * Désarchiver une année académique
 */
router.patch("/:id/unarchive", async (req, res) => {
  try {
    const { id } = req.params;

    const unarchived = await prisma.academicYear.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedById: null,
      },
    });

    res.json(unarchived);
  } catch (err) {
    console.error("❌ Erreur PATCH /academic-years/:id/unarchive:", err);
    res.status(500).json({ error: "Erreur désarchivage année" });
  }
});

/**
 * 🗑️ DELETE /academic-years/:id
 * Supprimer une année (soft delete)
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier qu'elle n'est pas en cours
    const year = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (year?.isCurrent) {
      return res.status(400).json({ 
        error: "Impossible de supprimer l'année en cours" 
      });
    }

    // Soft delete
    await prisma.academicYear.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ ok: true, message: "Année supprimée" });
  } catch (err) {
    console.error("❌ Erreur DELETE /academic-years/:id:", err);
    res.status(500).json({ error: "Erreur suppression année" });
  }
});

/**
 * 🧩 Clonage de groupes et sous-groupes depuis une année source
 * POST /academic-years/:id/clone-groups?from=SOURCE_ID
 */
router.post("/:id/clone-groups", async (req, res) => {
  try {
    const { id } = req.params; // cible
    const from = (req.query.from as string) || "";
    if (!from) return res.status(400).json({ error: "Paramètre 'from' requis" });

    const target = await prisma.academicYear.findUnique({ where: { id } });
    const source = await prisma.academicYear.findUnique({ where: { id: from } });
    if (!target || !source) return res.status(404).json({ error: "Année source ou cible introuvable" });

    const sourceGroups = await prisma.group.findMany({
      where: { academicYearId: from, deletedAt: null },
      include: { subGroups: true },
    });

    let groupsCreated = 0;
    for (const g of sourceGroups) {
      const newGroup = await prisma.group.create({
        data: { name: g.name, label: g.label, academicYearId: id },
      });
      groupsCreated += 1;
      for (const sg of g.subGroups) {
        await prisma.subGroup.create({
          data: {
            code: sg.code,
            label: sg.label,
            groupId: newGroup.id,
          },
        });
      }
    }

    res.json({ clonedFrom: from, target: id, groupsCreated });
  } catch (err) {
    console.error("❌ Erreur POST /academic-years/:id/clone-groups:", err);
    res.status(500).json({ error: "Erreur clonage groupes" });
  }
});

/**
 * 🧩 Clonage des cours (sans sessions) et des affectations
 * - Duplique Course (code, name, type, domain, totalHours, totalSessions, coef)
 * - Recrée les liens Course↔SubGroup et Course↔Professor dans l'année cible
 * POST /academic-years/:id/clone-courses?from=SOURCE_ID
 */
router.post("/:id/clone-courses", async (req, res) => {
  try {
    const { id } = req.params; // cible
    const from = (req.query.from as string) || "";
    if (!from) return res.status(400).json({ error: "Paramètre 'from' requis" });

    const target = await prisma.academicYear.findUnique({ where: { id } });
    const source = await prisma.academicYear.findUnique({ where: { id: from } });
    if (!target || !source) return res.status(404).json({ error: "Année source ou cible introuvable" });

    const sourceCourses = await prisma.course.findMany({
      where: { academicYearId: from, deletedAt: null },
      include: { subGroups: true, professors: true },
    });

    let coursesCreated = 0;
    for (const c of sourceCourses) {
      const newCourse = await prisma.course.create({
        data: {
          code: c.code,
          name: c.name,
          type: c.type,
          domain: c.domain,
          totalHours: c.totalHours,
          totalSessions: c.totalSessions,
          coef: c.coef ?? 1,
          academicYearId: id,
          // Liens profs et sous-groupes clonés en connect direct sur les mêmes IDs
          professors: { connect: c.professors.map((p) => ({ id: p.id })) },
          subGroups: { connect: c.subGroups.map((sg) => ({ id: sg.id })) },
        },
      });
      coursesCreated += 1;
    }

    res.json({ clonedFrom: from, target: id, coursesCreated });
  } catch (err) {
    console.error("❌ Erreur POST /academic-years/:id/clone-groups:", err);
    res.status(500).json({ error: "Erreur clonage groupes" });
  }
});

/**
 * 🧮 POST /academic-years/recompute
 * Met à jour le statut des années: toute année dont endDate < maintenant n'est plus courante.
 * Ne les archive pas automatiquement, mais retourne la liste des années "terminées" pour action.
 */
router.post("/recompute", async (req, res) => {
  try {
    const now = new Date();

    // Désactiver isCurrent pour les années dépassées (non archivées)
    await prisma.academicYear.updateMany({
      where: { isArchived: false, isCurrent: true, endDate: { lt: now } },
      data: { isCurrent: false },
    });

    const finished = await prisma.academicYear.findMany({
      where: { isArchived: false, endDate: { lt: now } },
      orderBy: { endDate: "desc" },
      select: { id: true, name: true, session: true, startDate: true, endDate: true, isCurrent: true },
    });

    res.json({ now, finished, updatedCount: finished.length });
  } catch (err) {
    console.error("❌ Erreur POST /academic-years/recompute:", err);
    res.status(500).json({ error: "Erreur recalcul statut des années" });
  }
});

export default router;
