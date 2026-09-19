# SPPI Assessment Application

A web application that operationalizes the **Spatial Project Performance
Index (SPPI)** — a composite instrument scoring GeoAI-enabled projects on
managerial, agility, and spatial-governance dimensions. Built from the SPPI
App PRD (v0.1).

A user selects a rubric level (or enters precise raw values) for each of 10
indicators; the app computes the composite SPPI score, its classification
band, the weakest indicator, and a recommended action — server-side, always
reproducible from the stored inputs and weight configuration.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + **PostgreSQL**
- **NextAuth** (Credentials provider, JWT sessions) for auth + RBAC
- **Tailwind CSS**, **Recharts** for the dashboards
- **@react-pdf/renderer** for PDF export
- **Vitest** for the computation engine's unit tests

## Core computation engine

`src/lib/sppi/engine.ts` implements the 4-stage pipeline from the PRD
(ingest/edge-case guard → normalize to [0,1] → weight → aggregate/classify),
covering:

- 10 indicators across 3 dimensions (Managerial: SPI, CPI, SC · Agility: VS,
  CR, FIR · Spatial-Governance: ACC, XAI, PDP, OGC)
- Quick mode (1–5 rubric, linear 0.00–1.00 mapping) and Precise mode
  (formula-driven, server-computed — the client never sends a normalized
  value directly)
- PDP as a severity-weighted mean of 7 statutory sub-items; XAI as the
  proportion of 4 verification conditions met
- Five-class band classification and a configurable band → action lookup
- A lightweight Monte Carlo sensitivity interval

`src/lib/sppi/engine.test.ts` reproduces the PRD's worked example exactly
(D_m = 0.67, D_k = 0.58, D_s = 0.63, SPPI = 0.629 ≈ 0.63, High / Monitor).

## Roles

Project Manager, PMO/Portfolio, Researcher, Admin, and Viewer, matching
Table 1 of the PRD. Every permission is enforced server-side in the API
routes (`src/lib/authz.ts`) — never inferred from what the client UI shows.

## Local development

1. **Database** — provide a PostgreSQL connection string in `.env`
   (copy `.env.example`). Any Postgres works (local, Neon, Vercel Postgres, Supabase).
2. Install dependencies and set up the database:
   ```bash
   npm install
   npx prisma migrate dev
   npm run seed
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
4. Run the computation engine's unit tests:
   ```bash
   npm test
   ```

### Demo accounts (seeded, password `demo1234`)

| Role | Email |
|---|---|
| Project Manager | pm@sppi.demo |
| PMO / Portfolio | pmo@sppi.demo |
| Researcher | researcher@sppi.demo |
| Admin | admin@sppi.demo |
| Viewer | viewer@sppi.demo |

The seed also creates 5 demo projects, a default WeightConfig (provisional
0.35 / 0.30 / 0.35 dimension split), and several completed assessments —
including one that reproduces the PRD's worked example exactly.

## Deploying to Vercel

1. Import this repository into a new Vercel project (Framework: Next.js).
2. Add a Postgres database — from the project's **Storage** tab, add the
   **Neon** (or Vercel Postgres) integration; this sets `DATABASE_URL`
   automatically. Alternatively supply your own Postgres connection string
   as an environment variable.
3. Set `NEXTAUTH_SECRET` (a long random string) and `NEXTAUTH_URL` (your
   production URL) as environment variables.
4. Deploy. The build runs `prisma generate && next build`.
5. Run the initial migration and seed against the production database once:
   ```bash
   DATABASE_URL="<production URL>" npx prisma migrate deploy
   DATABASE_URL="<production URL>" npm run seed
   ```

## Project structure

```
prisma/schema.prisma        Data model (User, Project, Assessment, IndicatorScore,
                             SubItemScore, WeightConfig, SPPIResult, AuditLog)
prisma/seed.ts               Demo users, projects, and assessments
src/lib/sppi/                Computation engine, indicator definitions, weights, schemas
src/lib/authz.ts             Server-side RBAC / project scoping
src/app/api/                 Route handlers (projects, assessments, portfolio,
                              weight-configs, users, audit-log, PDF export)
src/app/                     Pages: login, projects, assessment input, results
                              dashboard, portfolio dashboard, admin
```
