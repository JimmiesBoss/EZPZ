// IFMA / BOMA / CoStar standards comparisons (portfolio level).
// Surfaces the industry-standard lenses alongside the brief's own metrics without
// disturbing the 10-point red-flag checklist.

import {
  BOMA_LOAD_FACTOR,
  BOMA_OPEX_REFERENCE,
  IFMA_DENSITY,
  IFMA_UTILIZATION,
} from './benchmarks.ts';
import { round } from './normalize.ts';
import type {
  CheckStatus,
  PortfolioLevelMetrics,
  StandardBenchmark,
} from './types.ts';

export function buildStandardsBenchmarks(
  portfolio: PortfolioLevelMetrics,
): StandardBenchmark[] {
  const items: StandardBenchmark[] = [];

  // IFMA — density (rentable SF per employee)
  {
    const v = portfolio.rentable_sf_per_employee;
    let status: CheckStatus = 'pass';
    let note = `Near the IFMA benchmark of ~${IFMA_DENSITY.target} SF/employee.`;
    if (v === 0) {
      status = 'warning';
      note = 'Add on-site headcount to assess density.';
    } else if (v > IFMA_DENSITY.failAbove) {
      status = 'fail';
      note = `Well above ${IFMA_DENSITY.target} SF/employee — likely over-spaced.`;
    } else if (v > IFMA_DENSITY.warnAbove) {
      status = 'warning';
      note = `Above the ${IFMA_DENSITY.target} SF/employee benchmark — room to consolidate.`;
    } else if (v < IFMA_DENSITY.warnBelow) {
      status = 'warning';
      note = `Below ${IFMA_DENSITY.warnBelow} SF/employee — densely packed.`;
    }
    items.push({
      standard: 'IFMA',
      metric: 'Density (rentable SF per employee)',
      value: round(v),
      unit: 'SF/employee',
      benchmark: `${IFMA_DENSITY.target} SF/employee (default)`,
      status,
      note,
    });
  }

  // IFMA — utilization
  {
    const v = portfolio.portfolio_average_utilization_rate;
    const status: CheckStatus =
      v === 0
        ? 'warning'
        : v < IFMA_UTILIZATION.failBelow
          ? 'fail'
          : v < IFMA_UTILIZATION.warnBelow
            ? 'warning'
            : 'pass';
    items.push({
      standard: 'IFMA',
      metric: 'Workspace utilization',
      value: round(v),
      unit: '%',
      benchmark: `≥ ${IFMA_UTILIZATION.healthyMin}% healthy`,
      status,
      note:
        v === 0
          ? 'Add occupancy data to measure utilization.'
          : status === 'pass'
            ? 'Healthy desk utilization.'
            : 'Under-utilized — candidate for right-sizing or sublease.',
    });
  }

  // BOMA — load factor (rentable ÷ usable)
  {
    const v = portfolio.average_load_factor;
    let status: CheckStatus = 'pass';
    let note = `At or below the typical ${BOMA_LOAD_FACTOR.typical} add-on factor.`;
    if (v === 0) {
      status = 'warning';
      note = 'Add usable SF to each property to compute the BOMA load factor.';
    } else if (v > BOMA_LOAD_FACTOR.flagAbove) {
      status = 'fail';
      note = `Load factor ${v} exceeds ${BOMA_LOAD_FACTOR.flagAbove} — high common-area burden.`;
    } else if (v > BOMA_LOAD_FACTOR.warnAbove) {
      status = 'warning';
      note = `Slightly above the typical ${BOMA_LOAD_FACTOR.typical} add-on factor.`;
    }
    items.push({
      standard: 'BOMA',
      metric: 'Load factor (rentable ÷ usable)',
      value: round(v, 3),
      unit: '×',
      benchmark: `≤ ${BOMA_LOAD_FACTOR.typical} typical`,
      status,
      note,
    });
  }

  // BOMA — operating expense intensity ($/SF/yr) excluding base rent
  {
    const opex = portfolio.operating_cost_breakdown;
    const opexTotal =
      opex.cams + opex.utilities + opex.parking + opex.property_tax +
      opex.insurance + opex.janitorial + opex.other;
    const perSf = portfolio.total_portfolio_sf > 0 ? opexTotal / portfolio.total_portfolio_sf : 0;
    const status: CheckStatus =
      perSf === 0
        ? 'warning'
        : perSf > BOMA_OPEX_REFERENCE.maxPerSf
          ? 'warning'
          : 'pass';
    items.push({
      standard: 'BOMA',
      metric: 'Operating expenses (ex-rent) per SF',
      value: round(perSf),
      unit: '$/SF/yr',
      benchmark: `$${BOMA_OPEX_REFERENCE.minPerSf}–${BOMA_OPEX_REFERENCE.maxPerSf}/SF typical`,
      status,
      note:
        perSf === 0
          ? 'Add CAM/utilities/tax/insurance to benchmark operating expenses.'
          : status === 'pass'
            ? 'Operating expenses in the typical office range.'
            : 'Operating expenses above the typical office range.',
    });
  }

  // CoStar — fully-loaded occupancy cost per SF vs. market tier target
  {
    const v = portfolio.fully_loaded_cost_per_sf;
    const target = portfolio.cost_per_sf_total > 0 && portfolio.benchmark_variance_percent !== 0
      ? round(portfolio.cost_per_sf_total / (1 + portfolio.benchmark_variance_percent / 100))
      : 0;
    const variance = target > 0 ? ((v - target) / target) * 100 : 0;
    const status: CheckStatus =
      target === 0 ? 'warning' : variance > 30 ? 'fail' : variance > 10 ? 'warning' : 'pass';
    items.push({
      standard: 'CoStar',
      metric: 'Fully-loaded occupancy cost per SF',
      value: round(v),
      unit: '$/SF/yr',
      benchmark: target > 0 ? `~$${target}/SF market target` : 'set market tier to compare',
      status,
      note:
        target === 0
          ? 'Set each property’s market tier to compare against CoStar-style benchmarks.'
          : status === 'pass'
            ? 'In line with the market cost benchmark.'
            : `${round(variance)}% vs. the market cost benchmark.`,
    });
  }

  return items;
}
