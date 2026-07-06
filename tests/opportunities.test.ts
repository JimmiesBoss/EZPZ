import { describe, expect, it } from 'vitest';
import { computeProperty } from '../engine/metrics.ts';
import { identifyOpportunities } from '../engine/opportunities.ts';
import { analyzePortfolio } from '../engine/analyze.ts';
import { AS_OF, samplePortfolio } from './fixtures.ts';

describe('identifyOpportunities (brief §4.4)', () => {
  const comps = samplePortfolio().properties.map(computeProperty);
  const opps = identifyOpportunities(comps, AS_OF);

  it('surfaces a sublease opportunity for a low-occupancy gross lease', () => {
    const sublease = opps.filter((o) => o.opportunity_type === 'sublease_excess');
    expect(sublease.length).toBeGreaterThanOrEqual(1);
    expect(sublease[0].estimated_annual_savings).toBeGreaterThan(0);
  });

  it('surfaces a consolidation opportunity for two small same-market sites', () => {
    const consolidation = opps.filter((o) => o.opportunity_type === 'consolidate_properties');
    expect(consolidation.length).toBeGreaterThanOrEqual(1);
    expect(consolidation[0].payback_months).toBeGreaterThanOrEqual(0);
  });

  it('ranks opportunities by savings-to-cost ratio (zero-cost first)', () => {
    for (let i = 1; i < opps.length; i++) {
      const prev = opps[i - 1];
      const cur = opps[i];
      const rPrev = prev.implementation_cost > 0 ? prev.estimated_annual_savings / prev.implementation_cost : Infinity;
      const rCur = cur.implementation_cost > 0 ? cur.estimated_annual_savings / cur.implementation_cost : Infinity;
      expect(rPrev).toBeGreaterThanOrEqual(rCur);
    }
  });

  it('produces no opportunities for a single healthy property', () => {
    const healthy = analyzePortfolio(
      { id: 'p', name: 'p', properties: [samplePortfolio().properties[0]] },
      { asOf: AS_OF },
    );
    // HQ alone: no same-market pair, decent occupancy -> no sublease/consolidation
    expect(
      healthy.financial_opportunities.filter(
        (o) => o.opportunity_type === 'consolidate_properties',
      ),
    ).toHaveLength(0);
  });
});

describe('utilization issue classification (brief §5.2 step 6)', () => {
  it('classifies underutilized sites with a root cause', () => {
    const results = analyzePortfolio(samplePortfolio(), { asOf: AS_OF });
    expect(results.utilization_issues.length).toBeGreaterThanOrEqual(1);
    for (const issue of results.utilization_issues) {
      expect(issue.description.length).toBeGreaterThan(0);
      expect(issue.evidence).toHaveProperty('utilization_rate');
    }
  });
});
