# Profolio

**Real Estate Portfolio Analysis & Right-Sizing Recommendation Engine** — the
backend for a corporate real-estate right-sizing tool. Users upload portfolio
data (properties, leases, occupancy, costs); Profolio analyzes it against
industry benchmarks and returns interactive-dashboard data plus exportable PDF
reports showing whether an organization is under/over-utilizing space, needs more
SF, or has the right SF with the wrong usage mix.

Built to the *Real Estate Portfolio Analysis Tool — Technical Development Brief
(v1.0, MVP)*.

## Architecture

The front end is **Lovable.AI**; persistence, auth and the data API are
**Supabase**. There is no separate API server — Lovable does basic CRUD directly
against Supabase (PostgREST + the JS client under row-level security). Profolio
provides the parts that can't live in the browser:

```
Lovable (React UI)
   │  CRUD (portfolios / properties / leases / occupancy)  →  Supabase Postgres (RLS)
   │  heavy operations  →  Supabase Edge Functions ──┐
   └───────────────────────────────────────────────┐│
                                                    ▼▼
                             ┌──────────────────────────────────────┐
                             │  Calculation engine (portable TS)     │
                             │  metrics · red-flags · opportunities  │
                             │  CSV validation · report model        │
                             └──────────────────────────────────────┘
```

- **`engine/`** — the pure, dependency-light TypeScript calculation engine
  (no I/O). Fully unit-tested with Vitest. Runs unchanged in Node and Deno.
- **`supabase/migrations/`** — Postgres schema + row-level security for
  organization isolation and role-based access (one org = one portfolio).
- **`supabase/functions/`** — Deno Edge Functions that wrap the engine:
  `analyze`, `import-csv`, `export-pdf`.
- **`supabase/seed.sql` / `supabase/templates/`** — demo data and CSV upload
  templates.
- **`docs/`** — data model, calculation reference, deployment runbook
  (`DEPLOYMENT.md`), Lovable build spec (`LOVABLE_BUILD.md`), and the
  Supabase integration guide.

## What the engine does (brief §4–5)

| Capability | Module | Brief |
|---|---|---|
| Cost/SF, cost/SF/employee, utilization, occupancy, variance | `engine/metrics.ts` | §4.1 |
| Industry benchmark tables (IFMA/CoStar) | `engine/benchmarks.ts` | §4.2 |
| 10-point red-flag checklist | `engine/redflags.ts` | §4.3 |
| Consolidation / sublease / space-mix / renegotiation opportunities | `engine/opportunities.ts` | §4.4 |
| Utilization-issue root-cause classification | `engine/issues.ts` | §5.2 |
| Analysis pipeline orchestrator | `engine/analyze.ts` | §5.2 |
| CSV import + row/column validation | `engine/csv.ts` | §5.1 |
| Input validation rules | `engine/validation.ts` | §7 |
| PDF report model | `engine/report.ts` | §5.3 |

## Quickstart (engine)

```bash
npm install
npm test          # 30 unit tests over the calculation engine
npm run typecheck
```

## Deploying to Supabase

```bash
supabase link --project-ref <ref>
supabase db push             # schema + RLS + tenancy RPCs + reports bucket
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
supabase functions deploy analyze import-csv export-pdf
```

The migrations create everything the backend needs: the organization/portfolio
schema, RLS, the tenancy + user-admin RPCs (`create_organization`,
`invite_member`, …), the signup trigger, and the private `reports` storage
bucket. Full step-by-step (link, secrets, first-org bootstrap, smoke test) is in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). To build the UI in Lovable, hand it
[`docs/LOVABLE_BUILD.md`](docs/LOVABLE_BUILD.md); the call-by-call contract is in
[`docs/INTEGRATION.md`](docs/INTEGRATION.md).

## Edge Function endpoints

| Function | Purpose | Brief endpoint |
|---|---|---|
| `POST /functions/v1/analyze` | Run the engine over a portfolio, store an immutable snapshot | `POST /api/portfolios/{id}/analyze` |
| `POST /functions/v1/import-csv` | Validate + bulk-insert a CSV upload | `POST /api/portfolios/{id}/import-csv` |
| `POST /functions/v1/export-pdf` | Render a snapshot to PDF, return a signed URL | `POST /api/.../snapshots/{id}/export-pdf` |

Everything else in the brief's API surface (portfolio/property/lease/occupancy
CRUD) is served directly by Supabase's auto-generated data API — no custom code
needed. See `docs/INTEGRATION.md` for the mapping.

## Scope

MVP only, per the brief: office properties, snapshot (not continuous) analysis,
many organizations each with one portfolio and hard data isolation, role-based
access within an org, manual + CSV entry, embedded IFMA/CoStar benchmarks. Out of
scope (Phase 2+): scenario modeling, Yardi/CoStar API integration, OCR, audit
trails, non-office property types.

> **Note on cost benchmarking:** each property reports **both** `cost_per_sf` and
> `cost_per_sf_per_employee`. The §4.2 benchmark table is on a cost-per-SF scale,
> so the benchmark variance and cost red-flags compare against `cost_per_sf`;
> `cost_per_sf_per_employee` is reported as an informational efficiency metric.
> See `docs/CALCULATIONS.md` for the worked example.
