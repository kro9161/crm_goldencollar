import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired, requireRole } from '../middlewares/auth.js';

const prisma = new PrismaClient();
const router = Router();

// 🔒 Tous les endpoints nécessitent l'auth et le rôle administratif
router.use(authRequired);
router.use(requireRole('admin', 'administratif'));

/**
 * 📋 GET /levels
 * Récupère tous les niveaux (BAC+1 à BAC+5) disponibles
 */
router.get('/', async (req, res) => {
  try {
    const levels = await prisma.level.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { filieres: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json(levels);
  } catch (err) {
    console.error('❌ Erreur GET /levels:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * ➕ POST /levels
 * Crée un nouveau niveau (BAC+1, BAC+2, etc.)
 * Body: { code: "BAC+1"|"BAC+2"|..., label?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { code, label } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code est requis' });
    }

    const level = await prisma.level.create({
      data: {
        code: code.toUpperCase(),
        label: label || null,
      },
      include: {
        _count: {
          select: { filieres: true },
        },
      },
    });

    res.status(201).json(level);
  } catch (err: any) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      return res
        .status(400)
        .json({ error: 'Ce code de niveau existe déjà' });
    }
    console.error('❌ Erreur POST /levels:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * ✏️ PATCH /levels/:id
 * Modifie un niveau
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, label } = req.body;

    const level = await prisma.level.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(label !== undefined && { label: label || null }),
      },
      include: {
        _count: {
          select: { filieres: true },
        },
      },
    });

    res.json(level);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Niveau non trouvé' });
    }
    if (err.code === 'P2002') {
      return res
        .status(400)
        .json({ error: 'Ce code de niveau existe déjà' });
    }
    console.error('❌ Erreur PATCH /levels/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * 🗑️ DELETE /levels/:id
 * Supprime un niveau (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const level = await prisma.level.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, id: level.id });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Niveau non trouvé' });
    }
    console.error('❌ Erreur DELETE /levels/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

