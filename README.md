# Vertex 2

ERP de compras, inventario, ventas y cartera — **multiempresa**, trazable y auditado.
Migración del Vertex original (Laravel 12 + Livewire) a un fullstack **Next.js 15 + Supabase**, desplegable en **Vercel**.

> Estado: **Fase 0–1 completas** (cimientos + núcleo). El resto de módulos se migra por fases — ver [docs/ROADMAP.md](docs/ROADMAP.md).

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15.5.18 (App Router, React 19, TypeScript) |
| Base de datos | Supabase Postgres |
| ORM / migraciones | Drizzle ORM + drizzle-kit (`schema.ts` = fuente de verdad) |
| Autenticación | Custom (bcrypt + sesión JWT en cookie httpOnly con `jose`) |
| Multitenencia | En capa de servidor por `empresa_id` (sin RLS) |
| UI | Tailwind CSS v4 + shadcn/ui · IBM Plex + Bricolage Grotesque |
| Storage | Supabase Storage (imágenes/adjuntos, fases posteriores) |
| Tests | Vitest (prueba de escritorio por cada función con lógica) |
| Deploy | Vercel |

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local        # completa DATABASE_URL y SESSION_SECRET
pnpm db:push                      # aplica el esquema (30 tablas vxNN) a Supabase
pnpm db:seed                      # roles, unidades, empresa demo y usuarios
pnpm dev
```

Credenciales del seed:

- **Superadmin** — `admin@vertex.co` / `Vertex2026!`
- **Admin demo** — `admin@demo.co` / `Vertex2026!`

### Variables de entorno

- `DATABASE_URL` — conexión *pooler* (Supavisor, puerto 6543) de Supabase.
- `SESSION_SECRET` — ≥ 32 caracteres (`openssl rand -base64 48`).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — para Storage.

## Scripts

| Script | Acción |
|--------|--------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm test` | Pruebas (Vitest) |
| `pnpm db:generate` | Genera SQL de migración desde el esquema |
| `pnpm db:push` | Aplica el esquema directo a la BD |
| `pnpm db:migrate` | Aplica las migraciones SQL versionadas |
| `pnpm db:seed` | Siembra datos base |

## Estructura

```
src/
  app/
    (auth)/login/       login + server action
    (app)/              layout protegido (sidebar + topbar)
      dashboard/
  components/           UI (shadcn) + sidebar/topbar/marca
  lib/
    auth/               lockout · password · session · roles · service · cookies
    db/                 schema.ts (vxNN) · index.ts · seed.ts
    audit.ts            auditoría vx03
    modules.ts          navegación
supabase/migrations/    SQL generado por drizzle-kit
docs/ROADMAP.md         plan de migración por fases
```

## Despliegue en Vercel

1. Importa este repo en Vercel.
2. Configura las variables de entorno (`DATABASE_URL`, `SESSION_SECRET`, claves de Supabase).
3. Deploy. El build no requiere base de datos (conexión perezosa en runtime).
