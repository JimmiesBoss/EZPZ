-- Data API grants for the Supabase roles.
--
-- Newer Supabase projects do NOT auto-expose new tables to the Data API roles
-- (see the auto_expose_new_tables note in config.toml), so PostgREST calls from
-- the browser would fail with "permission denied" without these table-level
-- grants. Row-level security (0002_rls.sql) still governs which ROWS each user
-- can see or change; these grants only make the tables reachable.

grant usage on schema public to anon, authenticated;

-- Authenticated users act on their org's data (RLS narrows this per role).
grant select, insert, update, delete on
  organizations,
  organization_members,
  organization_invitations,
  portfolios,
  properties,
  leases,
  occupancy_records,
  space_breakdowns,
  analysis_snapshots
to authenticated;
