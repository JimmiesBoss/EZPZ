// Report model builder (brief §5.3). Produces a structured, render-agnostic
// document from AnalysisResults so the PDF renderer (Edge Function) stays a thin
// layout shell and the content is unit-testable.

import { round } from './normalize.ts';
import type { AnalysisResults } from './types.ts';

export type ReportType = 'executive_summary' | 'detailed' | 'opportunities_only';

export interface ReportSection {
  heading: string;
  lines: string[];
}

export interface ReportModel {
  title: string;
  subtitle: string;
  generatedFor: string;
  sections: ReportSection[];
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function kpiSection(results: AnalysisResults): ReportSection {
  const m = results.portfolio_level_metrics;
  return {
    heading: 'Portfolio KPIs',
    lines: [
      `Total square footage: ${m.total_portfolio_sf.toLocaleString('en-US')} SF`,
      `Total operating cost (annual): ${money(m.total_portfolio_annual_cost)}`,
      `Operating cost per SF: ${money(m.cost_per_sf_total)}`,
      `Total headcount: ${m.total_headcount.toLocaleString('en-US')}`,
      `Average utilization: ${round(m.portfolio_average_utilization_rate)}%`,
      `Average occupancy: ${round(m.portfolio_average_occupancy_rate)}%`,
      `Variance vs. benchmark: ${round(m.benchmark_variance_percent)}%`,
      `Data completeness: ${round(results.data_completeness_percent)}%`,
    ],
  };
}

/**
 * All-in occupancy cost: every combined expense itemized, then the fully-loaded
 * total. Reports lead with the full picture (dashboards lead with operating).
 */
function costSection(results: AnalysisResults): ReportSection {
  const m = results.portfolio_level_metrics;
  const op = m.operating_cost_breakdown;
  const cap = m.capital_cost_breakdown;
  const lines: string[] = ['Operating expenses (annual):'];

  const opRows: [string, number][] = [
    ['  Base rent', op.rent],
    ['  CAM / operating', op.cams],
    ['  Utilities', op.utilities],
    ['  Parking', op.parking],
    ['  Property tax', op.property_tax],
    ['  Insurance', op.insurance],
    ['  Janitorial', op.janitorial],
    ['  Other recurring', op.other],
  ];
  for (const [label, val] of opRows) if (val > 0) lines.push(`${label}: ${money(val)}`);
  lines.push(`  Total operating: ${money(m.total_portfolio_annual_cost)}`);

  const hasCapital =
    cap.tenant_improvement + cap.furniture_ffe + cap.construction_buildout +
    cap.moving + cap.other + cap.tenant_improvement_allowance > 0;
  if (hasCapital) {
    lines.push('One-time / capital:');
    if (cap.tenant_improvement > 0) lines.push(`  Tenant improvement: ${money(cap.tenant_improvement)}`);
    if (cap.tenant_improvement_allowance > 0) lines.push(`  Less TI allowance: -${money(cap.tenant_improvement_allowance)}`);
    if (cap.furniture_ffe > 0) lines.push(`  Furniture / FF&E: ${money(cap.furniture_ffe)}`);
    if (cap.construction_buildout > 0) lines.push(`  Construction / build-out: ${money(cap.construction_buildout)}`);
    if (cap.moving > 0) lines.push(`  Moving: ${money(cap.moving)}`);
    if (cap.other > 0) lines.push(`  Other one-time: ${money(cap.other)}`);
    lines.push(`  Net capital: ${money(cap.net_capital)}`);
    lines.push(`  Amortized annual (over lease term): ${money(m.total_amortized_capital_annual)}`);
  }
  lines.push(`Fully-loaded annual cost: ${money(m.total_fully_loaded_annual_cost)}`);
  lines.push(`Fully-loaded cost per SF: ${money(m.fully_loaded_cost_per_sf)}`);
  return { heading: 'Occupancy Cost — All-In', lines };
}

function standardsSection(results: AnalysisResults): ReportSection {
  return {
    heading: 'Industry Standards (IFMA / BOMA / CoStar)',
    lines: results.standards_benchmarks.map(
      (s) => `[${s.status.toUpperCase()}] ${s.standard} — ${s.metric}: ${s.value}${s.unit} (${s.benchmark})`,
    ),
  };
}

function opportunitiesSection(results: AnalysisResults, limit = 10): ReportSection {
  const opps = results.financial_opportunities.slice(0, limit);
  const totalSavings = results.financial_opportunities.reduce(
    (s, o) => s + o.estimated_annual_savings,
    0,
  );
  const lines =
    opps.length === 0
      ? ['No material right-sizing opportunities identified.']
      : [
          `Identified opportunities: ${results.financial_opportunities.length} — total est. annual savings ${money(totalSavings)}`,
          ...opps.map(
            (o, i) =>
              `${i + 1}. [${o.confidence_level}] ${o.description} → save ${money(o.estimated_annual_savings)}/yr` +
              (o.payback_months && Number.isFinite(o.payback_months)
                ? ` (payback ${o.payback_months} mo)`
                : ''),
          ),
        ];
  return { heading: 'Ranked Opportunities', lines };
}

function checklistSection(results: AnalysisResults): ReportSection {
  const counts = { pass: 0, warning: 0, fail: 0 };
  for (const item of results.red_flag_checklist) counts[item.status]++;
  return {
    heading: '10-Point Red-Flag Checklist',
    lines: [
      `Pass: ${counts.pass}   Warning: ${counts.warning}   Fail: ${counts.fail}`,
      ...results.red_flag_checklist.map(
        (i) => `#${i.checklist_item_id} ${i.category} — ${i.status.toUpperCase()}: ${i.description}`,
      ),
    ],
  };
}

function propertySection(results: AnalysisResults): ReportSection {
  return {
    heading: 'Properties',
    lines: results.property_level_metrics.map(
      (p) =>
        `${p.property_name}: ${p.sf.toLocaleString('en-US')} SF, ${money(p.annual_cost)}/yr, ` +
        `${round(p.utilization_rate)}% util — ${p.red_flag_status}`,
    ),
  };
}

function issuesSection(results: AnalysisResults): ReportSection {
  return {
    heading: 'Utilization Issues',
    lines:
      results.utilization_issues.length === 0
        ? ['No significant utilization issues detected.']
        : results.utilization_issues.map(
            (i) => `[${i.severity}] ${i.issue_type}: ${i.description}`,
          ),
  };
}

export function buildReport(
  results: AnalysisResults,
  opts: { portfolioName: string; snapshotDate: string; reportType: ReportType },
): ReportModel {
  const base: ReportModel = {
    title: 'Real Estate Portfolio Analysis',
    subtitle: `${opts.portfolioName} — snapshot ${opts.snapshotDate}`,
    generatedFor: opts.portfolioName,
    sections: [],
  };

  if (opts.reportType === 'opportunities_only') {
    base.sections = [opportunitiesSection(results, 50)];
  } else if (opts.reportType === 'detailed') {
    base.sections = [
      kpiSection(results),
      costSection(results),
      standardsSection(results),
      propertySection(results),
      checklistSection(results),
      issuesSection(results),
      opportunitiesSection(results, 50),
    ];
  } else {
    // executive_summary (default): KPIs, the all-in cost picture, then priorities.
    base.sections = [
      kpiSection(results),
      costSection(results),
      standardsSection(results),
      opportunitiesSection(results, 5),
      checklistSection(results),
    ];
  }
  return base;
}
