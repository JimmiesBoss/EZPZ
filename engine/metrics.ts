// Core metric calculations (brief §4.1).
//
// computeProperty() produces both the public PropertyLevelMetrics (brief §3.2)
// and an internal PropertyComputation carrying intermediate values (annual cost,
// space breakdown, latest occupancy) so the red-flag and opportunity modules
// don't recompute them.

import { costBenchmarkTarget } from './benchmarks.ts';
import {
  latestOccupancy,
  propertyAnnualCost,
  type OccupancyInput,
  type PropertyInput,
} from './domain.ts';
import { round } from './normalize.ts';
import type {
  SpaceType,
  PortfolioLevelMetrics,
  PropertyLevelMetrics,
  RedFlagStatus,
} from './types.ts';

export interface PropertyComputation {
  input: PropertyInput;
  metrics: PropertyLevelMetrics;
  annualCost: number;
  hasCostData: boolean;
  hasOccupancyData: boolean;
  hasSpaceData: boolean;
  /** Allocated SF summed per space type (0 for types with no breakdown row). */
  spaceSfByType: Record<SpaceType, number>;
  totalAllocatedSf: number;
  occupancy?: OccupancyInput;
}

const EMPTY_SPACE_SF: Record<SpaceType, number> = {
  private_office: 0,
  open_collaborative: 0,
  conference_rooms: 0,
  phone_booths: 0,
  focus_areas: 0,
  amenity_support: 0,
};

/**
 * Utilization rate (brief §4.1): desk occupancy, with graceful degradation.
 * Returns null when no basis at all is available.
 */
export function utilizationRate(property: PropertyInput): number | null {
  const occ = latestOccupancy(property);
  if (occ && occ.totalDesksAvailable > 0) {
    // Prefer measured desk occupancy; fall back to headcount vs. desks.
    if (occ.occupiedDesks > 0) {
      return (occ.occupiedDesks / occ.totalDesksAvailable) * 100;
    }
    if (property.headcountOnSite > 0) {
      return (property.headcountOnSite / occ.totalDesksAvailable) * 100;
    }
  }
  // No desk data — use occupancy_rate_percent as a proxy (brief §4.1).
  if (property.occupancyRatePercent != null) return property.occupancyRatePercent;
  if (occ && occ.occupancyRatePercent != null) return occ.occupancyRatePercent;
  return null;
}

/** Occupancy rate (brief §4.1): headcount vs. seats, or a measured/sensor rate. */
export function occupancyRate(property: PropertyInput): number | null {
  const occ = latestOccupancy(property);
  if (occ) {
    if (occ.occupancyRatePercent != null) return occ.occupancyRatePercent;
    if (occ.totalDesksAvailable > 0) {
      return (property.headcountOnSite / occ.totalDesksAvailable) * 100;
    }
  }
  if (property.occupancyRatePercent != null) return property.occupancyRatePercent;
  return null;
}

function spaceBreakdown(property: PropertyInput): {
  byType: Record<SpaceType, number>;
  total: number;
} {
  const byType: Record<SpaceType, number> = { ...EMPTY_SPACE_SF };
  let total = 0;
  for (const s of property.spaces) {
    byType[s.spaceType] += s.allocatedSf;
    total += s.allocatedSf;
  }
  return { byType, total };
}

function classify(
  utilization: number | null,
  hasCostData: boolean,
): RedFlagStatus {
  if (utilization == null && !hasCostData) return 'insufficient_data';
  if (utilization == null) return 'insufficient_data';
  if (utilization < 70) return 'underutilized';
  if (utilization > 95) return 'overutilized';
  return 'acceptable';
}

export function computeProperty(property: PropertyInput): PropertyComputation {
  const annualCost = propertyAnnualCost(property);
  const sf = property.totalRentableSf;
  const headcount = property.headcountOnSite;
  const hasCostData = property.leases.length > 0 && annualCost > 0;

  const costPerSf = sf > 0 ? annualCost / sf : 0;
  const costPerSfPerEmployee = sf > 0 && headcount > 0 ? costPerSf / headcount : 0;

  const benchmarkTarget = costBenchmarkTarget(property.marketTier);
  const varianceFromBenchmark =
    benchmarkTarget > 0 && costPerSfPerEmployee > 0
      ? ((costPerSfPerEmployee - benchmarkTarget) / benchmarkTarget) * 100
      : 0;

  const util = utilizationRate(property);
  const occ = occupancyRate(property);
  const { byType, total: totalAllocatedSf } = spaceBreakdown(property);

  const privateOfficeShare =
    totalAllocatedSf > 0 ? (byType.private_office / totalAllocatedSf) * 100 : 0;

  const metrics: PropertyLevelMetrics = {
    property_id: property.id,
    property_name: property.name,
    sf,
    annual_cost: round(annualCost),
    cost_per_sf: round(costPerSf),
    headcount_on_site: headcount,
    cost_per_sf_per_employee: round(costPerSfPerEmployee, 4),
    occupancy_rate: round(occ ?? 0),
    utilization_rate: round(util ?? 0),
    benchmark_target_cost_per_sf_per_employee: benchmarkTarget,
    variance_from_benchmark: round(varianceFromBenchmark),
    red_flag_status: classify(util, hasCostData),
    drivers: {
      utilization_level: round(util ?? 0),
      cost_efficiency: round(varianceFromBenchmark),
      space_mix_alignment: round(privateOfficeShare),
    },
  };

  return {
    input: property,
    metrics,
    annualCost,
    hasCostData,
    hasOccupancyData: util != null,
    hasSpaceData: property.spaces.length > 0,
    spaceSfByType: byType,
    totalAllocatedSf,
    occupancy: latestOccupancy(property),
  };
}

/** Aggregate portfolio-level metrics (brief §4.1, §5.2 step 3). */
export function computePortfolioMetrics(
  computations: PropertyComputation[],
): PortfolioLevelMetrics {
  const totalSf = computations.reduce((s, c) => s + c.input.totalRentableSf, 0);
  const totalCost = computations.reduce((s, c) => s + c.annualCost, 0);
  const totalHeadcount = computations.reduce(
    (s, c) => s + c.input.headcountOnSite,
    0,
  );

  const costPerSfTotal = totalSf > 0 ? totalCost / totalSf : 0;
  const costPerSfPerEmployee =
    totalSf > 0 && totalHeadcount > 0 ? costPerSfTotal / totalHeadcount : 0;

  // Simple average across properties that have a value (brief §4.1 explicit formula).
  const occValues = computations
    .map((c) => c.metrics.occupancy_rate)
    .filter((_, i) => computations[i].occupancy != null || computations[i].input.occupancyRatePercent != null);
  const utilValues = computations
    .filter((c) => c.hasOccupancyData)
    .map((c) => c.metrics.utilization_rate);

  const avgOccupancy =
    occValues.length > 0
      ? occValues.reduce((s, v) => s + v, 0) / occValues.length
      : 0;
  const avgUtilization =
    utilValues.length > 0
      ? utilValues.reduce((s, v) => s + v, 0) / utilValues.length
      : 0;

  // Headcount-weighted benchmark target so mixed-tier portfolios compare fairly.
  const weightedTarget =
    totalHeadcount > 0
      ? computations.reduce(
          (s, c) =>
            s +
            c.metrics.benchmark_target_cost_per_sf_per_employee *
              c.input.headcountOnSite,
          0,
        ) / totalHeadcount
      : 0;
  const benchmarkVariance =
    weightedTarget > 0 && costPerSfPerEmployee > 0
      ? ((costPerSfPerEmployee - weightedTarget) / weightedTarget) * 100
      : 0;

  return {
    total_portfolio_sf: round(totalSf),
    total_portfolio_annual_cost: round(totalCost),
    cost_per_sf_total: round(costPerSfTotal),
    total_headcount: totalHeadcount,
    cost_per_sf_per_employee: round(costPerSfPerEmployee, 4),
    portfolio_average_occupancy_rate: round(avgOccupancy),
    portfolio_average_utilization_rate: round(avgUtilization),
    benchmark_variance_percent: round(benchmarkVariance),
  };
}

/**
 * Data completeness (brief §5.2 step 1): mean across properties of the share of
 * the three key data categories present — cost (leases), occupancy, space mix.
 */
export function dataCompletenessPercent(
  computations: PropertyComputation[],
): number {
  if (computations.length === 0) return 0;
  const perProperty = computations.map((c) => {
    let have = 0;
    if (c.hasCostData) have += 1;
    if (c.hasOccupancyData) have += 1;
    if (c.hasSpaceData) have += 1;
    return have / 3;
  });
  const mean =
    perProperty.reduce((s, v) => s + v, 0) / perProperty.length;
  return round(mean * 100);
}
