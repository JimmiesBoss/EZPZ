# Data Model

Postgres schema in `supabase/migrations/`. Mirrors brief §3, adapted to the
tenancy model below.

## Tenancy: organization → one portfolio

- **organizations** — the tenant: one company's private environment. Carries a
  light profile captured during intake (`name`, `industry`, `size_category`,
  `primary_region`, `notes`).
- **portfolios** — **exactly one per organization** (`org_id` is `UNIQUE`).
  Auto-created when the organization is created. Holds `name`, `notes`.
- **organization_members** — a user's role in an organization
  (`org_id`, `user_id`, `role`). `role ∈ {admin, editor, viewer}`; new members
  default to `admin`. This is the user structure that lets permissions be divvied
  up within a company later without a schema change.
- **organization_invitations** — pending invites by email (`org_id`, `email`,
  `role`), consumed automatically when the invited person signs up.

Every data row (`properties`, `leases`, `occupancy_records`,
`space_breakdowns`, `analysis_snapshots`) carries `org_id` for isolation, plus
its parent key (`portfolio_id` / `property_id`).

## Portfolio data tables

- **properties** — office building. `portfolio_id`, address fields,
  `property_type` (`owned|leased`), `total_rentable_sf`, `headcount_on_site`,
  optional `total_usable_sf`, `market_tier` (`tier1|tier2|tier3`).
- **leases** — `property_id`, term dates, `lease_type`
  (`gross|triple_net|modified_gross`), `annual_rent`, `cams_annual`,
  `other_annual_costs`, break-clause fields.
- **occupancy_records** — `property_id`, `data_source`, `measurement_date`,
  `occupied_desks`, `total_desks_available`, optional rates.
- **space_breakdowns** — `property_id`, `space_type`, `allocated_sf`,
  `allocated_headcount`, optional `utilization_rate_percent`.
- **analysis_snapshots** — immutable result of one analysis run. `portfolio_id`,
  `snapshot_date`, `data_as_of_date`, `analysis_results` (jsonb — the full engine
  output, brief §3.2), `data_completeness_percent`.

## Enums

Stored as `text` with `CHECK` constraints instead of Postgres `ENUM`, so allowed
values stay in lock-step with the engine's enum tuples in `engine/types.ts`
without enum-migration friction. The same tuples back the Zod validation in
`engine/validation.ts`, so the database, API validation, and CSV import all
enforce identical value sets.

## Constraints (brief §7)

- `total_rentable_sf > 0`, `headcount_on_site >= 0`,
  `occupancy_rate_percent between 0 and 100`.
- `lease_start_date < lease_end_date`; `break_date` within the lease term.
- `occupied_desks <= total_desks_available`; `total_desks_available > 0`.
- `measurement_date <= current_date` (no future occupancy).
- `portfolios.org_id UNIQUE` — enforces one portfolio per organization.
- `ON DELETE CASCADE` from org → portfolio → property → lease/occupancy/space.

## Indexes (brief §8)

`org_id` and the parent foreign key are indexed on every child table, plus
`organization_members(user_id)` for fast "which orgs am I in" lookups.

## Isolation & roles (brief §9)

RLS restricts every row to the caller's organization via `is_org_member()`, and
**writes** additionally require `has_org_write()` (admin/editor) — viewers are
read-only. Member/invitation management is admin-only and goes through
SECURITY DEFINER RPCs (see `0003_tenancy.sql`). A direct browser call with the
anon key therefore cannot cross an org boundary or exceed the user's role. Edge
Functions run under the caller's JWT for DB access (RLS applies); only Storage
uploads for PDF export use the service role.

See `docs/INTEGRATION.md` for the RPC/read contract and `docs/LOVABLE_BUILD.md`
for the intake workflow.
