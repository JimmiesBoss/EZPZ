-- Tenant provisioning (brief §9 multi-client isolation).
--
-- RLS restricts every row to clients the user belongs to, but a brand-new user
-- has no membership and cannot insert into `clients` (no insert policy). These
-- SECURITY DEFINER RPCs are the sanctioned bootstrap path:
--   - create_client(): create a client and make the caller its owner.
--   - add_client_member(): an owner grants another user access to a client.
-- Reading clients needs no RPC — the clients_select policy already returns only
-- the caller's clients, so the frontend can `select * from clients` directly.

-- Create a client and enroll the caller as owner. Returns the new client row.
create or replace function create_client(client_name text)
returns clients
language plpgsql
security definer
set search_path = public
as $$
declare
  new_client clients;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if client_name is null or length(trim(client_name)) = 0 then
    raise exception 'client_name is required';
  end if;

  insert into clients (name) values (trim(client_name)) returning * into new_client;
  insert into client_members (client_id, user_id, role)
    values (new_client.id, auth.uid(), 'owner');

  return new_client;
end;
$$;

-- Grant (or update) another user's access to a client. Owner-only.
create or replace function add_client_member(
  target_client uuid,
  target_user uuid,
  member_role text default 'member'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from client_members
    where client_id = target_client and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'only an owner of this client can add members';
  end if;
  if member_role not in ('owner', 'member', 'viewer') then
    raise exception 'invalid role: %', member_role;
  end if;

  insert into client_members (client_id, user_id, role)
    values (target_client, target_user, member_role)
  on conflict (client_id, user_id) do update set role = excluded.role;
end;
$$;

grant execute on function create_client(text) to authenticated;
grant execute on function add_client_member(uuid, uuid, text) to authenticated;
