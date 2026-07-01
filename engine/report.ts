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
      `Total annual occupancy cost: ${money(m.total_portfolio_annual_cost)}`,
      `Cost per SF (portfolio): ${money(m.cost_per_sf_total)}`,
      `Total headcount: ${m.total_headcount.toLocaleString('en-US')}`,
      `Average utilization: ${round(m.portfolio_average_utilization_rate)}%`,
      `Average occupancy: ${round(m.portfolio_average_occupancy_rate)}%`,
      `Variance vs. benchmark: ${round(m.benchmark_variance_percent)}%`,
      `Data completeness: ${round(results.data_completeness_percent)}%`,
    ],
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
      propertySection(results),
      checklistSection(results),
      issuesSection(results),
      opportunitiesSection(results, 50),
    ];
  } else {
    // executive_summary (default)
    base.sections = [
      kpiSection(results),
      opportunitiesSection(results, 5),
      checklistSection(results),
    ];
  }
  return base;
}
