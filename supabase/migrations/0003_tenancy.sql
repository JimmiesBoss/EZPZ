-- Tenant provisioning, intake, and user administration (brief §9).
--
-- RLS blocks direct inserts into organizations / organization_members, so these
-- SECURITY DEFINER RPCs are the sanctioned paths:
--   create_organization()  – onboarding: create an org + its single portfolio,
--                            caller becomes admin.
--   invite_member()         – admin adds a teammate (by email) with a role.
--   set_member_role()       – admin changes a member's role.
--   remove_member()         – admin removes a member (never the last admin).
-- A signup trigger auto-enrolls invited users when they first sign in.

-- Onboarding: create an organization and its one portfolio; caller is admin. ---
create or replace function create_organization(
  org_name text,
  portfolio_name text default null,
  industry text default null,
  primary_region text default null
)
returns table (org_id uuid, portfolio_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org organizations;
  v_portfolio portfolios;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'org_name is required';
  end if;

  insert into organizations (name, industry, primary_region)
    values (trim(org_name), industry, primary_region)
    returning * into v_org;

  insert into organization_members (org_id, user_id, role)
    values (v_org.id, auth.uid(), 'admin');

  insert into portfolios (org_id, name)
    values (v_org.id, coalesce(nullif(trim(portfolio_name), ''), trim(org_name) || ' Portfolio'))
    returning * into v_portfolio;

  org_id := v_org.id;
  portfolio_id := v_portfolio.id;
  return next;
end;
$$;

-- Invite (or immediately add) a teammate. Admin only. -------------------------
-- If a user with that email already exists, they're added straight away;
-- otherwise a pending invitation is recorded for the signup trigger to consume.
-- Returns 'added' or 'invited'.
create or replace function invite_member(
  target_org uuid,
  member_email text,
  member_role text default 'admin'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_user uuid;
begin
  if not is_org_admin(target_org) then
    raise exception 'only an admin of this organization can invite members';
  end if;
  if member_role not in ('admin','editor','viewer') then
    raise exception 'invalid role: %', member_role;
  end if;
  if member_email is null or length(trim(member_email)) = 0 then
    raise exception 'member_email is required';
  end if;

  select id into existing_user from auth.users
    where lower(email) = lower(trim(member_email)) limit 1;

  if existing_user is not null then
    insert into organization_members (org_id, user_id, role)
      values (target_org, existing_user, member_role)
    on conflict (org_id, user_id) do update set role = excluded.role;
    return 'added';
  else
    insert into organization_invitations (org_id, email, role, invited_by)
      values (target_org, lower(trim(member_email)), member_role, auth.uid())
    on conflict (org_id, lower(email))
      do update set role = excluded.role, invited_by = excluded.invited_by, accepted_at = null;
    return 'invited';
  end if;
end;
$$;

-- Change a member's role. Admin only; can't demote the last admin. ------------
create or replace function set_member_role(
  target_org uuid,
  target_user uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_org_admin(target_org) then
    raise exception 'only an admin can change roles';
  end if;
  if new_role not in ('admin','editor','viewer') then
    raise exception 'invalid role: %', new_role;
  end if;
  if new_role <> 'admin'
     and target_user in (select user_id from organization_members where org_id = target_org and role = 'admin')
     and (select count(*) from organization_members where org_id = target_org and role = 'admin') = 1 then
    raise exception 'cannot demote the last remaining admin';
  end if;

  update organization_members set role = new_role
    where org_id = target_org and user_id = target_user;
end;
$$;

-- Remove a member. Admin only; can't remove the last admin. -------------------
create or replace function remove_member(target_org uuid, target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_org_admin(target_org) then
    raise exception 'only an admin can remove members';
  end if;
  if target_user in (select user_id from organization_members where org_id = target_org and role = 'admin')
     and (select count(*) from organization_members where org_id = target_org and role = 'admin') = 1 then
    raise exception 'cannot remove the last remaining admin';
  end if;

  delete from organization_members where org_id = target_org and user_id = target_user;
end;
$$;

-- Auto-enroll invited users on signup. ----------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into organization_members (org_id, user_id, role)
    select i.org_id, new.id, i.role
    from organization_invitations i
    where lower(i.email) = lower(new.email) and i.accepted_at is null
  on conflict (org_id, user_id) do nothing;

  update organization_invitations set accepted_at = now()
    where lower(email) = lower(new.email) and accepted_at is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Convenience: the caller's workspace(s) — org + its portfolio + their role. ---
-- security_invoker so it runs under the caller and RLS still applies.
create view my_workspaces
  with (security_invoker = true)
as
  select
    o.id             as org_id,
    o.name           as org_name,
    o.industry,
    o.primary_region,
    p.id             as portfolio_id,
    p.name           as portfolio_name,
    m.role           as my_role
  from organization_members m
  join organizations o on o.id = m.org_id
  join portfolios p on p.org_id = o.id
  where m.user_id = auth.uid();

grant execute on function create_organization(text, text, text, text) to authenticated;
grant execute on function invite_member(uuid, text, text) to authenticated;
grant execute on function set_member_role(uuid, uuid, text) to authenticated;
grant execute on function remove_member(uuid, uuid) to authenticated;
grant select on my_workspaces to authenticated;
