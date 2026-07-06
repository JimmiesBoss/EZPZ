-- Row-level security: organization isolation + role-based access (brief §9).
--
-- Every row is scoped to an organization. A user may only touch rows for orgs
-- they belong to, and only *write* if their role allows it. Enforced in the
-- database, so even a direct anon-key call from the browser (Lovable) cannot
-- cross an organization boundary or exceed the user's role.
--
-- Roles: admin (full control incl. members), editor (read + write portfolio
-- data), viewer (read only). The helper functions are SECURITY DEFINER so they
-- read organization_members without triggering that table's own RLS (avoids
-- policy recursion).

create or replace function is_org_member(o uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.org_id = o and m.user_id = auth.uid()
  );
$$;

create or replace function has_org_write(o uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.org_id = o and m.user_id = auth.uid() and m.role in ('admin','editor')
  );
$$;

create or replace function is_org_admin(o uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.org_id = o and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

alter table organizations           enable row level security;
alter table organization_members    enable row level security;
alter table organization_invitations enable row level security;
alter table portfolios              enable row level security;
alter table properties              enable row level security;
alter table leases                  enable row level security;
alter table occupancy_records       enable row level security;
alter table space_breakdowns        enable row level security;
alter table analysis_snapshots      enable row level security;

-- Organizations: members read; admins update/delete. Creation is via the
-- create_organization RPC (SECURITY DEFINER), so there is no direct insert policy.
create policy organizations_select on organizations
  for select using (is_org_member(id));
create policy organizations_update on organizations
  for update using (is_org_admin(id)) with check (is_org_admin(id));
create policy organizations_delete on organizations
  for delete using (is_org_admin(id));

-- Members: any member can see who's in the org. All writes go through the
-- admin-only RPCs in 0003_tenancy.sql, so no direct write policies here.
create policy members_select on organization_members
  for select using (is_org_member(org_id));

-- Invitations: only admins can see their org's pending invites. Writes via RPC.
create policy invitations_select on organization_invitations
  for select using (is_org_admin(org_id));

-- Portfolio: members read; editors/admins write.
create policy portfolios_select on portfolios
  for select using (is_org_member(org_id));
create policy portfolios_write on portfolios
  for all using (has_org_write(org_id)) with check (has_org_write(org_id));

-- Portfolio data tables: members read; editors/admins write.
create policy properties_select on properties
  for select using (is_org_member(org_id));
create policy properties_write on properties
  for all using (has_org_write(org_id)) with check (has_org_write(org_id));

create policy leases_select on leases
  for select using (is_org_member(org_id));
create policy leases_write on leases
  for all using (has_org_write(org_id)) with check (has_org_write(org_id));

create policy occupancy_select on occupancy_records
  for select using (is_org_member(org_id));
create policy occupancy_write on occupancy_records
  for all using (has_org_write(org_id)) with check (has_org_write(org_id));

create policy space_select on space_breakdowns
  for select using (is_org_member(org_id));
create policy space_write on space_breakdowns
  for all using (has_org_write(org_id)) with check (has_org_write(org_id));

-- Snapshots: members read; editors/admins insert. Immutable (no update policy).
create policy snapshots_select on analysis_snapshots
  for select using (is_org_member(org_id));
create policy snapshots_insert on analysis_snapshots
  for insert with check (has_org_write(org_id));
