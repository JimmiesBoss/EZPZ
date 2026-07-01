// Supabase client factories for Edge Functions.
//
// - userClient(): scoped to the caller's JWT, so all DB access is subject to RLS
//   (multi-tenant isolation enforced in the database). Use for reads/writes on
//   behalf of the signed-in user.
// - serviceClient(): service-role key, bypasses RLS. Use only for privileged
//   operations that legitimately cross the RLS boundary (e.g. Storage uploads).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  return createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

export function serviceClient(): SupabaseClient {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
}
