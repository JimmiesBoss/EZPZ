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

This creates the tables, row-level-security policies, the `create_client` /
`add_client_member` RPCs, and the private `reports` storage bucket.

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

## 5. First-run bootstrap (create a client)

RLS shows a user only the clients they belong to. A new user creates their first
client (and becomes its owner) via the RPC:

```sql
select create_client('Acme Corp');
```

or from the frontend:

```ts
const { data: client } = await supabase.rpc('create_client', { client_name: 'Acme Corp' });
```

To let a teammate in, an owner calls:

```ts
await supabase.rpc('add_client_member', { target_client: clientId, target_user: userId, member_role: 'member' });
```

If you loaded the seed data, grant yourself access to the demo client:

```sql
insert into client_members (client_id, user_id)
values ('00000000-0000-0000-0000-0000000000c1', '<your-auth-user-uuid>');
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
