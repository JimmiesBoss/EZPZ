// POST /functions/v1/analyze  (brief §6: POST /api/portfolios/{id}/analyze)
// Runs the calculation engine over a portfolio and persists an immutable snapshot.
//
// Body: { portfolio_id: string, snapshot_date?: date, data_as_of_date?: date, notes?: string }
// Returns: the AnalysisSnapshot (id + full analysis_results).

import { analyzePortfolio } from '../../../engine/analyze.ts';
import { analyzeRequestSchema } from '../../../engine/validation.ts';
import { corsHeaders, json, preflight } from '../_shared/cors.ts';
import { loadPortfolioInput } from '../_shared/load.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'validation_error', issues: parsed.error.issues }, 400);
  }
  const { portfolio_id, snapshot_date, data_as_of_date, notes } = parsed.data;

  const supabase = userClient(req);

  let loaded;
  try {
    loaded = await loadPortfolioInput(supabase, portfolio_id);
  } catch (err) {
    return json({ error: 'load_failed', detail: String(err) }, 500);
  }
  if (!loaded) return json({ error: 'portfolio_not_found' }, 404);

  const asOf = data_as_of_date ? new Date(data_as_of_date) : new Date();
  const results = analyzePortfolio(loaded.input, { asOf });

  const snapshotDate =
    snapshot_date ?? new Date().toISOString().slice(0, 10);

  const { data: snapshot, error } = await supabase
    .from('analysis_snapshots')
    .insert({
      client_id: loaded.clientId,
      portfolio_id,
      snapshot_date: snapshotDate,
      data_as_of_date: data_as_of_date ?? null,
      analysis_results: results,
      data_completeness_percent: results.data_completeness_percent,
      notes: notes ?? null,
    })
    .select('id, snapshot_date, created_at')
    .single();

  if (error) {
    return json({ error: 'snapshot_insert_failed', detail: error.message }, 500);
  }

  return new Response(
    JSON.stringify({
      snapshot_id: snapshot.id,
      snapshot_date: snapshot.snapshot_date,
      generated_timestamp: snapshot.created_at,
      ...results,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
