-- Invite-only access with approved-domain auto-join.
--
-- Access model:
--   * A PLATFORM ADMIN (the operator) provisions organizations and their first
--     admin. Random signups cannot create organizations.
--   * Each organization approves one or more corporate email DOMAINS. Anyone who
--     signs in (Google, Microsoft, or manual — all just yield an email) with an
--     approved-domain address is auto-joined to that org on first login.
--   * Explicit email invitations (0003_tenancy.sql) still work for one-off users
--     outside an approved domain.
-- A user with neither an invite nor an approved domain lands in no organization.

-- Platform operators ----------------------------------------------------------
create table platform_admins (
  user_id    uuid primary key,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;

create or replace function is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create policy platform_admins_select on platform_admins
  for select using (is_platform_admin());

-- Default role given to domain/invite joiners (everyone admin for now; settable).
alter table organizations
  add column default_member_role text not null default 'admin'
  check (default_member_role in ('admin','editor','viewer'));

-- Approved email domains. A domain maps to exactly one org (deterministic join).
create table organization_domains (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  domain     text not null,
  created_at timestamptz not null default now()
);
create unique index organization_domains_domain_uniq on organization_domains (lower(domain));
create index organization_domains_org_idx on organization_domains(org_id);
alter table organization_domains enable row level security;
create policy org_domains_select on organization_domains
  for select using (is_org_member(org_id));  -- writes via RPC only

-- Guard against public email providers being approved as org domains.
create or replace function is_public_email_domain(d text)
returns boolean language sql immutable as $$
  select lower(d) = any (array[
    'gmail.com','googlemail.com','outlook.com','hotmail.com','live.com',
    'msn.com','yahoo.com','icloud.com','me.com','mac.com','aol.com',
    'proton.me','protonmail.com','gmx.com','mail.com','yandex.com','zoho.com'
  ]);
$$;

-- Re-provision create_organization as a platform-admin operation. Optionally set
-- the first approved domain and designate the first org admin by email.
-- Returns json {org_id, portfolio_id}. (Not RETURNS TABLE, to avoid an OUT-param
-- named org_id colliding with the table column in the ON CONFLICT clauses below.)
drop function if exists create_organization(text, text, text, text);
create or replace function create_organization(
  org_name text,
  primary_domain text default null,
  admin_email text default null,
  portfolio_name text default null,
  industry text default null,
  primary_region text default null
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_org organizations;
  v_portfolio portfolios;
  v_admin uuid;
begin
  if not is_platform_admin() then
    raise exception 'only a platform admin can create organizations';
  end if;
  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'org_name is required';
  end if;

  insert into organizations (name, industry, primary_region)
    values (trim(org_name), industry, primary_region) returning * into v_org;

  insert into portfolios (org_id, name)
    values (v_org.id, coalesce(nullif(trim(portfolio_name), ''), trim(org_name) || ' Portfolio'))
    returning * into v_portfolio;

  if primary_domain is not null and length(trim(primary_domain)) > 0 then
    if is_public_email_domain(trim(primary_domain)) then
      raise exception 'public email domains cannot be used as an organization domain';
    end if;
    insert into organization_domains (org_id, domain) values (v_org.id, lower(trim(primary_domain)));
  end if;

  if admin_email is not null and length(trim(admin_email)) > 0 then
    select id into v_admin from auth.users where lower(email) = lower(trim(admin_email)) limit 1;
    if v_admin is not null then
      insert into organization_members (org_id, user_id, role)
        values (v_org.id, v_admin, 'admin') on conflict (org_id, user_id) do nothing;
    else
      insert into organization_invitations (org_id, email, role)
        values (v_org.id, lower(trim(admin_email)), 'admin')
      on conflict (org_id, lower(email)) do update set role = 'admin', accepted_at = null;
    end if;
  end if;

  return json_build_object('org_id', v_org.id, 'portfolio_id', v_portfolio.id);
end;
$$;

-- Manage approved domains. Org admin only. ------------------------------------
create or replace function add_org_domain(target_org uuid, d text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_org_admin(target_org) then
    raise exception 'only an admin can manage domains';
  end if;
  if d is null or length(trim(d)) = 0 then
    raise exception 'domain is required';
  end if;
  if is_public_email_domain(trim(d)) then
    raise exception 'public email domains are not allowed';
  end if;
  insert into organization_domains (org_id, domain) values (target_org, lower(trim(d)));
end;
$$;

create or replace function remove_org_domain(target_org uuid, d text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_org_admin(target_org) then
    raise exception 'only an admin can manage domains';
  end if;
  delete from organization_domains where org_id = target_org and lower(domain) = lower(trim(d));
end;
$$;

-- Signup handler: consume invitations, then auto-join by approved domain. ------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_domain text;
begin
  -- 1. Explicit email invitations.
  insert into organization_members (org_id, user_id, role)
    select i.org_id, new.id, i.role
    from organization_invitations i
    where lower(i.email) = lower(new.email) and i.accepted_at is null
  on conflict (org_id, user_id) do nothing;

  update organization_invitations set accepted_at = now()
    where lower(email) = lower(new.email) and accepted_at is null;

  -- 2. Approved corporate domain -> join with the org's default role.
  v_domain := lower(split_part(new.email, '@', 2));
  if v_domain <> '' then
    insert into organization_members (org_id, user_id, role)
      select d.org_id, new.id, o.default_member_role
      from organization_domains d
      join organizations o on o.id = d.org_id
      where lower(d.domain) = v_domain
    on conflict (org_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

grant execute on function create_organization(text, text, text, text, text, text) to authenticated;
grant execute on function add_org_domain(uuid, text) to authenticated;
grant execute on function remove_org_domain(uuid, text) to authenticated;
grant execute on function is_platform_admin() to authenticated;
grant select on platform_admins to authenticated;
grant select, insert, update, delete on organization_domains to authenticated;
