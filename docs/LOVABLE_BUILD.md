# Lovable Build Spec

A screen-by-screen guide for building the Profolio front end in Lovable against
this Supabase backend. Lovable does all CRUD directly against Supabase tables
(under RLS) and calls three Edge Functions for the heavy lifting. Paste the
relevant sections into Lovable as you build each screen.

**Setup in Lovable:** connect this Supabase project (project URL + anon key).
Use Supabase Auth for sign-in. All data calls use the signed-in user's session —
row-level security scopes everything to the user's organization and enforces
their role automatically.

**Tenancy recap:** an **organization** is the tenant and owns exactly **one
portfolio**. A user belongs to an org with a role (`admin`/`editor`/`viewer`);
everyone defaults to admin today. Users only ever see their own org's data.

Enum values (for dropdowns) live in `engine/types.ts` and are enforced by the DB.

---

## The intake workflow (manual entry)

The happy path a new customer walks through:

1. **Sign up / sign in** (Supabase Auth).
2. **Resolve workspace.** Query `my_workspaces`. If empty → **onboarding**
   (create organization). If present → straight to the dashboard.
3. **Company profile** — name, industry, region (captured at org creation, editable later).
4. **Portfolio data** — add properties → leases → occupancy → space mix, by
   manual form or CSV upload.
5. **Run analysis** and view the dashboard.
6. **Invite teammates** and assign roles (admin only).

Screens below follow this order.

## Screen 1 — Auth

Standard Supabase email/password (or magic link). Nothing custom. Invited users
are auto-joined to their org on first sign-in (a DB trigger consumes the invite).

## Screen 2 — Onboarding / workspace

```ts
// Does this user already have a workspace?
const { data: workspaces } = await supabase.from('my_workspaces').select('*');

if (workspaces.length === 0) {
  // First run: create the organization + its single portfolio (I become admin)
  const { data } = await supabase.rpc('create_organization', {
    org_name: name, portfolio_name: `${name} Portfolio`,
    industry, primary_region,
  });                                   // -> [{ org_id, portfolio_id }]
}
// Re-query my_workspaces and store the single workspace in app state:
//   ws = { org_id, org_name, portfolio_id, portfolio_name, my_role, industry, primary_region }
```

`ws.org_id` and `ws.portfolio_id` are used by every screen below. Gate write
actions on `ws.my_role !== 'viewer'`.

## Screen 3 — Company profile

Edit the org profile (admin/editor). RLS blocks viewers.

```ts
await supabase.from('organizations')
  .update({ name, industry, size_category, primary_region, notes })
  .eq('id', ws.org_id);
```

## Screen 4 — Portfolio data entry

Tabs for **Properties**, **Leases**, **Occupancy**, **Space mix**. Each is a
table with an add/edit form; every insert sets `org_id: ws.org_id`. Validation
mirrors `engine/validation.ts` (the DB enforces it too — surface returned errors).

```ts
// Properties
await supabase.from('properties').insert({
  org_id: ws.org_id, portfolio_id: ws.portfolio_id,
  name, address, city, state, zip,
  property_type,            // 'owned' | 'leased'
  total_rentable_sf, headcount_on_site,
  market_tier,              // 'tier1' | 'tier2' | 'tier3' (optional)
});

// Leases (per property)
await supabase.from('leases').insert({
  org_id: ws.org_id, property_id: propertyId,
  lease_start_date, lease_end_date,
  lease_type,               // 'gross' | 'triple_net' | 'modified_gross'
  annual_rent, cams_annual,
  has_break_clause, break_date, break_penalty_type, break_penalty_amount,
});

// Occupancy (per property)
await supabase.from('occupancy_records').insert({
  org_id: ws.org_id, property_id: propertyId,
  data_source,              // 'badge_access' | 'occupancy_sensor' | ...
  measurement_date, occupied_desks, total_desks_available,
});

// Space breakdown (per property)
await supabase.from('space_breakdowns').insert({
  org_id: ws.org_id, property_id: propertyId,
  space_type,               // 'private_office' | 'open_collaborative' | ...
  allocated_sf, allocated_headcount, utilization_rate_percent,
});
```

### CSV bulk upload (per tab)

Offer template download (`supabase/templates/*.csv`) and an upload box that posts
the raw CSV text to the `import-csv` function:

```ts
const { data } = await supabase.functions.invoke('import-csv', {
  body: { portfolio_id: ws.portfolio_id, template_type: 'properties', csv: rawCsvText },
});
// 200 → { imported_count, warnings }
// 422 → { errors: [{ row, column, message }] }  ← render inline, let user fix & re-upload
```

## Screen 5 — Analysis dashboard (brief §5.3)

Run analysis, then render the returned object. Analysis also persists a snapshot.

```ts
const { data: analysis } = await supabase.functions.invoke('analyze', {
  body: { portfolio_id: ws.portfolio_id },   // optional: snapshot_date, data_as_of_date, notes
});
```

Render from `analysis`:

- **KPI cards** ← `portfolio_level_metrics`: `total_portfolio_sf`,
  `total_portfolio_annual_cost`, `cost_per_sf_total`, `cost_per_sf_per_employee`,
  `portfolio_average_utilization_rate`, `benchmark_variance_percent`, and
  `data_completeness_percent` (top-level).
- **Property table** ← `property_level_metrics[]`: `property_name`, `sf`,
  `annual_cost`, `cost_per_sf`, `cost_per_sf_per_employee`, `utilization_rate`,
  `variance_from_benchmark`, `red_flag_status` (color-code the four states).
- **Map** ← plot properties by city/state, color by `red_flag_status`.
- **10-point checklist** ← `red_flag_checklist[]`: `category`, `status`
  (pass/warning/fail), `description`, expandable `sub_items[]`.
- **Opportunities table** ← `financial_opportunities[]` (already ranked):
  `description`, `estimated_annual_savings`, `implementation_cost`,
  `payback_months`, `confidence_level`, `lease_implications`.
- **Issues panel** ← `utilization_issues[]`.

Past snapshots (no re-run):

```ts
const { data: snapshots } = await supabase
  .from('analysis_snapshots')
  .select('id, snapshot_date, data_completeness_percent, created_at')
  .eq('portfolio_id', ws.portfolio_id)
  .order('created_at', { ascending: false });
```

## Screen 6 — PDF export

```ts
const { data } = await supabase.functions.invoke('export-pdf', {
  body: { snapshot_id: snapshotId, report_type: 'executive_summary' },
  // report_type: 'executive_summary' | 'detailed' | 'opportunities_only'
});
window.open(data.pdf_url);   // signed URL, valid for REPORT_LINK_TTL_SECONDS
```

## Screen 7 — Team management (admin only)

Show only when `ws.my_role === 'admin'`.

```ts
// Roster + pending invites
const { data: members } = await supabase.from('organization_members').select('*').eq('org_id', ws.org_id);
const { data: invites } = await supabase.from('organization_invitations').select('*').eq('org_id', ws.org_id);

// Invite a teammate (creates the user's access now if they exist, else a pending invite)
await supabase.rpc('invite_member', { target_org: ws.org_id, member_email, member_role });

// Change / remove
await supabase.rpc('set_member_role', { target_org: ws.org_id, target_user, new_role });
await supabase.rpc('remove_member',  { target_org: ws.org_id, target_user });
```

Roles: **admin** (everything incl. team management), **editor** (read + edit
portfolio data), **viewer** (read only). New members default to admin; the RPCs
refuse to demote/remove the last admin.

> To actually email invitations, use Supabase Auth's
> `auth.admin.inviteUserByEmail()` (server-side) to send the signup email — the
> DB trigger then auto-links them to the org when they accept. `invite_member`
> handles the membership/pending-invite record either way.

---

## Suggested build order

1. Auth + onboarding/workspace (Screens 1–2) — nothing works without a workspace.
2. Company profile + portfolio data entry (Screens 3–4).
3. CSV import (faster than manual entry for testing).
4. Analysis dashboard (Screen 5) — the core value.
5. PDF export (Screen 6), then team management (Screen 7).

Everything the dashboard and reports need is returned by `analyze` or readable
from `analysis_snapshots`; the front end never reimplements any of the brief's
calculations.
