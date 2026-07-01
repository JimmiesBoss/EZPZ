// Plain input shapes the calculation engine operates on. Kept independent of any
// database client so the engine is pure and unit-testable with hand-built fixtures.

import type {
  LeaseType,
  OccupancySource,
  PropertyType,
  SpaceType,
} from './types.ts';

export interface LeaseInput {
  id: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  leaseType: LeaseType;
  annualRent: number;
  camsAnnual?: number | null;
  otherAnnualCosts?: number | null;
  hasBreakClause?: boolean;
  breakDate?: Date | null;
  breakPenaltyType?: string | null;
  breakPenaltyAmount?: number | null;
}

export interface OccupancyInput {
  id: string;
  dataSource: OccupancySource;
  measurementDate: Date;
  occupiedDesks: number;
  totalDesksAvailable: number;
  occupancyRatePercent?: number | null;
  averageOccupancyRatePercent?: number | null;
}

export interface SpaceInput {
  id: string;
  spaceType: SpaceType;
  allocatedSf: number;
  allocatedHeadcount: number;
  utilizationRatePercent?: number | null;
}

export interface PropertyInput {
  id: string;
  name: string;
  city: string;
  state: string;
  propertyType: PropertyType;
  totalRentableSf: number;
  totalUsableSf?: number | null;
  headcountOnSite: number;
  occupancyRatePercent?: number | null;
  marketTier?: string | null;
  leases: LeaseInput[];
  occupancy: OccupancyInput[];
  spaces: SpaceInput[];
}

export interface PortfolioInput {
  id: string;
  name: string;
  properties: PropertyInput[];
}

/** Total annual occupancy cost for a property = sum over leases of rent + CAM + other (brief §4.1). */
export function propertyAnnualCost(property: PropertyInput): number {
  return property.leases.reduce(
    (sum, l) =>
      sum + l.annualRent + (l.camsAnnual ?? 0) + (l.otherAnnualCosts ?? 0),
    0,
  );
}

/** Most recent occupancy record for a property, or undefined. */
export function latestOccupancy(
  property: PropertyInput,
): OccupancyInput | undefined {
  if (property.occupancy.length === 0) return undefined;
  return [...property.occupancy].sort(
    (a, b) => b.measurementDate.getTime() - a.measurementDate.getTime(),
  )[0];
}

/** Whole years remaining on the longest lease from a reference date. */
export function maxLeaseYearsRemaining(
  property: PropertyInput,
  asOf: Date,
): number {
  let max = 0;
  for (const lease of property.leases) {
    const years =
      (lease.leaseEndDate.getTime() - asOf.getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    if (years > max) max = years;
  }
  return max;
}

/** True if any lease at the property is a "gross" lease. */
export function hasGrossLease(property: PropertyInput): boolean {
  return property.leases.some((l) => l.leaseType === 'gross');
}
