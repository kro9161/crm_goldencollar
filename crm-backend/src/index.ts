import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import roomsRouter from './routes/rooms.js';
import profRouter from "./routes/prof.js";
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import groupsFullRoutes from "./routes/groups-full.js";
import coursesRouter from './routes/courses.js';
import absencesRouter from './routes/absences.js';
import importExportRouter from './routes/importExport.js';
import adminRouter from './routes/adminPanel.js';
import planningRouter from "./routes/planning.js";
import { authRequired } from './middlewares/auth.js';
import eleveRoutes from "./routes/eleve.js";
import notesRoutes from "./routes/notes.js";
import attendanceRoutes from "./routes/attendance.js";
import groupsRouter from "./routes/groups.js";
import subGroupsRouter from "./routes/subgroups.js";
import academicYearsRouter from "./routes/academicYears.js";
import filieresRouter from "./routes/filieres.js";
import levelsRouter from "./routes/levels.js";


const prisma = new PrismaClient();
const app = express();

// Sécurité + middlewares
app.use(helmet());
app.use(cookieParser());

// CORS en premier pour que les erreurs (y compris rate limit) retournent les headers CORS
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
    ],
    credentials: true,
  })
);

// Relaxe le rate limit pour le dev (éviter les 429 sur les rafraîchissements)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

app.use(express.json());
app.use(morgan('dev'));

// Test API
app.get('/health', (_req, res) => res.json({ ok: true }));

// Fichiers publics
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/public', express.static(path.join(__dirname, '../public')));

// Routes principales
app.use('/auth', authRouter);
app.use('/users', usersRouter);

app.use('/courses', coursesRouter);
app.use('/absences', absencesRouter);
app.use('/import', importExportRouter);
app.use('/admin', adminRouter);
app.use('/rooms', authRequired, roomsRouter);
app.use("/planning", planningRouter);
app.use("/prof", profRouter);
app.use("/eleves", eleveRoutes);
app.use("/notes", notesRoutes);
app.use("/", attendanceRoutes); // Monté sur / car les routes contiennent déjà /courses
app.use("/groups", groupsRouter);
app.use("/groups-full", groupsFullRoutes);
app.use("/subgroups", subGroupsRouter);
app.use("/academic-years", academicYearsRouter);
app.use("/filieres", filieresRouter);
app.use("/levels", levelsRouter);


// Création automatique de l'admin si absent
(async () => {
  const count = await prisma.user.count({ where: { role: 'admin' } });
  if (count === 0) {
    const hash = bcrypt.hashSync('Admin123!', 10);
    await prisma.user.create({
      data: {
        email: 'admin@school.local',
        password: hash,
        firstName: 'Admin',
        lastName: 'Root',
        role: 'admin',
      },
    });
    console.log('✅ Admin: admin@school.local / Admin123!');
  }
})().catch(console.error);

// Création automatique d’un compte administratif si absent
(async () => {
  const exists = await prisma.user.findFirst({ where: { role: "administratif" } });
  if (!exists) {
    const hash = bcrypt.hashSync("Secretariat123!", 10);
    await prisma.user.create({
      data: {
        email: "secretariat@school.local",
        password: hash,
        firstName: "Secrétariat",
        lastName: "Ecole",
        role: "administratif",
      },
    });
    console.log("✅ Compte administratif : secretariat@school.local / Secretariat123!");
  }
})();

// Démarrage du serveur
const port = process.env.PORT || 4000;


app.listen(port, () =>
  console.log(`🚀 API running at http://localhost:${port}`)
);
