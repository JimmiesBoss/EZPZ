import { describe, expect, it } from 'vitest';
import {
  computePortfolioMetrics,
  computeProperty,
} from '../engine/metrics.ts';
import { analyzePortfolio } from '../engine/analyze.ts';
import { lease, occupancy, property, space, samplePortfolio, AS_OF } from './fixtures.ts';

describe('computeProperty (brief §4.1)', () => {
  const p = property({
    id: 'x',
    marketTier: 'tier1',
    totalRentableSf: 10000,
    headcountOnSite: 50,
    leases: [lease({ annualRent: 200000, camsAnnual: 50000 })],
    occupancy: [occupancy({ occupiedDesks: 40, totalDesksAvailable: 50 })],
  });
  const c = computeProperty(p);

  it('sums annual cost from rent + CAM + other', () => {
    expect(c.metrics.annual_cost).toBe(250000);
  });

  it('computes cost per SF', () => {
    expect(c.metrics.cost_per_sf).toBe(25);
  });

  it('reports cost per SF per employee = (cost/sf)/headcount per location', () => {
    expect(c.metrics.cost_per_sf_per_employee).toBeCloseTo(0.5, 5);
  });

  it('computes utilization = occupied/total desks', () => {
    expect(c.metrics.utilization_rate).toBe(80);
  });

  it('benchmarks cost per SF against the tier-1 target', () => {
    expect(c.metrics.benchmark_target_cost_per_sf).toBe(30);
    // ((25 - 30) / 30) * 100
    expect(c.metrics.variance_from_benchmark).toBeCloseTo(-16.67, 1);
  });

  it('classifies an 80% utilized property as acceptable', () => {
    expect(c.metrics.red_flag_status).toBe('acceptable');
  });
});

describe('true-cost model (operating vs fully-loaded)', () => {
  it('amortizes net capital (spend − TI allowance) over the lease term', () => {
    // 10-yr term; capital spend = TI 1,000,000 + furniture 200,000 = 1,200,000;
    // TI allowance 400,000 → net 800,000 / 10 yrs = 80,000/yr.
    const p = property({
      totalRentableSf: 10000,
      headcountOnSite: 50,
      leases: [
        lease({
          leaseStartDate: new Date('2021-01-01'),
          leaseEndDate: new Date('2031-01-01'),
          annualRent: 200000,
          camsAnnual: 50000,
          tenantImprovementCost: 1000000,
          furnitureFfeCost: 200000,
          tenantImprovementAllowance: 400000,
        }),
      ],
    });
    const c = computeProperty(p);
    expect(c.metrics.annual_cost).toBe(250000); // operating unchanged
    // net 800,000 over a ~10-yr term (365.25-day years) ≈ $80,000/yr
    expect(c.metrics.amortized_capital_annual).toBeGreaterThan(79500);
    expect(c.metrics.amortized_capital_annual).toBeLessThan(80500);
    expect(c.metrics.fully_loaded_annual_cost).toBeGreaterThan(329500);
    expect(c.metrics.fully_loaded_annual_cost).toBeLessThan(330500);
    expect(c.metrics.fully_loaded_cost_per_sf).toBeCloseTo(33, 0);
  });

  it('breaks operating cost out by category', () => {
    const c = computeProperty(
      property({
        leases: [lease({ annualRent: 100000, camsAnnual: 20000, utilitiesAnnual: 15000, parkingAnnual: 5000 })],
      }),
    );
    const b = c.metrics.operating_cost_breakdown;
    expect(b.rent).toBe(100000);
    expect(b.utilities).toBe(15000);
    expect(b.parking).toBe(5000);
  });

  it('computes load factor from rentable ÷ usable SF', () => {
    const c = computeProperty(property({ totalRentableSf: 11500, totalUsableSf: 10000 }));
    expect(c.metrics.load_factor).toBeCloseTo(1.15, 3);
  });
});

describe('red_flag_status classification', () => {
  it('flags low utilization as underutilized', () => {
    const c = computeProperty(
      property({ occupancy: [occupancy({ occupiedDesks: 20, totalDesksAvailable: 50 })] }),
    );
    expect(c.metrics.utilization_rate).toBe(40);
    expect(c.metrics.red_flag_status).toBe('underutilized');
  });

  it('reports insufficient_data when no occupancy basis exists', () => {
    const c = computeProperty(
      property({ occupancy: [], occupancyRatePercent: null }),
    );
    expect(c.metrics.red_flag_status).toBe('insufficient_data');
  });
});

describe('computePortfolioMetrics (brief §4.1)', () => {
  it('aggregates totals and averages across properties', () => {
    const pf = samplePortfolio();
    const comps = pf.properties.map(computeProperty);
    const m = computePortfolioMetrics(comps);
    expect(m.total_portfolio_sf).toBe(72000);
    expect(m.total_headcount).toBe(245);
    expect(m.total_portfolio_annual_cost).toBe(2000000 + 400000 + 700000 + 600000);
    expect(m.cost_per_sf_total).toBeCloseTo(m.total_portfolio_annual_cost / 72000, 2);
  });
});

describe('data completeness (brief §5.2 step 1)', () => {
  it('is 100% when a property has cost, occupancy and space data', () => {
    const full = property({
      spaces: [space({ spaceType: 'open_collaborative', allocatedSf: 5000 })],
    });
    const results = analyzePortfolio({ id: 'p', name: 'p', properties: [full] }, { asOf: AS_OF });
    expect(results.data_completeness_percent).toBe(100);
  });

  it('is ~67% with cost + occupancy but no space breakdown', () => {
    const results = analyzePortfolio(
      { id: 'p', name: 'p', properties: [property({ spaces: [] })] },
      { asOf: AS_OF },
    );
    expect(results.data_completeness_percent).toBeCloseTo(66.67, 1);
  });
});
