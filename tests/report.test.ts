import { describe, expect, it } from 'vitest';
import { analyzePortfolio } from '../engine/analyze.ts';
import { buildReport } from '../engine/report.ts';
import { AS_OF, samplePortfolio } from './fixtures.ts';

describe('buildReport (brief §5.3)', () => {
  const results = analyzePortfolio(samplePortfolio(), { asOf: AS_OF });
  const opts = { portfolioName: 'Acme', snapshotDate: '2026-01-01', reportType: 'executive_summary' as const };

  it('executive summary includes KPIs, all-in cost, standards, opportunities and checklist', () => {
    const report = buildReport(results, opts);
    const headings = report.sections.map((s) => s.heading);
    expect(headings).toContain('Portfolio KPIs');
    expect(headings).toContain('Occupancy Cost — All-In');
    expect(headings).toContain('Industry Standards (IFMA / BOMA / CoStar)');
    expect(headings).toContain('Ranked Opportunities');
    expect(headings).toContain('10-Point Red-Flag Checklist');
    expect(report.subtitle).toContain('Acme');
  });

  it('all-in cost section ends with the fully-loaded total', () => {
    const report = buildReport(results, opts);
    const cost = report.sections.find((s) => s.heading === 'Occupancy Cost — All-In')!;
    expect(cost.lines.some((l) => l.startsWith('Fully-loaded annual cost:'))).toBe(true);
    expect(cost.lines.some((l) => l.includes('Total operating:'))).toBe(true);
  });

  it('detailed report adds property and issue sections', () => {
    const report = buildReport(results, { ...opts, reportType: 'detailed' });
    const headings = report.sections.map((s) => s.heading);
    expect(headings).toContain('Properties');
    expect(headings).toContain('Utilization Issues');
  });

  it('opportunities_only report contains a single section', () => {
    const report = buildReport(results, { ...opts, reportType: 'opportunities_only' });
    expect(report.sections).toHaveLength(1);
    expect(report.sections[0].heading).toBe('Ranked Opportunities');
  });
});
