// POST /functions/v1/export-pdf  (brief §6: POST /api/.../snapshots/{id}/export-pdf)
// Renders a stored snapshot into a PDF, uploads it to Storage, and returns a
// time-limited signed download URL.
//
// Body: { snapshot_id: string, report_type?: "executive_summary"|"detailed"|"opportunities_only" }
// Returns: { pdf_url: string, expires_in: number }

import { jsPDF } from 'jspdf';
import { buildReport, type ReportType } from '../../../engine/report.ts';
import type { AnalysisResults } from '../../../engine/types.ts';
import { json, preflight } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';

const REPORT_TYPES: ReportType[] = ['executive_summary', 'detailed', 'opportunities_only'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: { snapshot_id?: string; report_type?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const { snapshot_id } = body;
  const reportType: ReportType = REPORT_TYPES.includes(body.report_type as ReportType)
    ? (body.report_type as ReportType)
    : 'executive_summary';
  if (!snapshot_id) return json({ error: 'missing_fields', required: ['snapshot_id'] }, 400);

  // Read the snapshot under RLS (caller must belong to the client).
  const supabase = userClient(req);
  const { data: snapshot, error } = await supabase
    .from('analysis_snapshots')
    .select('id, portfolio_id, snapshot_date, analysis_results, portfolios(name)')
    .eq('id', snapshot_id)
    .maybeSingle();
  if (error) return json({ error: 'load_failed', detail: error.message }, 500);
  if (!snapshot) return json({ error: 'snapshot_not_found' }, 404);

  const results = snapshot.analysis_results as AnalysisResults;
  const portfolioName =
    // deno-lint-ignore no-explicit-any
    (snapshot as any).portfolios?.name ?? 'Portfolio';
  const report = buildReport(results, {
    portfolioName,
    snapshotDate: String(snapshot.snapshot_date),
    reportType,
  });

  // --- Render PDF ------------------------------------------------------------
  const pdf = renderPdf(report);
  const bytes = pdf.output('arraybuffer');

  // --- Upload to Storage (service role) --------------------------------------
  const bucket = Deno.env.get('REPORT_BUCKET') ?? 'reports';
  const ttl = Number(Deno.env.get('REPORT_LINK_TTL_SECONDS') ?? '3600');
  const path = `${snapshot.portfolio_id}/${snapshot_id}-${reportType}.pdf`;

  const admin = serviceClient();
  const { error: upErr } = await admin.storage
    .from(bucket)
    .upload(path, new Uint8Array(bytes), { contentType: 'application/pdf', upsert: true });
  if (upErr) return json({ error: 'upload_failed', detail: upErr.message }, 500);

  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, ttl);
  if (signErr || !signed) {
    return json({ error: 'sign_failed', detail: signErr?.message }, 500);
  }

  return json({ pdf_url: signed.signedUrl, expires_in: ttl });
});

function renderPdf(report: {
  title: string;
  subtitle: string;
  sections: { heading: string; lines: string[] }[];
}): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const write = (text: string, size: number, gap: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    for (const line of doc.splitTextToSize(text, maxWidth)) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size + 2;
    }
    y += gap;
  };

  write(report.title, 20, 4, true);
  write(report.subtitle, 11, 12);
  for (const section of report.sections) {
    write(section.heading, 14, 4, true);
    for (const line of section.lines) write(line, 10, 1);
    y += 8;
  }
  return doc;
}
