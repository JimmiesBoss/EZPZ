# Data Model

Postgres schema in `supabase/migrations/0001_init.sql`; row-level security in
`0002_rls.sql`. Mirrors brief §3, with `client_id` on every row for hard
multi-tenant isolation (brief §9).

## Tables

- **clients** — tenant. `id`, `name`.
- **client_members** — links a Supabase auth user to a client (`client_id`,
  `user_id`, `role`). Drives RLS.
- **portfolios** — `client_id`, `name`, `notes`.
- **properties** — office building. `portfolio_id`, address fields,
  `property_type` (`owned|leased`), `total_rentable_sf`, `headcount_on_site`,
  optional `total_usable_sf`, `market_tier` (`tier1|tier2|tier3`), etc.
- **leases** — `property_id`, term dates, `lease_type`
  (`gross|triple_net|modified_gross`), `annual_rent`, `cams_annual`,
  `other_annual_costs`, break-clause fields.
- **occupancy_records** — `property_id`, `data_source`, `measurement_date`,
  `occupied_desks`, `total_desks_available`, optional rates.
- **space_breakdowns** — `property_id`, `space_type`, `allocated_sf`,
  `allocated_headcount`, optional `utilization_rate_percent`.
- **analysis_snapshots** — immutable result of one analysis run. `portfolio_id`,
  `snapshot_date`, `data_as_of_date`, `analysis_results` (jsonb — the full
  engine output, brief §3.2), `data_completeness_percent`.

## Enums

Stored as `text` with `CHECK` constraints instead of Postgres `ENUM`, so the
allowed values stay in lock-step with the engine's enum tuples in
`engine/types.ts` without enum-migration friction. The same tuples back the Zod
validation in `engine/validation.ts`, so the database, API validation, and CSV
import all enforce identical value sets.

## Constraints (brief §7)

Enforced in-database as a backstop to the Zod layer:

- `total_rentable_sf > 0`, `headcount_on_site >= 0`,
  `occupancy_rate_percent between 0 and 100`.
- `lease_start_date < lease_end_date`; `break_date` within the lease term.
- `occupied_desks <= total_desks_available`; `total_desks_available > 0`.
- `measurement_date <= current_date` (no future occupancy).
- `ON DELETE CASCADE` from portfolio → property → lease/occupancy/space, so
  removing a portfolio cleans up its children. (The brief's "block property
  delete while children exist" rule, §7, is an app-layer choice; the schema
  cascades by default — change to `ON DELETE RESTRICT` if you prefer the block.)

## Indexes (brief §8)

`client_id` and the parent foreign key are indexed on every child table
(`portfolio_id` on properties, `property_id` on leases/occupancy/space,
`portfolio_id` on snapshots) to keep client-scoped and drill-down queries fast at
the MVP volume targets (25 clients, ≤250 properties, ≤2,500 leases).

## Isolation (brief §9)

RLS policies restrict every row to clients the current user belongs to via
`is_client_member()`. A direct browser call with the anon key therefore cannot
read across clients. Edge Functions run under the caller's JWT for DB access
(RLS applies); only Storage uploads for PDF export use the service role.
