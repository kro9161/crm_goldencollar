import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRequired } from '../middlewares/auth.js';

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
router.get('/permissions', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin-permissions.html'));
});

router.get('/permissions/list', async (_req, res) => {
  const permissions = await prisma.permission.findMany({ include: { roleLinks: true } });
  res.json(permissions);
});

router.post('/permissions/toggle', async (req, res) => {
  const { role, key, value } = req.body;
  if (!role || !key) return res.status(400).json({ error: 'Missing role/key' });
  let perm = await prisma.permission.findUnique({ where: { key } });
  if (!perm) perm = await prisma.permission.create({ data: { key, label: key } });
  const link = await prisma.rolePermission.upsert({
    where: { role_permissionId: { role, permissionId: perm.id } as any },
    update: { value: !!value },
    create: { role, permissionId: perm.id, value: !!value }
  });
  res.json(link);
});

export default router;
