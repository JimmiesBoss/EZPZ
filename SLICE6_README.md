# Profolio — Slice 6

**True operating cost · all-in reporting · IFMA/BOMA/CoStar standards · live Analyze**

This slice makes occupancy cost reflect what a space *truly* costs, splits the
story between the dashboard and the report, adds the industry-standard analysis
lenses, and confirms the Analyze button is fully wired end-to-end.

---

## What's new

### 1. Expanded expense model (true cost of a space)
New optional fields on each lease (migration `0007_expenses.sql`):

- **Recurring operating ($/yr):** utilities, parking, property tax, insurance,
  janitorial — joining existing base rent, CAM, and other.
- **One-time / capital ($):** tenant improvement **and TI allowance** (a credit
  that's subtracted), furniture/FF&E, construction/build-out, moving, other.

The engine amortizes **net capital (spend − TI allowance) over the lease term**
and now produces both **operating** and **fully-loaded** cost figures, an
operating-expense category breakdown, a capital breakdown, cost-per-employee,
cost-per-seat, load factor and density.

### 2. Dashboard vs. report split
- **Dashboard leads with true operating cost** — the recurring cost of running the
  space (`total_portfolio_annual_cost`, `cost_per_sf_total`, the operating
  breakdown).
- **Reports show the all-in picture** — the PDF's new *"Occupancy Cost — All-In"*
  section itemizes every combined expense (operating categories → one-time/capital
  net of the TI allowance → amortized annual) and ends with the **fully-loaded**
  annual cost and cost/SF.

### 3. IFMA / BOMA / CoStar analysis
A new `standards_benchmarks` block in the results (additive — the 10-point
checklist is unchanged): IFMA density + utilization, BOMA load factor + operating
expense intensity, CoStar fully-loaded cost/SF vs. market tier. Each returns a
value, benchmark, pass/warning/fail status, and a plain-language note.

### 4. Analyze button (replaces the "next slice" placeholder)
The `analyze` Edge Function is fully implemented and returns everything the
dashboard needs (a snapshot is also saved). Wire the button to it — see
`docs/LOVABLE_BUILD.md` → *"Wire the Analyze button"* for the exact
`supabase.functions.invoke('analyze', …)` call. If it errors, the function just
needs deploying (below).

---

## How to apply

**Supabase — database**
- New project: apply all migrations (`supabase/migrations/0001…0007`) via
  `supabase db push`, or paste `profolio_full_schema.sql` (in the full rollout
  bundle) into the SQL editor.
- Already on Slice 5: apply just `supabase/migrations/0007_expenses.sql`.

**Supabase — Edge Functions** (this is what makes Analyze work)
```bash
supabase functions deploy analyze import-csv export-pdf
```
The engine change flows through automatically; no function edits needed.

**Lovable — front end**
- Dashboard: headline **operating** cost; keep fully-loaded for the report /
  drill-down (`docs/LOVABLE_BUILD.md`, Screen 5).
- Report: `export-pdf` already renders the all-in section (Screen 6).
- Intake wizard: the Lease & cost step now has grouped **Lease term · Recurring
  annual costs · One-time/build-out costs** with a live fully-loaded readout
  (`docs/INTAKE_WIZARD.md`, Step 3b).
- Wire the Analyze button per the spec.

---

## What's in this bundle

```
SLICE6_README.md               this file
docs/                          front-end build specs for Lovable
  LOVABLE_BUILD.md             screens, dashboard outputs, Analyze-button wiring
  INTAKE_WIZARD.md             guided manual-entry wizard (with the new cost fields)
  INTEGRATION.md               Supabase CRUD + RPC + function contract
  DATA_MODEL.md                schema & access model
  CALCULATIONS.md              what the engine computes (true cost + standards)
engine/                        calculation engine (imported by the functions)
supabase/functions/            analyze · import-csv · export-pdf (+ shared) + deno.json
supabase/migrations/           0001…0007 (0007 = the new expense fields)
supabase/config.toml           project + function + bucket config
supabase/seed.sql              optional demo data
supabase/templates/            CSV upload templates (leases template has the new columns)
ROLLOUT.md                     full phased install guide
Portfolio_Analysis_Tool_Technical_Brief.md   original brief (context)
```

## Verified

37 engine unit tests pass; TypeScript and Deno type-check clean; all 7 migrations
+ seed apply cleanly on Postgres 16. The `analyze` / `import-csv` / `export-pdf`
functions type-check against the Supabase Deno runtime.
