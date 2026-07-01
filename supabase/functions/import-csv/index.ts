// POST /functions/v1/import-csv  (brief §6: POST /api/portfolios/{id}/import-csv)
// Validates a CSV upload and inserts the valid rows, reporting per-row errors.
//
// Body: { portfolio_id: string, template_type: "properties"|"leases"|"occupancy", csv: string }
// Returns: { imported_count, error_count, errors[], warnings[] }

import { validateCsv, type TemplateType } from '../../../engine/csv.ts';
import { json, preflight } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

const TEMPLATES: TemplateType[] = ['properties', 'leases', 'occupancy'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: { portfolio_id?: string; template_type?: string; csv?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const { portfolio_id, template_type, csv } = body;
  if (!portfolio_id || !template_type || typeof csv !== 'string') {
    return json({ error: 'missing_fields', required: ['portfolio_id', 'template_type', 'csv'] }, 400);
  }
  if (!TEMPLATES.includes(template_type as TemplateType)) {
    return json({ error: 'invalid_template_type', allowed: TEMPLATES }, 400);
  }
  if (csv.length > 10 * 1024 * 1024) {
    return json({ error: 'file_too_large', max_bytes: 10 * 1024 * 1024 }, 400);
  }

  const supabase = userClient(req);

  // Resolve the portfolio (RLS restricts this to the caller's client).
  const { data: portfolio, error: pErr } = await supabase
    .from('portfolios')
    .select('id, client_id')
    .eq('id', portfolio_id)
    .maybeSingle();
  if (pErr) return json({ error: 'load_failed', detail: pErr.message }, 500);
  if (!portfolio) return json({ error: 'portfolio_not_found' }, 404);

  const validation = validateCsv(template_type as TemplateType, csv);
  if (validation.error_count > 0) {
    // Report errors and abort — user corrects and re-uploads (brief §5.1).
    return json(validation, 422);
  }

  const clientId = portfolio.client_id;

  // Map property_name -> id for child templates.
  let nameToId = new Map<string, string>();
  if (template_type !== 'properties') {
    const { data: props, error } = await supabase
      .from('properties')
      .select('id, name')
      .eq('portfolio_id', portfolio_id);
    if (error) return json({ error: 'load_failed', detail: error.message }, 500);
    nameToId = new Map((props ?? []).map((p) => [p.name.toLowerCase(), p.id]));
  }

  const inserts: Record<string, unknown>[] = [];
  const unresolved: { row: number; column: string; message: string }[] = [];

  for (const { row, ref, data } of validation.rows) {
    if (template_type === 'properties') {
      const d = data as Record<string, unknown>;
      inserts.push({
        client_id: clientId,
        portfolio_id,
        name: d.property_name,
        address: d.address,
        city: d.city,
        state: d.state,
        zip: d.zip,
        property_type: d.property_type,
        total_rentable_sf: d.total_rentable_sf,
        total_usable_sf: d.total_usable_sf ?? null,
        number_of_floors: d.number_of_floors ?? null,
        year_built: d.year_built ?? null,
        headcount_on_site: d.headcount_on_site,
        occupancy_rate_percent: d.occupancy_rate_percent ?? null,
        market_tier: d.market_tier ?? null,
      });
    } else {
      const propertyId = nameToId.get(ref.toLowerCase());
      if (!propertyId) {
        unresolved.push({ row, column: 'property_name', message: `unknown property "${ref}"` });
        continue;
      }
      const d = data as Record<string, unknown>;
      if (template_type === 'leases') {
        inserts.push({ client_id: clientId, property_id: propertyId, ...toLeaseRow(d) });
      } else {
        inserts.push({ client_id: clientId, property_id: propertyId, ...toOccupancyRow(d) });
      }
    }
  }

  if (unresolved.length > 0) {
    return json({ imported_count: 0, error_count: unresolved.length, errors: unresolved, warnings: validation.warnings }, 422);
  }

  const table =
    template_type === 'properties'
      ? 'properties'
      : template_type === 'leases'
        ? 'leases'
        : 'occupancy_records';

  const { error: insErr, count } = await supabase
    .from(table)
    .insert(inserts, { count: 'exact' });
  if (insErr) return json({ error: 'insert_failed', detail: insErr.message }, 500);

  return json({
    imported_count: count ?? inserts.length,
    error_count: 0,
    errors: [],
    warnings: validation.warnings,
  });
});

function toLeaseRow(d: Record<string, any>) {
  return {
    lease_start_date: d.lease_start_date,
    lease_end_date: d.lease_end_date,
    lease_type: d.lease_type,
    annual_rent: d.annual_rent,
    cams_annual: d.cams_annual ?? null,
    other_annual_costs: d.other_annual_costs ?? null,
    has_break_clause: d.has_break_clause ?? false,
    break_date: d.break_date ?? null,
    break_penalty_type: d.break_penalty_type ?? null,
    break_penalty_amount: d.break_penalty_amount ?? null,
  };
}

function toOccupancyRow(d: Record<string, any>) {
  return {
    data_source: d.data_source,
    measurement_date: d.measurement_date,
    occupied_desks: d.occupied_desks,
    total_desks_available: d.total_desks_available,
    occupancy_rate_percent: d.occupancy_rate_percent ?? null,
    average_occupancy_rate_percent: d.average_occupancy_rate_percent ?? null,
  };
}
