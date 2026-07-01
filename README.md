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
  multi-tenant client isolation.
- **`supabase/functions/`** — Deno Edge Functions that wrap the engine:
  `analyze`, `import-csv`, `export-pdf`.
- **`supabase/seed.sql` / `supabase/templates/`** — demo data and CSV upload
  templates.
- **`docs/`** — data model, calculation reference, and Lovable/Supabase
  integration guide.

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
# 1. Apply schema + RLS and load demo data
supabase db reset            # runs migrations/*.sql then seed.sql

# 2. Serve / deploy the Edge Functions
supabase functions serve --env-file supabase/.env   # local
supabase functions deploy analyze import-csv export-pdf

# 3. Create the reports storage bucket (private) for PDF export
#    (Dashboard → Storage → New bucket "reports", or via SQL/CLI)
```

Copy `.env.example` → `supabase/.env` and fill in the Supabase URL/keys. See
[`docs/INTEGRATION.md`](docs/INTEGRATION.md) for the exact request/response
contract Lovable uses to call each function.

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
25 clients with hard data isolation, manual + CSV entry, embedded IFMA/CoStar
benchmarks. Out of scope (Phase 2+): scenario modeling, Yardi/CoStar API
integration, OCR, audit trails, non-office property types.

> **Note on a benchmark definition:** the brief's *cost per SF per employee*
> formula (§4.1) and its *cost per SF per employee* benchmark table (§4.2) are on
> different numeric scales. The engine implements both exactly as written and
> flags the resulting variance; see `docs/CALCULATIONS.md` for the detail and the
> one-line change if the benchmark is meant to be *cost per SF*.
