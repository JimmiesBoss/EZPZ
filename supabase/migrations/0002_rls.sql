-- Row-level security for multi-tenant isolation (brief §9).
-- Every row is scoped to a client; a user may only touch rows for clients they
-- belong to (client_members). This is enforced in the database, so even a direct
-- anon-key call from the browser (Lovable) cannot cross client boundaries.
--
-- Edge Functions that must operate across the isolation boundary use the service
-- role key, which bypasses RLS by design; those functions filter by client_id
-- explicitly (see supabase/functions/*).

-- Helper: is the current user a member of the given client?
create or replace function is_client_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from client_members m
    where m.client_id = cid and m.user_id = auth.uid()
  );
$$;

alter table clients             enable row level security;
alter table client_members      enable row level security;
alter table portfolios          enable row level security;
alter table properties          enable row level security;
alter table leases              enable row level security;
alter table occupancy_records   enable row level security;
alter table space_breakdowns    enable row level security;
alter table analysis_snapshots  enable row level security;

-- A user can see the clients they belong to, and their own membership rows.
create policy clients_select on clients
  for select using (is_client_member(id));

create policy members_select on client_members
  for select using (user_id = auth.uid());

-- Generic client-scoped policy applied to every data table.
-- (Postgres has no "apply to many tables" syntax, so each is spelled out.)
create policy portfolios_rw on portfolios
  for all using (is_client_member(client_id)) with check (is_client_member(client_id));

create policy properties_rw on properties
  for all using (is_client_member(client_id)) with check (is_client_member(client_id));

create policy leases_rw on leases
  for all using (is_client_member(client_id)) with check (is_client_member(client_id));

create policy occupancy_rw on occupancy_records
  for all using (is_client_member(client_id)) with check (is_client_member(client_id));

create policy space_rw on space_breakdowns
  for all using (is_client_member(client_id)) with check (is_client_member(client_id));

-- Snapshots are read/insert for members; updates are disallowed (immutable).
create policy snapshots_select on analysis_snapshots
  for select using (is_client_member(client_id));

create policy snapshots_insert on analysis_snapshots
  for insert with check (is_client_member(client_id));
