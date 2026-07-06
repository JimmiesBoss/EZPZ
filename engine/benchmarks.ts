// Embedded industry benchmark lookup tables (brief §4.2).
// IFMA / CoStar baseline values, isolated so the engine stays consistent and
// Phase-2 region tuning is a one-file change.

import type { MarketTier, SpaceType } from './types.ts';

/** SF per employee benchmarks by workplace profile (brief §4.2). */
export const SF_PER_EMPLOYEE = {
  open_collaborative: { min: 100, max: 125 },
  balanced_hybrid: { min: 125, max: 175 },
  focus_heavy: { min: 150, max: 225 },
  /** MVP default for general office. */
  default: 150,
} as const;

/**
 * Cost per SF per employee ($/yr) benchmark targets by market tier (brief §4.2).
 * The target is the midpoint of each published range; the range is retained for context.
 */
export const COST_PER_SF_PER_EMPLOYEE: Record<
  MarketTier,
  { min: number; max: number; target: number }
> = {
  tier1: { min: 25, max: 35, target: 30 },
  tier2: { min: 18, max: 25, target: 21.5 },
  tier3: { min: 12, max: 18, target: 15 },
};

/** MVP default when a property's market tier is unspecified (brief §4.2). */
export const DEFAULT_COST_PER_SF_PER_EMPLOYEE_TARGET = 20;

/**
 * BOMA load factor (rentable ÷ usable SF, a.k.a. add-on / core factor).
 * Typical office is ~1.10–1.18; above ~1.20 the tenant pays for a lot of
 * common area relative to usable space.
 */
export const BOMA_LOAD_FACTOR = { typical: 1.15, warnAbove: 1.15, flagAbove: 1.2 } as const;

/** IFMA density — rentable SF per employee. Mirrors SF_PER_EMPLOYEE.default. */
export const IFMA_DENSITY = {
  target: 150,
  // Outside this band the space is unusually generous (high) or dense (low).
  warnAbove: 225,
  failAbove: 300,
  warnBelow: 90,
} as const;

/** BOMA-style fully-loaded office operating expense reference, $/SF/yr (context only). */
export const BOMA_OPEX_REFERENCE = { minPerSf: 8, maxPerSf: 16 } as const;

/** Utilization health (IFMA), reused from the meeting/desk thresholds. */
export const IFMA_UTILIZATION = { healthyMin: 70, warnBelow: 70, failBelow: 50 } as const;

export function costBenchmarkTarget(tier?: string | null): number {
  if (tier && tier in COST_PER_SF_PER_EMPLOYEE) {
    return COST_PER_SF_PER_EMPLOYEE[tier as MarketTier].target;
  }
  return DEFAULT_COST_PER_SF_PER_EMPLOYEE_TARGET;
}

/** Meeting-room utilization benchmark (brief §4.2). */
export const MEETING_ROOM_UTILIZATION = {
  healthyMin: 40,
  healthyMax: 60,
  flagBelow: 30,
  flagAbove: 80,
} as const;

/** Support-space allocation as % of total usable SF (brief §4.2). */
export const SUPPORT_SPACE_ALLOCATION = {
  storage_filing: { min: 1.5, max: 3.5 },
  conference_meeting: { min: 8, max: 12 },
  phone_booths_focus: { min: 2, max: 4 },
  break_amenity: { min: 3, max: 5 },
} as const;

/**
 * Space types that count as "support" space for the redundancy check (brief §4.3 #5).
 * Combined excess threshold is >7% of total SF.
 */
export const SUPPORT_SPACE_TYPES: SpaceType[] = [
  'conference_rooms',
  'phone_booths',
  'focus_areas',
  'amenity_support',
];
export const SUPPORT_SPACE_EXCESS_THRESHOLD_PERCENT = 7;

/** Red-flag checklist thresholds (brief §4.3). */
export const THRESHOLDS = {
  utilization: { warningBelow: 70, failBelow: 50 },
  costEfficiencyFailRatio: 1.3, // >130% of benchmark
  headcountDeskMismatchPercent: 20,
  geographicConcentrationPercent: 60,
  leaseLockInYears: 5,
  privateOfficeShareMax: 50,
  occupancyVariancePercent: 40,
  costVariancePercent: 50,
} as const;

/** Opportunity-identification tunables (brief §4.4). */
export const OPPORTUNITY_PARAMS = {
  consolidation: {
    combinedHeadcountShareMax: 0.6, // combined <60% of portfolio headcount
    combinedCostShareMin: 0.08, // combined >8% of portfolio cost
    withinMiles: 15,
    migrationCostFactor: 0.5, // migration cost ~= 50% of the absorbed property's annual cost
  },
  sublease: {
    occupancyBelow: 50,
    minLeaseYearsRemaining: 2,
    excessBrokerFeeShare: 0.175, // 15–20% of sublease revenue, midpoint
  },
  spaceMix: {
    privateOfficeShareAbove: 50,
    occupancyBelow: 70,
    utilitiesSavingsShare: 0.125, // 10–15% of annual utilities, midpoint
    assumedUtilitiesShareOfCost: 0.1, // utilities ~= 10% of annual occupancy cost (MVP proxy)
  },
  renegotiation: {
    costAboveComparablePercent: 30,
    minLeaseYearsRemaining: 1,
    rentReductionShare: 0.15, // 10–20% conservative, midpoint
  },
} as const;
