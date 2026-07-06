// Financial opportunity identification (brief §4.4) and ranking (brief §5.2 step 5).

import { OPPORTUNITY_PARAMS, THRESHOLDS } from './benchmarks.ts';
import {
  hasGrossLease,
  maxLeaseYearsRemaining,
  type PropertyInput,
} from './domain.ts';
import { round, withinProximity } from './normalize.ts';
import type { PropertyComputation } from './metrics.ts';
import type { ConfidenceLevel, FinancialOpportunity } from './types.ts';

/** Early-exit penalty to break a property's lease as of a reference date. */
function breakPenalty(property: PropertyInput, asOf: Date): number {
  let penalty = 0;
  for (const lease of property.leases) {
    if (!lease.hasBreakClause) continue;
    const amount = lease.breakPenaltyAmount ?? 0;
    if (lease.breakPenaltyType === 'fixed_amount') {
      penalty += amount;
    } else if (lease.breakPenaltyType === 'percentage_of_remaining') {
      const yearsRemaining = Math.max(
        0,
        (lease.leaseEndDate.getTime() - asOf.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      );
      penalty += (amount / 100) * lease.annualRent * yearsRemaining;
    }
  }
  return penalty;
}

function paybackMonths(implementationCost: number, annualSavings: number): number {
  if (annualSavings <= 0) return Infinity;
  return round((implementationCost / annualSavings) * 12, 1);
}

export function identifyOpportunities(
  computations: PropertyComputation[],
  asOf: Date = new Date(),
): FinancialOpportunity[] {
  const opportunities: FinancialOpportunity[] = [];
  const totalHeadcount = computations.reduce(
    (s, c) => s + c.input.headcountOnSite,
    0,
  );
  const totalCost = computations.reduce((s, c) => s + c.annualCost, 0);

  // --- Consolidation (brief §4.4) ---------------------------------------
  for (let i = 0; i < computations.length; i++) {
    for (let j = i + 1; j < computations.length; j++) {
      const a = computations[i];
      const b = computations[j];
      if (!withinProximity(a.input, b.input)) continue;

      const combinedHeadcount = a.input.headcountOnSite + b.input.headcountOnSite;
      const combinedCost = a.annualCost + b.annualCost;
      const headcountShare =
        totalHeadcount > 0 ? combinedHeadcount / totalHeadcount : 0;
      const costShare = totalCost > 0 ? combinedCost / totalCost : 0;

      if (
        headcountShare < OPPORTUNITY_PARAMS.consolidation.combinedHeadcountShareMax &&
        costShare > OPPORTUNITY_PARAMS.consolidation.combinedCostShareMin
      ) {
        // Eliminate the lower-cost (cheaper to exit) property; move its people
        // into the retained one. Savings = the eliminated ongoing cost.
        const [eliminated, retained] =
          a.annualCost <= b.annualCost ? [a, b] : [b, a];
        const migration =
          eliminated.annualCost *
          OPPORTUNITY_PARAMS.consolidation.migrationCostFactor;
        const penalty = breakPenalty(eliminated.input, asOf);
        const implementationCost = round(migration + penalty);
        const savings = round(eliminated.annualCost);
        opportunities.push({
          opportunity_id: `consolidate-${eliminated.input.id}-into-${retained.input.id}`,
          property_id: eliminated.input.id,
          opportunity_type: 'consolidate_properties',
          description: `Consolidate ${eliminated.metrics.property_name} into ${retained.metrics.property_name} (same market, combined headcount is ${round(headcountShare * 100)}% of portfolio).`,
          estimated_annual_savings: savings,
          implementation_cost: implementationCost,
          payback_months: paybackMonths(implementationCost, savings),
          confidence_level: penalty > 0 ? 'medium' : 'high',
          lease_implications:
            penalty > 0
              ? `Estimated lease break cost ~$${round(penalty).toLocaleString()} included in implementation cost.`
              : 'No break clause on the eliminated property; verify holdover/assignment terms.',
        });
      }
    }
  }

  // --- Per-property opportunities ---------------------------------------
  const avgCostPerSf =
    computations.length > 0
      ? computations.reduce((s, c) => s + c.metrics.cost_per_sf, 0) /
        computations.length
      : 0;

  for (const c of computations) {
    const p = c.input;
    const occupancy = c.metrics.occupancy_rate;
    const yearsRemaining = maxLeaseYearsRemaining(p, asOf);
    const gross = hasGrossLease(p);

    // Sublease excess (brief §4.4)
    if (
      c.hasOccupancyData &&
      occupancy < OPPORTUNITY_PARAMS.sublease.occupancyBelow &&
      gross &&
      yearsRemaining > OPPORTUNITY_PARAMS.sublease.minLeaseYearsRemaining
    ) {
      const excessSf = Math.round(p.totalRentableSf * (1 - occupancy / 100));
      const marketRatePerSf = c.metrics.cost_per_sf; // own rent PSF as MVP proxy
      const grossRevenue = excessSf * marketRatePerSf;
      const brokerFees =
        grossRevenue * OPPORTUNITY_PARAMS.sublease.excessBrokerFeeShare;
      const savings = round(grossRevenue - brokerFees);
      const implementationCost = round(brokerFees);
      opportunities.push({
        opportunity_id: `sublease-${p.id}`,
        property_id: p.id,
        opportunity_type: 'sublease_excess',
        description: `Sublease ~${excessSf.toLocaleString()} SF of excess space at ${c.metrics.property_name} (occupancy ${round(occupancy)}%).`,
        estimated_annual_savings: savings,
        implementation_cost: implementationCost,
        payback_months: paybackMonths(implementationCost, savings),
        confidence_level: 'medium',
        lease_implications: `Gross lease with ${round(yearsRemaining, 1)} yrs remaining; confirm sublease rights with landlord.`,
      });
    }

    // Space-mix adjustment (brief §4.4)
    if (
      c.hasSpaceData &&
      c.metrics.drivers.space_mix_alignment >
        OPPORTUNITY_PARAMS.spaceMix.privateOfficeShareAbove &&
      c.hasOccupancyData &&
      occupancy < OPPORTUNITY_PARAMS.spaceMix.occupancyBelow
    ) {
      const annualUtilities =
        c.annualCost * OPPORTUNITY_PARAMS.spaceMix.assumedUtilitiesShareOfCost;
      const savings = round(
        annualUtilities * OPPORTUNITY_PARAMS.spaceMix.utilitiesSavingsShare,
      );
      const thresholdSf =
        (OPPORTUNITY_PARAMS.spaceMix.privateOfficeShareAbove / 100) *
        c.totalAllocatedSf;
      const excessOfficeSf = Math.max(
        0,
        Math.round(c.spaceSfByType.private_office - thresholdSf),
      );
      const implementationCost = round(excessOfficeSf * 15); // ~$15/SF reconfiguration
      opportunities.push({
        opportunity_id: `spacemix-${p.id}`,
        property_id: p.id,
        opportunity_type: 'adjust_space_mix',
        description: `Convert excess private offices (~${excessOfficeSf.toLocaleString()} SF) to collaborative space at ${c.metrics.property_name}.`,
        estimated_annual_savings: savings,
        implementation_cost: implementationCost,
        payback_months: paybackMonths(implementationCost, savings),
        confidence_level: 'low',
        lease_implications: 'Interior reconfiguration; confirm alteration rights in lease.',
      });
    }

    // Lease renegotiation (brief §4.4)
    if (
      c.hasCostData &&
      avgCostPerSf > 0 &&
      c.metrics.cost_per_sf >
        avgCostPerSf *
          (1 + OPPORTUNITY_PARAMS.renegotiation.costAboveComparablePercent / 100) &&
      gross &&
      yearsRemaining > OPPORTUNITY_PARAMS.renegotiation.minLeaseYearsRemaining
    ) {
      const annualRent = p.leases.reduce((s, l) => s + l.annualRent, 0);
      const savings = round(
        annualRent * OPPORTUNITY_PARAMS.renegotiation.rentReductionShare,
      );
      opportunities.push({
        opportunity_id: `renegotiate-${p.id}`,
        property_id: p.id,
        opportunity_type: 'renegotiate_lease',
        description: `Renegotiate rent at ${c.metrics.property_name}: cost/SF ($${round(c.metrics.cost_per_sf)}) is >30% above portfolio average ($${round(avgCostPerSf)}).`,
        estimated_annual_savings: savings,
        implementation_cost: 0,
        payback_months: 0,
        confidence_level: 'medium' as ConfidenceLevel,
        lease_implications: `Gross lease with ${round(yearsRemaining, 1)} yrs remaining; leverage renewal timing.`,
      });
    }
  }

  // Rank by savings-to-implementation ratio, then by absolute savings (brief §5.2 step 5).
  return opportunities.sort((x, y) => {
    const rx = x.implementation_cost > 0 ? x.estimated_annual_savings / x.implementation_cost : Infinity;
    const ry = y.implementation_cost > 0 ? y.estimated_annual_savings / y.implementation_cost : Infinity;
    if (rx !== ry) return ry - rx;
    return y.estimated_annual_savings - x.estimated_annual_savings;
  });
}

export { THRESHOLDS };
