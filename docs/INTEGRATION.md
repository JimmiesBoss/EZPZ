# Lovable + Supabase Integration

How the Lovable front end talks to this backend. Two channels:

1. **Direct data API (Supabase)** for CRUD.
2. **Edge Functions** for the three heavy operations.

## 0. Tenancy in one paragraph

An **organization** is the tenant and owns exactly **one portfolio**. A user
belongs to an organization with a **role** (`admin`/`editor`/`viewer`) and only
ever sees their own org's data. On first login a user either creates an org
(becoming its admin) or is auto-joined to one they were invited to. Resolve the
current workspace (org + portfolio + role) with:

```ts
const { data: workspaces } = await supabase.from('my_workspaces').select('*');
const ws = workspaces[0];   // { org_id, org_name, portfolio_id, portfolio_name, my_role, ... }
```

## 1. CRUD via Supabase (no custom code)

The brief's portfolio/property/lease/occupancy/space CRUD endpoints (§6) are
served by Supabase's auto-generated PostgREST API. In Lovable, use the Supabase
JS client with the **anon key** and the signed-in user's session — RLS enforces
org isolation and role permissions automatically. Every insert sets `org_id`
(from `ws.org_id`).

```ts
// List properties for the portfolio (RLS-scoped to the user's org)
const { data } = await supabase
  .from('properties')
  .select('*, leases(*), occupancy_records(*), space_breakdowns(*)')
  .eq('portfolio_id', ws.portfolio_id);

// Add a property
await supabase.from('properties').insert({
  org_id: ws.org_id, portfolio_id: ws.portfolio_id,
  name, address, city, state, zip, property_type, total_rentable_sf, headcount_on_site,
});
```

Brief endpoint → Supabase equivalent:

| Brief (§6) | Supabase |
|---|---|
| `POST /api/portfolios/{id}/properties` | `.from('properties').insert({ org_id, portfolio_id, ... })` |
| `PUT/DELETE .../properties/{id}` | `.update(...)` / `.delete()` (RLS blocks viewers) |
| lease / occupancy / space CRUD | same pattern on the matching table (set `org_id`) |
| `GET .../snapshots` / `snapshots/{id}` | `.from('analysis_snapshots').select(...)` |

## 1b. Onboarding & user administration (RPCs)

```ts
// First-run: create my org + its portfolio (I become admin)
const { data } = await supabase.rpc('create_organization', {
  org_name: 'Acme Corp', portfolio_name: 'Acme US Portfolio',
  industry: 'Technology', primary_region: 'US West',
});           // -> [{ org_id, portfolio_id }]

// Invite / add a teammate with a role (admin only) -> 'added' | 'invited'
await supabase.rpc('invite_member', { target_org: ws.org_id, member_email: 'x@acme.com', member_role: 'editor' });

// Change or remove a member (admin only)
await supabase.rpc('set_member_role', { target_org: ws.org_id, target_user: userId, new_role: 'viewer' });
await supabase.rpc('remove_member',  { target_org: ws.org_id, target_user: userId });

// Roster + pending invites (admins see invites)
const { data: members } = await supabase.from('organization_members').select('*').eq('org_id', ws.org_id);
const { data: invites } = await supabase.from('organization_invitations').select('*').eq('org_id', ws.org_id);
```

## 2. Edge Functions

Call with the user's access token so RLS applies. Base URL:
`https://<project-ref>.functions.supabase.co`.

```ts
const { data } = await supabase.functions.invoke('analyze', {
  body: { portfolio_id: portfolioId },
});
```

### `analyze` — run analysis, store a snapshot

Request:
```json
{ "portfolio_id": "uuid", "snapshot_date": "2026-01-01", "data_as_of_date": "2025-12-01", "notes": "Q4 review" }
```
Response `200`: the snapshot id plus the full analysis result object
(`portfolio_level_metrics`, `property_level_metrics`, `utilization_issues`,
`financial_opportunities`, `red_flag_checklist`, `data_completeness_percent`).
Errors: `400` validation, `404` portfolio not found. This is the payload the
dashboard renders (brief §5.3).

### `import-csv` — validate + bulk insert

Request:
```json
{ "portfolio_id": "uuid", "template_type": "properties", "csv": "<raw csv text>" }
```
`template_type` ∈ `properties | leases | occupancy`. Download the header
templates from `supabase/templates/`. For `leases`/`occupancy`, each row links to
a property by `property_name`.

Response `200`:
```json
{ "imported_count": 12, "error_count": 0, "errors": [], "warnings": [] }
```
Response `422` (nothing inserted — fix and re-upload), errors by row/column:
```json
{ "imported_count": 0, "error_count": 2,
  "errors": [{ "row": 3, "column": "property_type", "message": "Invalid enum value" }],
  "warnings": [] }
```

### `export-pdf` — render a snapshot to PDF

Request:
```json
{ "snapshot_id": "uuid", "report_type": "executive_summary" }
```
`report_type` ∈ `executive_summary | detailed | opportunities_only`.
Response `200`: `{ "pdf_url": "https://.../signed", "expires_in": 3600 }`.
Requires a private Storage bucket named `reports` (configurable via
`REPORT_BUCKET`).

## Auth & secrets

- Lovable uses the **anon key** + user session (never the service role).
- Edge Functions read `SUPABASE_URL`, `SUPABASE_ANON_KEY` (provided by the
  platform) and `SUPABASE_SERVICE_ROLE_KEY` (used only for the PDF Storage
  upload). Set them as function secrets; see `.env.example`.
- A user only sees an org's data if they have an `organization_members` row for
  it. New users bootstrap with `supabase.rpc('create_organization', ...)` (they
  become admin); admins add teammates with `invite_member`. See `DEPLOYMENT.md` §5.
