import { describe, expect, it } from 'vitest';
import { analyzePortfolio } from '../engine/analyze.ts';
import { AS_OF, property, lease, samplePortfolio } from './fixtures.ts';

describe('standards benchmarks (IFMA / BOMA / CoStar)', () => {
  it('always includes IFMA, BOMA and CoStar comparisons', () => {
    const results = analyzePortfolio(samplePortfolio(), { asOf: AS_OF });
    const standards = results.standards_benchmarks;
    const bodies = standards.map((s) => s.standard);
    expect(bodies).toContain('IFMA');
    expect(bodies).toContain('BOMA');
    expect(bodies).toContain('CoStar');
    for (const s of standards) {
      expect(['pass', 'warning', 'fail']).toContain(s.status);
      expect(s.metric.length).toBeGreaterThan(0);
    }
  });

  it('flags the BOMA load factor when common-area burden is high', () => {
    const results = analyzePortfolio(
      { id: 'p', name: 'p', properties: [property({ totalRentableSf: 13000, totalUsableSf: 10000 })] },
      { asOf: AS_OF },
    );
    const boma = results.standards_benchmarks.find(
      (s) => s.standard === 'BOMA' && s.metric.includes('Load factor'),
    )!;
    expect(boma.value).toBeCloseTo(1.3, 2);
    expect(boma.status).toBe('fail');
  });

  it('warns on IFMA density when the portfolio is over-spaced', () => {
    const results = analyzePortfolio(
      {
        id: 'p', name: 'p',
        properties: [property({ totalRentableSf: 40000, headcountOnSite: 100, leases: [lease()] })],
      },
      { asOf: AS_OF },
    );
    const density = results.standards_benchmarks.find(
      (s) => s.standard === 'IFMA' && s.metric.includes('Density'),
    )!;
    expect(density.value).toBe(400); // 40000 / 100
    expect(density.status).toBe('fail');
  });
});
