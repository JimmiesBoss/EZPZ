# Lovable Build Spec

A screen-by-screen guide for building the Profolio front end in Lovable against
this Supabase backend. Lovable does all CRUD directly against Supabase tables
(under RLS) and calls three Edge Functions for the heavy lifting. Paste the
relevant sections into Lovable as you build each screen.

**Setup in Lovable:** connect this Supabase project (project URL + anon key).
Use Supabase Auth for sign-in. All data calls use the signed-in user's session —
row-level security scopes everything to the user's client automatically.

Enum values (for dropdowns) live in `engine/types.ts` and are enforced by the DB.

---

## Screen 1 — Auth

Standard Supabase email/password (or magic link) auth. Nothing custom.

## Screen 2 — Client picker / onboarding

A user only sees clients they belong to. On first login they'll have none and
must create one.

```ts
// List my clients (RLS returns only mine)
const { data: clients } = await supabase.from('clients').select('*').order('name');

// Create a client (I become its owner)
const { data: client } = await supabase.rpc('create_client', { client_name: name });

// Invite a teammate (owner only)
await supabase.rpc('add_client_member', { target_client: clientId, target_user: userId, member_role: 'member' });
```

Store the chosen `client_id` in app state — every insert below sets it.

## Screen 3 — Portfolios

```ts
const { data } = await supabase.from('portfolios').select('*').eq('client_id', clientId);
await supabase.from('portfolios').insert({ client_id: clientId, name, notes });
await supabase.from('portfolios').update({ name }).eq('id', portfolioId);
await supabase.from('portfolios').delete().eq('id', portfolioId);
```

## Screen 4 — Portfolio data entry

Tabs for **Properties**, **Leases**, **Occupancy**, **Space mix**. Each is a
table with an add/edit form. Validation mirrors `engine/validation.ts` (the DB
also enforces it, so show the returned error messages).

```ts
// Properties
await supabase.from('properties').insert({
  client_id: clientId, portfolio_id: portfolioId,
  name, address, city, state, zip,
  property_type,            // 'owned' | 'leased'
  total_rentable_sf, headcount_on_site,
  market_tier,              // 'tier1' | 'tier2' | 'tier3' (optional)
});

// Leases (per property)
await supabase.from('leases').insert({
  client_id: clientId, property_id: propertyId,
  lease_start_date, lease_end_date,
  lease_type,               // 'gross' | 'triple_net' | 'modified_gross'
  annual_rent, cams_annual,
  has_break_clause, break_date, break_penalty_type, break_penalty_amount,
});

// Occupancy (per property)
await supabase.from('occupancy_records').insert({
  client_id: clientId, property_id: propertyId,
  data_source,              // 'badge_access' | 'occupancy_sensor' | ...
  measurement_date, occupied_desks, total_desks_available,
});

// Space breakdown (per property)
await supabase.from('space_breakdowns').insert({
  client_id: clientId, property_id: propertyId,
  space_type,               // 'private_office' | 'open_collaborative' | ...
  allocated_sf, allocated_headcount, utilization_rate_percent,
});
```

### CSV bulk upload (per tab)

Offer template download (`supabase/templates/*.csv`) and an upload box that posts
the raw CSV text to the `import-csv` function:

```ts
const { data } = await supabase.functions.invoke('import-csv', {
  body: { portfolio_id: portfolioId, template_type: 'properties', csv: rawCsvText },
});
// 200 → { imported_count, warnings }
// 422 → { errors: [{ row, column, message }] }  ← render inline, let user fix & re-upload
```

## Screen 5 — Analysis dashboard (brief §5.3)

Run analysis, then render the returned object. Analysis also persists a snapshot.

```ts
const { data: analysis } = await supabase.functions.invoke('analyze', {
  body: { portfolio_id: portfolioId },   // optional: snapshot_date, data_as_of_date, notes
});
```

Render from `analysis`:

- **KPI cards** ← `portfolio_level_metrics`: `total_portfolio_sf`,
  `total_portfolio_annual_cost`, `cost_per_sf_total`, `cost_per_sf_per_employee`,
  `portfolio_average_utilization_rate`, `benchmark_variance_percent`,
  and `data_completeness_percent` (top-level).
- **Property table** ← `property_level_metrics[]`: columns `property_name`, `sf`,
  `annual_cost`, `cost_per_sf`, `cost_per_sf_per_employee`, `utilization_rate`,
  `variance_from_benchmark`, `red_flag_status` (color-code:
  underutilized/overutilized/acceptable/insufficient_data). Sortable/filterable.
- **Map** ← plot properties by city/state, color by `red_flag_status`.
- **10-point checklist** ← `red_flag_checklist[]`: each item has `category`,
  `status` (pass/warning/fail), `description`, and expandable `sub_items[]`.
- **Opportunities table** ← `financial_opportunities[]` (already ranked):
  `description`, `estimated_annual_savings`, `implementation_cost`,
  `payback_months`, `confidence_level`, `lease_implications`.
- **Issues panel** ← `utilization_issues[]`: `issue_type`, `severity`,
  `description`, `evidence`.

Past snapshots (no re-run needed):

```ts
const { data: snapshots } = await supabase
  .from('analysis_snapshots')
  .select('id, snapshot_date, data_completeness_percent, created_at')
  .eq('portfolio_id', portfolioId)
  .order('created_at', { ascending: false });

// Load a stored snapshot's full results
const { data: snap } = await supabase
  .from('analysis_snapshots').select('analysis_results').eq('id', snapshotId).single();
```

## Screen 6 — PDF export

```ts
const { data } = await supabase.functions.invoke('export-pdf', {
  body: { snapshot_id: snapshotId, report_type: 'executive_summary' },
  // report_type: 'executive_summary' | 'detailed' | 'opportunities_only'
});
window.open(data.pdf_url);   // signed URL, valid for REPORT_LINK_TTL_SECONDS
```

---

## Suggested build order

1. Auth + client picker (Screens 1–2) — nothing works without a `client_id`.
2. Portfolios + property data entry (Screens 3–4) so there's data to analyze.
3. CSV import (faster than manual entry for testing).
4. Analysis dashboard (Screen 5) — the core value.
5. PDF export (Screen 6).

Everything the dashboard and reports need is returned by `analyze` or readable
from `analysis_snapshots`; the front end never has to reimplement any of the
brief's calculations.
