// Load a portfolio and its children from Supabase into the engine's PortfolioInput.
// RLS on the passed client guarantees only the caller's client data is returned.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortfolioInput } from '../../../engine/domain.ts';

export interface LoadedPortfolio {
  clientId: string;
  input: PortfolioInput;
}

export async function loadPortfolioInput(
  supabase: SupabaseClient,
  portfolioId: string,
): Promise<LoadedPortfolio | null> {
  const { data: portfolio, error: pErr } = await supabase
    .from('portfolios')
    .select('id, name, client_id')
    .eq('id', portfolioId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!portfolio) return null;

  const { data: properties, error: propErr } = await supabase
    .from('properties')
    .select('*')
    .eq('portfolio_id', portfolioId);
  if (propErr) throw propErr;

  const propertyIds = (properties ?? []).map((p) => p.id);
  const [leasesRes, occRes, spaceRes] = await Promise.all([
    supabase.from('leases').select('*').in('property_id', propertyIds),
    supabase.from('occupancy_records').select('*').in('property_id', propertyIds),
    supabase.from('space_breakdowns').select('*').in('property_id', propertyIds),
  ]);
  if (leasesRes.error) throw leasesRes.error;
  if (occRes.error) throw occRes.error;
  if (spaceRes.error) throw spaceRes.error;

  const leasesByProp = groupBy(leasesRes.data ?? [], 'property_id');
  const occByProp = groupBy(occRes.data ?? [], 'property_id');
  const spaceByProp = groupBy(spaceRes.data ?? [], 'property_id');

  const input: PortfolioInput = {
    id: portfolio.id,
    name: portfolio.name,
    properties: (properties ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      state: p.state,
      propertyType: p.property_type,
      totalRentableSf: p.total_rentable_sf,
      totalUsableSf: p.total_usable_sf,
      headcountOnSite: p.headcount_on_site,
      occupancyRatePercent: p.occupancy_rate_percent,
      marketTier: p.market_tier,
      leases: (leasesByProp[p.id] ?? []).map((l) => ({
        id: l.id,
        leaseStartDate: new Date(l.lease_start_date),
        leaseEndDate: new Date(l.lease_end_date),
        leaseType: l.lease_type,
        annualRent: l.annual_rent,
        camsAnnual: l.cams_annual,
        otherAnnualCosts: l.other_annual_costs,
        hasBreakClause: l.has_break_clause,
        breakDate: l.break_date ? new Date(l.break_date) : null,
        breakPenaltyType: l.break_penalty_type,
        breakPenaltyAmount: l.break_penalty_amount,
      })),
      occupancy: (occByProp[p.id] ?? []).map((o) => ({
        id: o.id,
        dataSource: o.data_source,
        measurementDate: new Date(o.measurement_date),
        occupiedDesks: o.occupied_desks,
        totalDesksAvailable: o.total_desks_available,
        occupancyRatePercent: o.occupancy_rate_percent,
        averageOccupancyRatePercent: o.average_occupancy_rate_percent,
      })),
      spaces: (spaceByProp[p.id] ?? []).map((s) => ({
        id: s.id,
        spaceType: s.space_type,
        allocatedSf: s.allocated_sf,
        allocatedHeadcount: s.allocated_headcount,
        utilizationRatePercent: s.utilization_rate_percent,
      })),
    })),
  };

  return { clientId: portfolio.client_id, input };
}

function groupBy<T extends Record<string, any>>(
  rows: T[],
  key: keyof T,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const row of rows) {
    const k = String(row[key]);
    (out[k] ??= []).push(row);
  }
  return out;
}
