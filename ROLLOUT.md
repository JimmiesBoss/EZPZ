# Profolio — Rollout Guide

How to stand up the backend on **Supabase** and hand the front end to **Lovable**,
in order. The rollout ships as three bundles that install in sequence:

| Bundle | Target | What it contains | How you apply it |
|---|---|---|---|
| `profolio-phase1-database.zip` | Supabase → Database | SQL migrations (0001–0006) + seed | `supabase db push` **or** paste in the SQL editor, in order |
| `profolio-phase2-edge-functions.zip` | Supabase → Edge Functions | 3 functions + shared code + the calc engine + config | `supabase functions deploy` (CLI) |
| `profolio-phase3-frontend-lovable.zip` | Lovable | Build spec + integration/data-model/calc docs + the brief + CSV templates | Connect Lovable to Supabase, then build from the spec |

**Install order is Phase 1 → 2 → 3.** Functions (Phase 2) need the tables and the
`reports` storage bucket that Phase 1 creates. The front end (Phase 3) needs both.

---

## Phase 0 — Prep (once)

1. Create a Supabase project. From **Project Settings → API**, copy:
   - Project URL (e.g. `https://abcd.supabase.co`)
   - `anon` public key (used by Lovable)
   - `service_role` secret key (used only by the `export-pdf` function)
2. Install the Supabase CLI: `npm i -g supabase` (or use `npx supabase`).
   Docker is **not** required for a hosted project.
3. `supabase login` then `supabase link --project-ref <your-ref>`.

---

## Phase 1 — Database (Supabase)

Contents of `profolio-phase1-database.zip`:

```
migrations/0001_init.sql        tables (organizations → one portfolio → data)
migrations/0002_rls.sql         row-level security + roles
migrations/0003_tenancy.sql     org provisioning + member RPCs + signup trigger
migrations/0004_storage.sql     private "reports" storage bucket
migrations/0005_grants.sql      Data API grants for the authenticated role
migrations/0006_access.sql      invite-only + approved-domain auto-join
seed.sql                        OPTIONAL demo organization + portfolio
profolio_full_schema.sql        all 6 migrations concatenated, in order (convenience)
```

**Apply — pick one:**

- **CLI (recommended):** copy the `migrations/` folder into your project's
  `supabase/migrations/`, then `supabase db push`. Run the seed if you want demo
  data: `psql "$(supabase db url)" -f seed.sql`.
- **Supabase SQL editor:** open `profolio_full_schema.sql`, paste, run. (Or paste
  `0001`→`0006` individually **in numeric order**.) Then optionally paste `seed.sql`.

**After applying — bootstrap the operator** (so you can provision orgs). Sign in
to the app once so your auth user exists, then in the SQL editor:

```sql
insert into platform_admins (user_id) values ('<your-auth-user-uuid>');
```

That's the only manual DB step. Everything else (bucket, policies, RPCs, trigger)
is created by the migrations.

---

## Phase 2 — Edge Functions (Supabase)

Contents of `profolio-phase2-edge-functions.zip` (keep this folder layout — the
functions import the calc engine by relative path):

```
engine/                         portable calculation engine (imported by the functions)
supabase/functions/analyze/     run analysis → store a snapshot
supabase/functions/import-csv/  validate + bulk-insert a CSV upload
supabase/functions/export-pdf/  render a snapshot to PDF (Storage + signed URL)
supabase/functions/_shared/     cors, supabase clients, data loader
supabase/functions/deno.json    import map (zod, supabase-js, jspdf)
supabase/config.toml            function + storage bucket config
```

**Deploy:**

```bash
# from the unzipped folder root (contains engine/ and supabase/)
supabase link --project-ref <your-ref>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
supabase functions deploy analyze
supabase functions deploy import-csv
supabase functions deploy export-pdf
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically; you only set the
service-role secret. Functions are JWT-verified, so callers pass a signed-in user's
token (Lovable's Supabase client does this for you).

**Smoke test:**

```bash
curl -X POST https://<ref>.functions.supabase.co/analyze \
  -H "Authorization: Bearer <a-signed-in-user-token>" \
  -H "Content-Type: application/json" \
  -d '{"portfolio_id":"<portfolio-id>"}'
# → 200 with portfolio_level_metrics, red_flag_checklist, financial_opportunities, …
```

---

## Phase 3 — Front end (Lovable)

Contents of `profolio-phase3-frontend-lovable.zip`:

```
LOVABLE_BUILD.md                screen-by-screen spec + exact Supabase calls
INTAKE_WIZARD.md                guided step-by-step manual-entry wizard (build this)
INTEGRATION.md                  full request/response contract (CRUD + RPCs + functions)
DATA_MODEL.md                   schema & access model reference
CALCULATIONS.md                 what the engine computes (for tooltips/《why》 text)
Portfolio_Analysis_Tool_Technical_Brief.md   the original brief (context for Lovable)
templates/                      CSV upload templates (properties/leases/occupancy)
```

**Hand-off steps:**

1. In Lovable, **connect the same Supabase project** (Project URL + `anon` key).
2. Feed Lovable the build spec. `LOVABLE_BUILD.md` is written to be pasted section
   by section as you build each screen — start with **Screen 0 (operator console)**
   and **Screen 2 (workspace resolution)**, then profile → data entry → dashboard →
   PDF → team/domains. For **manual data entry**, build the guided **Intake
   Wizard** from `INTAKE_WIZARD.md` (the full step-by-step form spec your team
   asked for). Attach `INTEGRATION.md` and the brief as context.
3. In **Supabase → Authentication → Providers**, enable Google and/or Microsoft if
   you want SSO (optional; email works out of the box). Domain auto-join is
   provider-agnostic.
4. Wire the CSV upload UI to the templates in `templates/`.

SMTP for invite emails is a Supabase Auth setting you can configure later; nothing
in these bundles depends on it.

---

## What goes where — quick reference

- **Supabase gets:** Phase 1 (SQL) + Phase 2 (functions + engine + config + the
  service-role secret).
- **Lovable gets:** Phase 3 (the docs/spec) + the Supabase URL & anon key to
  connect. Lovable never sees the service-role key.
- **You do once, by hand:** the `platform_admins` insert (Phase 1) and, later,
  SMTP for invite emails.

## First real organization (after rollout)

As the platform admin, from the app (or SQL editor):

```ts
await supabase.rpc('create_organization', {
  org_name: 'Client Co', primary_domain: 'clientco.com', admin_email: 'lead@clientco.com',
});
```

Then anyone with a `@clientco.com` email who signs in is auto-joined to that org.
