import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired, requireRole } from '../middlewares/auth.js';

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "administratif"));

// Liste des filières par année académique
router.get('/', async (req, res) => {
  try {
    const academicYearId = req.query.academicYearId as string;
    
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

    const filieres = await prisma.filiere.findMany({
      where: { 
        academicYearId: { in: yearIds },
        deletedAt: null 
      },
      include: {
        _count: {
          select: {
            users: true,
            courses: true
          }
        }
      },
      orderBy: { code: 'asc' },
    });
    res.json(filieres);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur listing filières' });
  }
});

// Création d'une filière
router.post('/', async (req, res) => {
  try {
    const { code, label, academicYearId, levelId } = req.body as { 
      code: string; 
      label?: string | null; 
      academicYearId: string;
      levelId?: string;
    };
    
    if (!code || !academicYearId) {
      return res.status(400).json({ error: 'code et academicYearId requis' });
    }

    const filiere = await prisma.filiere.create({
      data: { 
        code: code.trim().toUpperCase(), 
        label: label?.trim() || null, 
        academicYearId,
        ...(levelId && { levelId }),
      },
      include: { level: true, _count: { select: { users: true, courses: true } } },
    });
    res.status(201).json(filiere);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(400).json({ error: 'Cette filière existe déjà pour cette année' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erreur création filière' });
  }
});

// Modification d'une filière
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, label, levelId } = req.body;

    const filiere = await prisma.filiere.update({
      where: { id },
      data: {
        ...(code && { code: code.trim().toUpperCase() }),
        ...(label !== undefined && { label: label?.trim() || null }),
        ...(levelId !== undefined && { levelId: levelId || null }),
      },
      include: { level: true, _count: { select: { users: true, courses: true } } },
    });
    res.json(filiere);
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Filière non trouvée' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erreur modification filière' });
  }
});

// Suppression (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filiere = await prisma.filiere.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ ok: true, id: filiere.id });
  } catch (e) {
    res.status(500).json({ error: 'Erreur suppression filière' });
  }
});

export default router;
