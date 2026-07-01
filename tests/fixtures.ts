import type {
  LeaseInput,
  OccupancyInput,
  PortfolioInput,
  PropertyInput,
  SpaceInput,
} from '../engine/domain.ts';

export const AS_OF = new Date('2026-01-01T00:00:00Z');

export function lease(partial: Partial<LeaseInput> = {}): LeaseInput {
  return {
    id: partial.id ?? 'lease-1',
    leaseStartDate: partial.leaseStartDate ?? new Date('2022-01-01'),
    leaseEndDate: partial.leaseEndDate ?? new Date('2031-01-01'),
    leaseType: partial.leaseType ?? 'gross',
    annualRent: partial.annualRent ?? 100000,
    camsAnnual: partial.camsAnnual ?? 0,
    otherAnnualCosts: partial.otherAnnualCosts ?? 0,
    hasBreakClause: partial.hasBreakClause ?? false,
    breakDate: partial.breakDate ?? null,
    breakPenaltyType: partial.breakPenaltyType ?? null,
    breakPenaltyAmount: partial.breakPenaltyAmount ?? null,
  };
}

export function occupancy(partial: Partial<OccupancyInput> = {}): OccupancyInput {
  return {
    id: partial.id ?? 'occ-1',
    dataSource: partial.dataSource ?? 'badge_access',
    measurementDate: partial.measurementDate ?? new Date('2025-12-01'),
    occupiedDesks: partial.occupiedDesks ?? 40,
    totalDesksAvailable: partial.totalDesksAvailable ?? 50,
    occupancyRatePercent: partial.occupancyRatePercent ?? null,
    averageOccupancyRatePercent: partial.averageOccupancyRatePercent ?? null,
  };
}

export function space(partial: Partial<SpaceInput> = {}): SpaceInput {
  return {
    id: partial.id ?? 'space-1',
    spaceType: partial.spaceType ?? 'open_collaborative',
    allocatedSf: partial.allocatedSf ?? 1000,
    allocatedHeadcount: partial.allocatedHeadcount ?? 20,
    utilizationRatePercent: partial.utilizationRatePercent ?? null,
  };
}

export function property(partial: Partial<PropertyInput> = {}): PropertyInput {
  return {
    id: partial.id ?? 'prop-1',
    name: partial.name ?? 'Property 1',
    city: partial.city ?? 'San Francisco',
    state: partial.state ?? 'CA',
    propertyType: partial.propertyType ?? 'leased',
    totalRentableSf: partial.totalRentableSf ?? 10000,
    totalUsableSf: partial.totalUsableSf ?? null,
    headcountOnSite: partial.headcountOnSite ?? 50,
    occupancyRatePercent: partial.occupancyRatePercent ?? null,
    marketTier: partial.marketTier ?? null,
    leases: partial.leases ?? [lease()],
    occupancy: partial.occupancy ?? [occupancy()],
    spaces: partial.spaces ?? [],
  };
}

/** Multi-property portfolio that exercises consolidation + sublease opportunities. */
export function samplePortfolio(): PortfolioInput {
  return {
    id: 'pf-1',
    name: 'Acme Corp Portfolio',
    properties: [
      property({
        id: 'hq',
        name: 'HQ Tower',
        city: 'San Francisco',
        marketTier: 'tier1',
        totalRentableSf: 50000,
        headcountOnSite: 200,
        leases: [lease({ id: 'l-hq', annualRent: 2000000, camsAnnual: 400000 })],
        occupancy: [
          occupancy({ id: 'o-hq', occupiedDesks: 190, totalDesksAvailable: 220 }),
        ],
        spaces: [
          space({ spaceType: 'private_office', allocatedSf: 20000 }),
          space({ spaceType: 'open_collaborative', allocatedSf: 25000 }),
          space({ spaceType: 'conference_rooms', allocatedSf: 5000, utilizationRatePercent: 50 }),
        ],
      }),
      property({
        id: 'annex1',
        name: 'SF Annex 1',
        city: 'San Francisco',
        marketTier: 'tier1',
        totalRentableSf: 12000,
        headcountOnSite: 25,
        leases: [lease({ id: 'l-a1', leaseType: 'gross', annualRent: 700000 })],
        occupancy: [
          occupancy({ id: 'o-a1', occupiedDesks: 25, totalDesksAvailable: 120 }),
        ],
      }),
      property({
        id: 'annex2',
        name: 'SF Annex 2',
        city: 'San Francisco',
        marketTier: 'tier1',
        totalRentableSf: 10000,
        headcountOnSite: 20,
        leases: [lease({ id: 'l-a2', leaseType: 'gross', annualRent: 600000 })],
        occupancy: [
          occupancy({ id: 'o-a2', occupiedDesks: 20, totalDesksAvailable: 100 }),
        ],
      }),
    ],
  };
}
