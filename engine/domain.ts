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
  // Recurring operating costs (annual $)
  utilitiesAnnual?: number | null;
  parkingAnnual?: number | null;
  propertyTaxAnnual?: number | null;
  insuranceAnnual?: number | null;
  janitorialAnnual?: number | null;
  // One-time / capital costs ($)
  tenantImprovementCost?: number | null;
  tenantImprovementAllowance?: number | null;
  furnitureFfeCost?: number | null;
  constructionBuildoutCost?: number | null;
  movingCost?: number | null;
  otherOneTimeCosts?: number | null;
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

const n = (x?: number | null): number => x ?? 0;

/** Recurring operating cost of a single lease, annual $ (rent + CAM + utilities + …). */
export function leaseOperatingAnnual(l: LeaseInput): number {
  return (
    n(l.annualRent) +
    n(l.camsAnnual) +
    n(l.utilitiesAnnual) +
    n(l.parkingAnnual) +
    n(l.propertyTaxAnnual) +
    n(l.insuranceAnnual) +
    n(l.janitorialAnnual) +
    n(l.otherAnnualCosts)
  );
}

/** Net one-time capital of a lease = capital spend − landlord TI allowance ($). */
export function leaseCapitalNet(l: LeaseInput): number {
  const spend =
    n(l.tenantImprovementCost) +
    n(l.furnitureFfeCost) +
    n(l.constructionBuildoutCost) +
    n(l.movingCost) +
    n(l.otherOneTimeCosts);
  return spend - n(l.tenantImprovementAllowance);
}

/** Whole-ish years of the lease term (minimum 1, to avoid divide-by-zero). */
export function leaseTermYears(l: LeaseInput): number {
  const years =
    (l.leaseEndDate.getTime() - l.leaseStartDate.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(1, years);
}

/** Net capital amortized straight-line over the lease term, annual $ (floored at 0). */
export function leaseAmortizedCapitalAnnual(l: LeaseInput): number {
  return Math.max(0, leaseCapitalNet(l)) / leaseTermYears(l);
}

/**
 * Total annual *operating* occupancy cost for a property (brief §4.1, extended).
 * Named propertyAnnualCost for continuity — this is the recurring operating cost
 * that drives cost/SF and benchmark variance. Fully-loaded cost (incl. amortized
 * capital) is computed separately in the metrics layer.
 */
export function propertyAnnualCost(property: PropertyInput): number {
  return property.leases.reduce((sum, l) => sum + leaseOperatingAnnual(l), 0);
}

/** Amortized one-time capital across a property's leases, annual $. */
export function propertyAmortizedCapitalAnnual(property: PropertyInput): number {
  return property.leases.reduce(
    (sum, l) => sum + leaseAmortizedCapitalAnnual(l),
    0,
  );
}

/** Operating cost broken out by category across a property's leases, annual $. */
export function propertyOperatingBreakdown(property: PropertyInput): {
  rent: number;
  cams: number;
  utilities: number;
  parking: number;
  property_tax: number;
  insurance: number;
  janitorial: number;
  other: number;
} {
  const b = {
    rent: 0,
    cams: 0,
    utilities: 0,
    parking: 0,
    property_tax: 0,
    insurance: 0,
    janitorial: 0,
    other: 0,
  };
  for (const l of property.leases) {
    b.rent += n(l.annualRent);
    b.cams += n(l.camsAnnual);
    b.utilities += n(l.utilitiesAnnual);
    b.parking += n(l.parkingAnnual);
    b.property_tax += n(l.propertyTaxAnnual);
    b.insurance += n(l.insuranceAnnual);
    b.janitorial += n(l.janitorialAnnual);
    b.other += n(l.otherAnnualCosts);
  }
  return b;
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
