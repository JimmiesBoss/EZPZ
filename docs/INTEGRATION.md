# Lovable + Supabase Integration

How the Lovable front end talks to this backend. Two channels:

1. **Direct data API (Supabase)** for CRUD.
2. **Edge Functions** for the three heavy operations.

## 0. Tenancy & access in one paragraph

An **organization** is the tenant and owns exactly **one portfolio**. A user
belongs to an org with a **role** (`admin`/`editor`/`viewer`) and only ever sees
their own org's data. Access is **invite-only**: a **platform admin** (the
operator) provisions each org and its first admin; after that, org admins approve
**corporate email domains**, and anyone who signs in (Google, Microsoft, or
manual) with an approved-domain email is **auto-joined** on first login.
Explicit email invites cover users outside an approved domain. A user with
neither lands in no org. Resolve the current workspace with:

```ts
const { data: workspaces } = await supabase.from('my_workspaces').select('*');
if (workspaces.length === 0) {
  // No access yet — show "ask your admin for an invite" (do NOT offer org creation).
} else {
  const ws = workspaces[0];  // { org_id, org_name, portfolio_id, portfolio_name, my_role, ... }
}
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

## 1b. Provisioning, domains & user administration (RPCs)

```ts
// PLATFORM ADMIN only — provision an org, its portfolio, an approved domain, and
// its first admin (by email). Fails for non-platform-admins.
const { data } = await supabase.rpc('create_organization', {
  org_name: 'Acme Corp',
  primary_domain: 'acme.com',          // corporate domain (public providers rejected)
  admin_email: 'owner@acme.com',       // designated first admin (added or invited)
  portfolio_name: 'Acme US Portfolio',
  industry: 'Technology', primary_region: 'US West',
});                                     // -> { org_id, portfolio_id }

// Check whether the current user is a platform admin (to show the operator UI)
const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');

// ORG ADMIN — manage approved domains (drives auto-join)
await supabase.rpc('add_org_domain',    { target_org: ws.org_id, d: 'acme.com' });
await supabase.rpc('remove_org_domain', { target_org: ws.org_id, d: 'acme.com' });
const { data: domains } = await supabase.from('organization_domains').select('*').eq('org_id', ws.org_id);

// ORG ADMIN — invite / manage members
await supabase.rpc('invite_member',   { target_org: ws.org_id, member_email: 'x@acme.com', member_role: 'editor' }); // 'added' | 'invited'
await supabase.rpc('set_member_role', { target_org: ws.org_id, target_user: userId, new_role: 'viewer' });
await supabase.rpc('remove_member',   { target_org: ws.org_id, target_user: userId });

const { data: members } = await supabase.from('organization_members').select('*').eq('org_id', ws.org_id);
const { data: invites } = await supabase.from('organization_invitations').select('*').eq('org_id', ws.org_id);
```

> Provider note: Google / Microsoft OAuth and manual email signup all produce a
> Supabase auth user with an email, so domain auto-join works identically across
> them. Enabling the OAuth providers is a Supabase Auth project setting — no code
> change here.

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
  it. Orgs are provisioned by a platform admin (`create_organization`); users
  then join via an approved email domain or an `invite_member` invitation. See
  `DEPLOYMENT.md` §5.
