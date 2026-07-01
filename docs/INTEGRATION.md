# Lovable + Supabase Integration

How the Lovable front end talks to this backend. Two channels:

1. **Direct data API (Supabase)** for CRUD.
2. **Edge Functions** for the three heavy operations.

## 1. CRUD via Supabase (no custom code)

The brief's portfolio/property/lease/occupancy/space CRUD endpoints (§6) are
served by Supabase's auto-generated PostgREST API. In Lovable, use the Supabase
JS client with the **anon key** and the signed-in user's session — RLS enforces
client isolation automatically.

```ts
// Create a portfolio
await supabase.from('portfolios').insert({ client_id, name: 'HQ Portfolio' });

// List properties for a portfolio (RLS-scoped to the user's client)
const { data } = await supabase
  .from('properties')
  .select('*, leases(*), occupancy_records(*), space_breakdowns(*)')
  .eq('portfolio_id', portfolioId);
```

Brief endpoint → Supabase equivalent:

| Brief (§6) | Supabase |
|---|---|
| `POST /api/portfolios` | `supabase.from('portfolios').insert(...)` |
| `GET /api/portfolios/{id}` | `.from('portfolios').select().eq('id', id)` |
| `POST /api/portfolios/{id}/properties` | `.from('properties').insert(...)` |
| `PUT/DELETE .../properties/{id}` | `.update(...)` / `.delete()` |
| lease / occupancy / space CRUD | same pattern on the matching table |
| `GET .../snapshots` / `snapshots/{id}` | `.from('analysis_snapshots').select(...)` |

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
- A user only sees a client's data if they have a `client_members` row for it.
