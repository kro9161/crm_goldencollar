import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authRequired } from '../middlewares/auth.js';
const prisma = new PrismaClient();
const router = Router();
router.use(authRequired);
router.post('/json', async (req, res) => {
    const payload = req.body || {};
    const report = {
        groupsCreated: 0,
        subGroupsCreated: 0,
        coursesCreated: 0,
        professorsLinked: 0,
        coursesLinkedToSubGroups: 0,
        usersCreated: 0,
        usersAssigned: 0,
    };
    // -------------------------
    // 1) Import des GROUPES
    // -------------------------
    if (Array.isArray(payload.groups)) {
        for (const g of payload.groups) {
            const group = await prisma.group.upsert({
                where: { name: g.name },
                update: { label: g.label || null },
                create: { name: g.name, label: g.label || null },
            });
            report.groupsCreated++;
            // ---- Sous-groupes ----
            if (Array.isArray(g.subGroups)) {
                for (const sg of g.subGroups) {
                    const subGroup = await prisma.subGroup.upsert({
                        where: { code: sg.code },
                        update: {
                            label: sg.label || null,
                            level: sg.level || null,
                            session: sg.session || null,
                            groupId: group.id,
                        },
                        create: {
                            code: sg.code,
                            label: sg.label || null,
                            level: sg.level || null,
                            session: sg.session || null,
                            groupId: group.id,
                        },
                    });
                    report.subGroupsCreated++;
                    // ---- Modules ----
                    if (Array.isArray(sg.modules)) {
                        for (const m of sg.modules) {
                            let course = await prisma.course.findFirst({
                                where: { name: m.name },
                            });
                            if (!course) {
                                course = await prisma.course.create({
                                    data: { name: m.name },
                                });
                                report.coursesCreated++;
                            }
                            await prisma.course.update({
                                where: { id: course.id },
                                data: {
                                    subGroups: { connect: [{ id: subGroup.id }] },
                                },
                            });
                            report.coursesLinkedToSubGroups++;
                            // ---- Prof ----
                            if (m.professorEmail) {
                                const prof = await prisma.user.upsert({
                                    where: { email: m.professorEmail },
                                    update: {},
                                    create: {
                                        email: m.professorEmail,
                                        firstName: m.professorFirstName || 'Prof',
                                        lastName: m.professorLastName || '',
                                        role: 'prof',
                                        password: bcrypt.hashSync('Prof123!', 10),
                                    },
                                });
                                await prisma.course.update({
                                    where: { id: course.id },
                                    data: {
                                        professors: { connect: [{ id: prof.id }] },
                                    },
                                });
                                report.professorsLinked++;
                            }
                        }
                    }
                }
            }
        }
    }
    // -------------------------
    // 2) Import des USERS
    // -------------------------
    if (Array.isArray(payload.users)) {
        for (const u of payload.users) {
            const exists = await prisma.user.findUnique({
                where: { email: u.email },
            });
            if (!exists) {
                const tmp = Math.random().toString(36).slice(2, 10) + 'A1!';
                await prisma.user.create({
                    data: {
                        email: u.email,
                        firstName: u.firstName || '',
                        lastName: u.lastName || '',
                        role: u.role || 'eleve',
                        subGroups: u.subGroupCode
                            ? { connect: { code: u.subGroupCode } }
                            : undefined,
                        password: bcrypt.hashSync(tmp, 10),
                    },
                });
                report.usersCreated++;
            }
            else if (u.subGroupCode) {
                await prisma.user.update({
                    where: { email: u.email },
                    data: {
                        subGroups: { connect: { code: u.subGroupCode } },
                    },
                });
                report.usersAssigned++;
            }
        }
    }
    res.json({ status: 'ok', report });
});
// -------------------------
// EXPORT COMPLET
// -------------------------
router.get('/export/json', async (_req, res) => {
    const data = {
        groups: await prisma.group.findMany({
            include: { subGroups: true },
        }),
        users: await prisma.user.findMany(),
        courses: await prisma.course.findMany({
            include: { subGroups: true, professors: true },
        }),
        rooms: await prisma.room.findMany(),
        sessions: await prisma.courseSession.findMany(),
        presences: await prisma.presence.findMany(),
    };
    res.json(data);
});
export default router;
