-- Profolio schema (brief §3). Postgres / Supabase.
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

-- Tenancy ---------------------------------------------------------------------
create table clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Maps a Supabase auth user to the client(s) whose data they may access.
create table client_members (
  client_id uuid not null references clients(id) on delete cascade,
  user_id   uuid not null,
  role      text not null default 'member' check (role in ('owner','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);
create index client_members_user_idx on client_members(user_id);

-- Portfolios ------------------------------------------------------------------
create table portfolios (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  name       text not null check (char_length(name) <= 255),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index portfolios_client_idx on portfolios(client_id);
create trigger portfolios_set_updated_at before update on portfolios
  for each row execute function set_updated_at();

-- Properties ------------------------------------------------------------------
create table properties (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references clients(id) on delete cascade,
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
create index properties_client_idx on properties(client_id);
create trigger properties_set_updated_at before update on properties
  for each row execute function set_updated_at();

-- Leases ----------------------------------------------------------------------
create table leases (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references clients(id) on delete cascade,
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
create index leases_client_idx on leases(client_id);
create trigger leases_set_updated_at before update on leases
  for each row execute function set_updated_at();

-- Occupancy -------------------------------------------------------------------
create table occupancy_records (
  id                            uuid primary key default gen_random_uuid(),
  client_id                     uuid not null references clients(id) on delete cascade,
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
create index occupancy_client_idx on occupancy_records(client_id);

-- Space breakdown -------------------------------------------------------------
create table space_breakdowns (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references clients(id) on delete cascade,
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
create index space_client_idx on space_breakdowns(client_id);
create trigger space_set_updated_at before update on space_breakdowns
  for each row execute function set_updated_at();

-- Analysis snapshots ----------------------------------------------------------
-- Snapshots are immutable once written (brief §8): computed on demand, cached by id.
create table analysis_snapshots (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid not null references clients(id) on delete cascade,
  portfolio_id             uuid not null references portfolios(id) on delete cascade,
  snapshot_date            date not null default current_date,
  data_as_of_date          date,
  analysis_results         jsonb not null,
  data_completeness_percent double precision not null default 0,
  notes                    text,
  created_at               timestamptz not null default now()
);
create index snapshots_portfolio_idx on analysis_snapshots(portfolio_id);
create index snapshots_client_idx on analysis_snapshots(client_id);
