# CRM École - AI Coding Agent Instructions

## Project Architecture

This is a **monorepo CRM system for educational institutions** with separate backend and frontend:

- **Backend (`crm-backend/`)**: Express.js + TypeScript + Prisma ORM + PostgreSQL
- **Frontend (`crm-frontend/`)**: React 19 + TypeScript + Vite + TailwindCSS + React Router v7

### Core Domain Model

The system models French educational institutions with:
- **4 user roles**: `admin`, `administratif`, `prof`, `eleve` (stored as strings in `User.role`)
- **Academic structure**: `AcademicYear` → `Group` → `SubGroup` → students
- **Courses & Planning**: `Course` (modules) → `CourseSession` (scheduled instances) with attendance tracking
- **Many-to-many relationships**: Students belong to multiple `SubGroup`s; professors teach multiple courses

**Key Prisma patterns:**
- Soft deletes via `deletedAt` fields (never hard delete)
- CUIDs for all IDs (`@default(cuid())`)
- Explicit junction tables: `SubGroup` uses `@relation("UserSubGroups")` for student assignments
- All entities link to `AcademicYear` for multi-year data isolation

## Development Workflow

### Backend Commands
```bash
cd crm-backend
pnpm install           # Install dependencies
pnpm prisma:generate   # Generate Prisma Client after schema changes
pnpm prisma:migrate    # Create and apply migrations
pnpm dev               # Start dev server on port 4000
```

**Auto-seeded users on first run:**
- Admin: `admin@school.local` / `Admin123!`
- Administratif: `administratif@school.local` / `Admin123!`

### Frontend Commands
```bash
cd crm-frontend
pnpm install
pnpm dev              # Start Vite dev server on port 5173
```

### Critical: Always use `pnpm` (not npm/yarn)
Both projects use `pnpm-lock.yaml`. Use `pnpm` for all package management.

## Backend Patterns

### Route Structure
All routes in `src/routes/*.ts` follow this pattern:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired, requireRole } from '../middlewares/auth.js';

const prisma = new PrismaClient();
const router = Router();

router.use(authRequired);                    // JWT auth on all routes
router.use(requireRole("admin", "administratif")); // Role-based access

router.get('/', async (req, res) => { /* ... */ });
export default router;
```

**Important:** All imports use `.js` extension (even for `.ts` files) due to ES module requirements.

### Authentication Flow
1. **Login**: `POST /auth/login` returns JWT token + user object with role
2. **Protected routes**: Use `authRequired` middleware (adds `req.user` with `{ id, role, email }`)
3. **Role checks**: Use `requireRole(...roles)` middleware after `authRequired`
4. Token stored in `localStorage` on frontend, sent as `Authorization: Bearer <token>`

### Data Import Pattern
See `src/routes/importExport.ts` for the smart JSON import system:
- **Single endpoint** `POST /import/json` handles nested structures (groups → subgroups → courses → users)
- Uses `upsert` extensively to avoid duplicates
- Automatically links professors to courses via email lookup
- Returns detailed report of created/linked entities

### Prisma Best Practices
```typescript
// ✅ Always include academicYear filter for multi-year isolation
const courses = await prisma.course.findMany({
  where: { academicYearId: currentYear.id, deletedAt: null }
});

// ✅ Use select/include strategically (avoid over-fetching)
const session = await prisma.courseSession.findUnique({
  where: { id },
  include: {
    course: true,
    professor: { select: { firstName: true, lastName: true, email: true } },
    targetSubGroup: { include: { students: true } }
  }
});

// ✅ Soft delete pattern
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() }
});
```

## Frontend Patterns

### Routing & Role-Based Access
`App.tsx` defines role-specific layouts:
- `/admin` → `AdminDashboard` (role: `admin`)
- `/administratif/*` → `AdministratifLayout` with nested routes (role: `administratif`)
- `/prof/*` → `ProfLayout` with nested routes (role: `prof`)
- `/eleve` → `EleveDashboard` (role: `eleve`)

**Protected Route Pattern:**
```tsx
<Route path="administratif" element={
  <ProtectedRoute role="administratif">
    <AdministratifLayout />
  </ProtectedRoute>
}>
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="eleves" element={<Eleves />} />
  {/* Nested routes inherit protection */}
</Route>
```

### API Call Pattern
All components fetch from `http://localhost:4000` with JWT token:
```typescript
const token = localStorage.getItem("token");
const res = await fetch("http://localhost:4000/endpoint", {
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  }
});
```

### Layout Components
- `Layout.tsx`: Root layout with `<Outlet />` for top-level routes
- `AdministratifLayout.tsx`: Sidebar navigation for administrative staff
- `ProfLayout.tsx`: Sidebar navigation for professors
- Each layout wraps child routes with consistent navigation

## Key Integration Points

### Planning & Attendance Flow
1. `CourseSession` entities represent scheduled class instances
2. `attendanceStatus` enum: `NOT_STARTED` → `IN_PROGRESS` → `DONE`
3. `Presence` records link `CourseSession` + `User` (student) with status (`present`/`absent`/`retard`/`justifie`)
4. See `src/routes/attendance.ts` for mark attendance endpoint

### Groups & SubGroups Logic
- **Groups** are year-level containers (e.g., "Master Informatique 2024-2025")
- **SubGroups** are the actual student cohorts (e.g., "B3-DEV-A", "M1-IA-Octobre")
- Students (`User`) link to **multiple SubGroups** via `@relation("UserSubGroups")`
- Courses link to SubGroups, not individual students

### Notes & Bulletins
- `Note` model links student + course + optional session + periode
- `isPublished` boolean controls student visibility
- `coef` field on `Course` for weighted grade calculations

## Common Tasks

### Adding a New Route
1. Create `src/routes/myroute.ts` with router export
2. Import in `src/index.ts`: `import myRouter from './routes/myroute.js';`
3. Mount: `app.use('/myroute', authRequired, myRouter);`

### Adding a Prisma Model
1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma:migrate` (creates migration + regenerates client)
3. Import in routes: `import { PrismaClient } from '@prisma/client';`

### Adding a Frontend Page
1. Create component in `src/pages/administratif/MyPage.tsx`
2. Add route in `App.tsx` under appropriate layout
3. Add navigation link in corresponding layout component (e.g., `AdministratifLayout.tsx`)

## Conventions

- **French terminology**: Use French domain terms (élève, prof, cours, salle, etc.) in comments and labels
- **No hard deletes**: Always use `deletedAt` soft delete pattern
- **Type safety**: Use TypeScript strictly; define types for request/response payloads
- **Error handling**: Return appropriate HTTP status codes (400/401/403/404/500) with `{ error: "message" }` JSON
- **Validation**: Consider adding Zod schemas for request validation (already installed)

## Future Integrations (Planned)
- Email notifications via nodemailer (already installed)
- Excel import/export for bulk operations
- Moodle LMS integration
- Document generation (certificates, student cards) via `DocumentTemplate`/`GeneratedDocument`
