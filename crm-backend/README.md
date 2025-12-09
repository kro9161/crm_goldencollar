# CRM École — Backend Starter (Express + Prisma + JWT)

Fonctionnalités incluses (scaffold prêt) :
- Auth JWT + rôles (`admin`, `administratif`, `prof`, `eleve`)
- Routes: `/auth`, `/users`, `/classes`, `/courses`, `/absences`, `/import/json`, `/import/export/json`
- Sécurité: helmet, rate-limit, CORS, bcrypt
- Admin: `/admin/permissions` (page minimale de démo)
- Prisma schema (PostgreSQL)

## Démarrage

1. Installer dépendances
```bash
pnpm install
```

2. Configurer l'environnement
```bash
cp .env.example .env
# puis ajuster DATABASE_URL & JWT_SECRET si besoin
```

3. Migrations Prisma
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

4. Lancer en dev
```bash
pnpm dev
```

Vous verrez :
```
✅ Admin: admin@school.local / Admin123!
🚀 API running at http://localhost:4000
```

## Tests rapides

- Login (admin)
```
POST /auth/login
{ "email": "admin@school.local", "password": "Admin123!" }
```

- Lister classes (avec `Authorization: Bearer <token>`)
```
GET /classes
```

- Créer une classe
```
POST /classes
{ "name":"Master Informatique","level":"M1","options":["IA","Cloud"] }
```

- Import JSON intelligent
```
POST /import/json
{
  "users":[{"email":"prof@ecole.fr","firstName":"Marie","lastName":"Durand","role":"prof"}],
  "classes":[{"name":"Master Informatique","level":"M1","modules":[{"name":"Python avancé","professorEmail":"prof@ecole.fr"}]}]
}
```

- Faire l'appel
```
POST /absences/mark
{ "courseId":"...","date":"2025-11-12T09:00:00.000Z",
  "presences":[{"studentId":"...","status":"present"}]
}
```

## Note
Cette base est volontairement légère pour démarrer vite. On branchera ensuite l'emailing, l'import Excel et l'intégration Moodle.
