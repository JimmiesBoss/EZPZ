# Deployment Runbook

Stand up Profolio on a real Supabase project and point Lovable at it. ~15 minutes.

## Prerequisites

- A Supabase project (note its **project ref**, e.g. `abcdxyz`).
- The Supabase CLI (`npm i -g supabase` or `npx supabase`).
- Docker only if you want to run the stack locally (`supabase start`); not needed
  to deploy to the hosted project.

## 1. Link the project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

## 2. Apply the database (schema, RLS, tenancy RPCs, storage bucket)

```bash
supabase db push          # runs supabase/migrations/*.sql in order
```

This creates the tables (organizations, members, invitations, one-portfolio-per-org,
and the portfolio data tables), the row-level-security policies, the tenancy /
user-admin RPCs (`create_organization`, `invite_member`, `set_member_role`,
`remove_member`), the signup trigger that auto-joins invited users, and the
private `reports` storage bucket.

Optional demo data (safe to skip in production):

```bash
psql "$(supabase db url)" -f supabase/seed.sql
```

## 3. Set function secrets

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically. You only need
the service-role key (used by `export-pdf` for the Storage upload) and optional
report settings:

```bash
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  REPORT_BUCKET=reports \
  REPORT_LINK_TTL_SECONDS=3600
```

## 4. Deploy the Edge Functions

```bash
supabase functions deploy analyze
supabase functions deploy import-csv
supabase functions deploy export-pdf
```

They are JWT-verified by default (`config.toml` → `[functions.*] verify_jwt = true`),
so callers must pass a signed-in user's access token.

## 5. First-run bootstrap (create an organization)

RLS shows a user only the org they belong to. A new user creates their
organization (and its single portfolio, becoming admin) via the RPC — normally
from the onboarding screen:

```ts
const { data } = await supabase.rpc('create_organization', {
  org_name: 'Acme Corp', portfolio_name: 'Acme US Portfolio',
  industry: 'Technology', primary_region: 'US West',
});   // -> [{ org_id, portfolio_id }]
```

Admins add teammates (existing users are added immediately; new emails get a
pending invite auto-consumed at signup):

```ts
await supabase.rpc('invite_member', { target_org: orgId, member_email: 'teammate@acme.com', member_role: 'editor' });
```

If you loaded the seed data, grant yourself access to the demo organization:

```sql
insert into organization_members (org_id, user_id, role)
values ('00000000-0000-0000-0000-0000000000e1', '<your-auth-user-uuid>', 'admin');
```

## 6. Point Lovable at the project

In Lovable, connect the same Supabase project (URL + anon key). Lovable does all
CRUD directly against the tables under RLS, and calls the three Edge Functions
for analysis, CSV import, and PDF export. See `docs/LOVABLE_BUILD.md` for the
screen-by-screen build spec and `docs/INTEGRATION.md` for the exact call
signatures.

## Local development (optional)

```bash
supabase start                                  # full local stack (needs Docker)
supabase functions serve --env-file supabase/.env
npm test                                        # engine unit tests (no Docker)
```

## Smoke test after deploy

```bash
# 1. Create a client, note the id
# 2. Insert a portfolio + a property + a lease + an occupancy row (Studio or app)
# 3. Run analysis:
curl -X POST https://<ref>.functions.supabase.co/analyze \
  -H "Authorization: Bearer <user-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"portfolio_id":"<portfolio-id>"}'
# Expect 200 with portfolio_level_metrics, red_flag_checklist, financial_opportunities...
```
