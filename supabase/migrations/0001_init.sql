-- Profolio schema (brief §3), Postgres / Supabase.
--
-- Tenancy model: an ORGANIZATION is the tenant — one company's private
-- environment. Each organization owns exactly ONE portfolio (enforced by a
-- unique constraint). Users belong to an organization with a role, and only ever
-- see their own organization's data (row-level security, see 0002_rls.sql).
--
-- Enum-typed columns use CHECK constraints so values stay in sync with the
-- engine's enum tuples (engine/types.ts) without Postgres ENUM migrations.

create extension if not exists "pgcrypto";

-- updated_at maintenance ------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Organizations (tenant) ------------------------------------------------------
create table organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) <= 255),
  -- Lightweight company profile captured during intake (all optional).
  industry        text,
  size_category   text,            -- free-form for MVP, e.g. 'smb' | 'mid' | 'enterprise'
  primary_region  text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger organizations_set_updated_at before update on organizations
  for each row execute function set_updated_at();

-- Membership: a user's role within an organization ----------------------------
-- Roles: admin (full control incl. member management), editor (read + write
-- portfolio data), viewer (read only). Everyone defaults to admin per current
-- requirements; RLS already differentiates roles for future permission splits.
create table organization_members (
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null,       -- auth.users.id
  role       text not null default 'admin' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index organization_members_user_idx on organization_members(user_id);

-- Pending invitations by email (consumed on signup, see 0003_tenancy.sql) ------
create table organization_invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        text not null default 'admin' check (role in ('admin','editor','viewer')),
  invited_by  uuid,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create unique index organization_invitations_email_uniq
  on organization_invitations (org_id, lower(email));

-- Portfolio: exactly one per organization -------------------------------------
create table portfolios (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null unique references organizations(id) on delete cascade,
  name       text not null check (char_length(name) <= 255),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger portfolios_set_updated_at before update on portfolios
  for each row execute function set_updated_at();

-- Properties ------------------------------------------------------------------
create table properties (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references organizations(id) on delete cascade,
  portfolio_id           uuid not null references portfolios(id) on delete cascade,
  name                   text not null check (char_length(name) <= 255),
  address                text not null,
  city                   text not null,
  state                  text not null,
  zip                    text not null,
  property_type          text not null check (property_type in ('owned','leased')),
  total_rentable_sf      integer not null check (total_rentable_sf > 0),
  total_usable_sf        integer check (total_usable_sf is null or total_usable_sf > 0),
  number_of_floors       integer,
  year_built             integer,
  headcount_on_site      integer not null check (headcount_on_site >= 0),
  occupancy_rate_percent double precision check (occupancy_rate_percent is null or (occupancy_rate_percent between 0 and 100)),
  market_tier            text check (market_tier is null or market_tier in ('tier1','tier2','tier3')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index properties_portfolio_idx on properties(portfolio_id);
create index properties_org_idx on properties(org_id);
create trigger properties_set_updated_at before update on properties
  for each row execute function set_updated_at();

-- Leases ----------------------------------------------------------------------
create table leases (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizations(id) on delete cascade,
  property_id          uuid not null references properties(id) on delete cascade,
  lease_start_date     date not null,
  lease_end_date       date not null,
  lease_type           text not null check (lease_type in ('gross','triple_net','modified_gross')),
  annual_rent          double precision not null check (annual_rent >= 0),
  cams_annual          double precision check (cams_annual is null or cams_annual >= 0),
  other_annual_costs   double precision check (other_annual_costs is null or other_annual_costs >= 0),
  has_break_clause     boolean not null default false,
  break_date           date,
  break_penalty_type   text check (break_penalty_type is null or break_penalty_type in ('percentage_of_remaining','fixed_amount','none')),
  break_penalty_amount double precision,
  cancellation_clause  text,
  holdover_terms       text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (lease_start_date < lease_end_date),
  check (break_date is null or (break_date between lease_start_date and lease_end_date))
);
create index leases_property_idx on leases(property_id);
create index leases_org_idx on leases(org_id);
create trigger leases_set_updated_at before update on leases
  for each row execute function set_updated_at();

-- Occupancy -------------------------------------------------------------------
create table occupancy_records (
  id                            uuid primary key default gen_random_uuid(),
  org_id                        uuid not null references organizations(id) on delete cascade,
  property_id                   uuid not null references properties(id) on delete cascade,
  data_source                   text not null check (data_source in ('badge_access','occupancy_sensor','security_system','desk_hoteling','space_management','manual_entry')),
  measurement_date              date not null check (measurement_date <= current_date),
  occupied_desks                integer not null check (occupied_desks >= 0),
  total_desks_available         integer not null check (total_desks_available > 0),
  occupancy_rate_percent        double precision check (occupancy_rate_percent is null or (occupancy_rate_percent between 0 and 100)),
  peak_occupancy_time           text,
  average_occupancy_rate_percent double precision,
  notes                         text,
  created_at                    timestamptz not null default now(),
  check (occupied_desks <= total_desks_available)
);
create index occupancy_property_idx on occupancy_records(property_id);
create index occupancy_org_idx on occupancy_records(org_id);

-- Space breakdown -------------------------------------------------------------
create table space_breakdowns (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references organizations(id) on delete cascade,
  property_id             uuid not null references properties(id) on delete cascade,
  space_type              text not null check (space_type in ('private_office','open_collaborative','conference_rooms','phone_booths','focus_areas','amenity_support')),
  allocated_sf            integer not null check (allocated_sf >= 0),
  allocated_headcount     integer not null check (allocated_headcount >= 0),
  utilization_rate_percent double precision check (utilization_rate_percent is null or (utilization_rate_percent between 0 and 100)),
  estimated_cost_portion  double precision,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index space_property_idx on space_breakdowns(property_id);
create index space_org_idx on space_breakdowns(org_id);
create trigger space_set_updated_at before update on space_breakdowns
  for each row execute function set_updated_at();

-- Analysis snapshots ----------------------------------------------------------
-- Immutable once written (brief §8): computed on demand, cached by id.
create table analysis_snapshots (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid not null references organizations(id) on delete cascade,
  portfolio_id             uuid not null references portfolios(id) on delete cascade,
  snapshot_date            date not null default current_date,
  data_as_of_date          date,
  analysis_results         jsonb not null,
  data_completeness_percent double precision not null default 0,
  notes                    text,
  created_at               timestamptz not null default now()
);
create index snapshots_portfolio_idx on analysis_snapshots(portfolio_id);
create index snapshots_org_idx on analysis_snapshots(org_id);
