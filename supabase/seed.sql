-- Demo seed data for Profolio (brief §12 acceptance: end-to-end sample portfolio).
-- Run after migrations with the Supabase CLI (`supabase db reset` applies this),
-- or `psql "$DATABASE_URL" -f supabase/seed.sql`.
--
-- Tenancy model: one organization -> one portfolio. To see this data through RLS,
-- add yourself as a member of the demo org:
--   insert into organization_members (org_id, user_id, role)
--   values ('00000000-0000-0000-0000-0000000000e1', '<your-auth-user-uuid>', 'admin');

insert into organizations (id, name, industry, primary_region) values
  ('00000000-0000-0000-0000-0000000000e1', 'Acme Corp', 'Technology', 'US West')
on conflict (id) do nothing;

insert into portfolios (id, org_id, name, notes) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1',
   'Acme US Office Portfolio', 'Demo snapshot dataset')
on conflict (id) do nothing;

-- Properties ------------------------------------------------------------------
insert into properties
  (id, org_id, portfolio_id, name, address, city, state, zip, property_type,
   total_rentable_sf, headcount_on_site, market_tier)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000f1', 'HQ Tower', '1 Market St', 'San Francisco', 'CA', '94105',
   'leased', 50000, 200, 'tier1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000f1', 'SF Annex 1', '400 Howard St', 'San Francisco', 'CA', '94105',
   'leased', 12000, 25, 'tier1'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000f1', 'SF Annex 2', '55 2nd St', 'San Francisco', 'CA', '94105',
   'leased', 10000, 20, 'tier1'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000f1', 'Austin Hub', '600 Congress Ave', 'Austin', 'TX', '78701',
   'owned', 18000, 90, 'tier2')
on conflict (id) do nothing;

-- Leases ---------------------------------------------------------------------
insert into leases
  (org_id, property_id, lease_start_date, lease_end_date, lease_type, annual_rent, cams_annual)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', '2022-01-01', '2031-01-01', 'gross', 2000000, 400000),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2', '2022-01-01', '2031-01-01', 'gross', 700000, 0),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a3', '2022-01-01', '2031-01-01', 'gross', 600000, 0),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a4', '2020-06-01', '2028-06-01', 'triple_net', 360000, 90000);

-- Occupancy ------------------------------------------------------------------
insert into occupancy_records
  (org_id, property_id, data_source, measurement_date, occupied_desks, total_desks_available)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'badge_access', '2025-12-01', 190, 220),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2', 'badge_access', '2025-12-01', 25, 120),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a3', 'badge_access', '2025-12-01', 20, 100),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a4', 'occupancy_sensor', '2025-12-01', 70, 95);

-- Space breakdown (HQ only, for space-mix checks) ----------------------------
insert into space_breakdowns
  (org_id, property_id, space_type, allocated_sf, allocated_headcount, utilization_rate_percent)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'private_office', 20000, 60, null),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'open_collaborative', 22000, 130, null),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'conference_rooms', 5000, 0, 45),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'amenity_support', 3000, 0, null);
