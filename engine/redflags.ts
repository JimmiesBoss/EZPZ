// Red-flag checklist engine (brief §4.3).
//
// Each of the 10 items is evaluated per property (or portfolio-wide where the
// check is inherently cross-location) and aggregated to a single item status,
// with per-property detail in sub_items (brief §5.2 step 4).

import {
  MEETING_ROOM_UTILIZATION,
  SUPPORT_SPACE_EXCESS_THRESHOLD_PERCENT,
  SUPPORT_SPACE_TYPES,
  THRESHOLDS,
} from './benchmarks.ts';
import { maxLeaseYearsRemaining } from './domain.ts';
import { round } from './normalize.ts';
import type { PropertyComputation } from './metrics.ts';
import type { CheckStatus, RedFlagChecklistItem } from './types.ts';

const RANK: Record<CheckStatus, number> = { pass: 0, warning: 1, fail: 2 };

function worst(statuses: CheckStatus[]): CheckStatus {
  return statuses.reduce<CheckStatus>(
    (acc, s) => (RANK[s] > RANK[acc] ? s : acc),
    'pass',
  );
}

/**
 * Aggregate per-property statuses into one item status.
 * Fails when a majority (or >=3) of properties fail; warns on any fail/warning.
 */
function aggregate(statuses: CheckStatus[]): CheckStatus {
  if (statuses.length === 0) return 'warning'; // no data to evaluate
  const fails = statuses.filter((s) => s === 'fail').length;
  const majority = Math.ceil(statuses.length / 2);
  if (fails >= 3 || fails >= majority) return 'fail';
  if (statuses.some((s) => s === 'fail' || s === 'warning')) return 'warning';
  return 'pass';
}

function tiered(
  value: number | null,
  failAt: (v: number) => boolean,
  warnAt: (v: number) => boolean,
): CheckStatus {
  if (value == null) return 'warning';
  if (failAt(value)) return 'fail';
  if (warnAt(value)) return 'warning';
  return 'pass';
}

export function buildRedFlagChecklist(
  computations: PropertyComputation[],
): RedFlagChecklistItem[] {
  const items: RedFlagChecklistItem[] = [];
  const n = computations.length;

  // 1. Utilization Rate — <50 fail, <70 warning (brief §4.3 #1).
  {
    const perProp = computations.map((c) => {
      const util = c.hasOccupancyData ? c.metrics.utilization_rate : null;
      const status = tiered(
        util,
        (v) => v < THRESHOLDS.utilization.failBelow,
        (v) => v < THRESHOLDS.utilization.warningBelow,
      );
      return { c, util, status };
    });
    const avg =
      perProp.filter((p) => p.util != null).reduce((s, p) => s + (p.util ?? 0), 0) /
      Math.max(1, perProp.filter((p) => p.util != null).length);
    items.push({
      checklist_item_id: 1,
      category: 'Utilization',
      description: 'Desk occupancy below 70% (warning) or 50% (fail).',
      metric_value: round(avg),
      benchmark_threshold: THRESHOLDS.utilization.warningBelow,
      status: aggregate(perProp.map((p) => p.status)),
      sub_items: perProp.map((p) => ({
        sub_item: `${p.c.metrics.property_name}: ${p.util == null ? 'no data' : round(p.util) + '% utilization'}`,
        status: p.status,
      })),
    });
  }

  // 2. Cost Efficiency — cost/SF/employee >130% of benchmark = fail (brief §4.3 #2).
  {
    const perProp = computations.map((c) => {
      const variance = c.hasCostData ? c.metrics.variance_from_benchmark : null;
      const status = tiered(
        variance,
        (v) => v > 30,
        (v) => v > 10,
      );
      return { c, variance, status };
    });
    items.push({
      checklist_item_id: 2,
      category: 'Cost Efficiency',
      description: 'Cost per SF per employee exceeds 130% of market benchmark.',
      metric_value: round(
        perProp.reduce((s, p) => s + (p.variance ?? 0), 0) / Math.max(1, n),
      ),
      benchmark_threshold: 30,
      status: aggregate(perProp.map((p) => p.status)),
      sub_items: perProp.map((p) => ({
        sub_item: `${p.c.metrics.property_name}: ${p.variance == null ? 'no cost data' : round(p.variance) + '% vs benchmark'}`,
        status: p.status,
      })),
    });
  }

  // 3. Headcount Mismatch — headcount/desk ratio off by >20% (brief §4.3 #3).
  {
    const perProp = computations.map((c) => {
      const desks = c.occupancy?.totalDesksAvailable ?? 0;
      const mismatch =
        desks > 0 ? Math.abs(c.input.headcountOnSite / desks - 1) * 100 : null;
      const status = tiered(
        mismatch,
        (v) => v > 40,
        (v) => v > THRESHOLDS.headcountDeskMismatchPercent,
      );
      return { c, mismatch, status };
    });
    items.push({
      checklist_item_id: 3,
      category: 'Utilization',
      description: 'Headcount-to-desk ratio misaligned by more than 20%.',
      metric_value: round(
        perProp
          .filter((p) => p.mismatch != null)
          .reduce((s, p) => s + (p.mismatch ?? 0), 0) /
          Math.max(1, perProp.filter((p) => p.mismatch != null).length),
      ),
      benchmark_threshold: THRESHOLDS.headcountDeskMismatchPercent,
      status: aggregate(perProp.map((p) => p.status)),
      sub_items: perProp.map((p) => ({
        sub_item: `${p.c.metrics.property_name}: ${p.mismatch == null ? 'no desk data' : round(p.mismatch) + '% mismatch'}`,
        status: p.status,
      })),
    });
  }

  // 4. Conference Room Capacity — meeting-room utilization <30% or >80% (brief §4.3 #4).
  {
    const perProp = computations.map((c) => {
      const rooms = c.input.spaces.filter(
        (s) => s.spaceType === 'conference_rooms' && s.utilizationRatePercent != null,
      );
      const util =
        rooms.length > 0
          ? rooms.reduce((s, r) => s + (r.utilizationRatePercent ?? 0), 0) /
            rooms.length
          : null;
      const status = tiered(
        util,
        (v) => v < MEETING_ROOM_UTILIZATION.flagBelow || v > MEETING_ROOM_UTILIZATION.flagAbove,
        (v) => v < MEETING_ROOM_UTILIZATION.healthyMin || v > MEETING_ROOM_UTILIZATION.healthyMax,
      );
      return { c, util, status };
    });
    items.push({
      checklist_item_id: 4,
      category: 'Space Mix',
      description: 'Conference-room utilization below 30% or above 80%.',
      metric_value: round(
        perProp
          .filter((p) => p.util != null)
          .reduce((s, p) => s + (p.util ?? 0), 0) /
          Math.max(1, perProp.filter((p) => p.util != null).length),
      ),
      benchmark_threshold: MEETING_ROOM_UTILIZATION.flagBelow,
      status: aggregate(perProp.map((p) => p.status)),
      sub_items: perProp.map((p) => ({
        sub_item: `${p.c.metrics.property_name}: ${p.util == null ? 'no meeting-room data' : round(p.util) + '% room utilization'}`,
        status: p.status,
      })),
    });
  }

  // 5. Support Space Redundancy — support space >7% of total SF (brief §4.3 #5).
  {
    const perProp = computations.map((c) => {
      const supportSf = SUPPORT_SPACE_TYPES.reduce(
        (s, t) => s + c.spaceSfByType[t],
        0,
      );
      const share =
        c.totalAllocatedSf > 0 ? (supportSf / c.totalAllocatedSf) * 100 : null;
      const status = tiered(
        share,
        (v) => v > SUPPORT_SPACE_EXCESS_THRESHOLD_PERCENT * 1.7,
        (v) => v > SUPPORT_SPACE_EXCESS_THRESHOLD_PERCENT,
      );
      return { c, share, status };
    });
    items.push({
      checklist_item_id: 5,
      category: 'Support Facilities',
      description: 'Support space exceeds 7% of allocated square footage.',
      metric_value: round(
        perProp
          .filter((p) => p.share != null)
          .reduce((s, p) => s + (p.share ?? 0), 0) /
          Math.max(1, perProp.filter((p) => p.share != null).length),
      ),
      benchmark_threshold: SUPPORT_SPACE_EXCESS_THRESHOLD_PERCENT,
      status: aggregate(perProp.map((p) => p.status)),
      sub_items: perProp.map((p) => ({
        sub_item: `${p.c.metrics.property_name}: ${p.share == null ? 'no space breakdown' : round(p.share) + '% support space'}`,
        status: p.status,
      })),
    });
  }

  // 6. Geographic Concentration — >60% of headcount in one location (brief §4.3 #6).
  {
    const totalHeadcount = computations.reduce(
      (s, c) => s + c.input.headcountOnSite,
      0,
    );
    const shares = computations.map((c) => ({
      name: c.metrics.property_name,
      share:
        totalHeadcount > 0 ? (c.input.headcountOnSite / totalHeadcount) * 100 : 0,
    }));
    const maxShare = shares.reduce((m, s) => Math.max(m, s.share), 0);
    const status: CheckStatus =
      n <= 1
        ? 'pass'
        : maxShare > THRESHOLDS.geographicConcentrationPercent
          ? 'warning'
          : 'pass';
    items.push({
      checklist_item_id: 6,
      category: 'Portfolio',
      description: 'More than 60% of headcount concentrated in a single location.',
      metric_value: round(maxShare),
      benchmark_threshold: THRESHOLDS.geographicConcentrationPercent,
      status,
      sub_items: shares.map((s) => ({
        sub_item: `${s.name}: ${round(s.share)}% of headcount`,
        status:
          n > 1 && s.share > THRESHOLDS.geographicConcentrationPercent
            ? ('warning' as CheckStatus)
            : ('pass' as CheckStatus),
      })),
    });
  }

  // 7. Lease Constraints — break dates >5 years out with no early exit (brief §4.3 #7).
  {
    const asOf = new Date();
    const perProp = computations.map((c) => {
      const yearsRemaining = maxLeaseYearsRemaining(c.input, asOf);
      const hasEarlyExit = c.input.leases.some((l) => l.hasBreakClause);
      let status: CheckStatus = 'pass';
      if (c.input.leases.length === 0) status = 'warning';
      else if (yearsRemaining > THRESHOLDS.leaseLockInYears && !hasEarlyExit)
        status = 'fail';
      else if (yearsRemaining > THRESHOLDS.leaseLockInYears) status = 'warning';
      return { c, yearsRemaining, hasEarlyExit, status };
    });
    items.push({
      checklist_item_id: 7,
      category: 'Cost Efficiency',
      description: 'Lease locked in beyond 5 years with no early-exit clause.',
      metric_value: round(
        perProp.reduce((s, p) => s + p.yearsRemaining, 0) / Math.max(1, n),
      ),
      benchmark_threshold: THRESHOLDS.leaseLockInYears,
      status: aggregate(perProp.map((p) => p.status)),
      sub_items: perProp.map((p) => ({
        sub_item: `${p.c.metrics.property_name}: ${round(p.yearsRemaining, 1)} yrs remaining${p.hasEarlyExit ? ' (break clause)' : ''}`,
        status: p.status,
      })),
    });
  }

  // 8. Space Type Mix — private office >50% of total (brief §4.3 #8).
  {
    const perProp = computations.map((c) => {
      const share = c.hasSpaceData ? c.metrics.drivers.space_mix_alignment : null;
      const status = tiered(
        share,
        (v) => v > 65,
        (v) => v > THRESHOLDS.privateOfficeShareMax,
      );
      return { c, share, status };
    });
    items.push({
      checklist_item_id: 8,
      category: 'Space Mix',
      description: 'Private offices make up more than 50% of allocated space.',
      metric_value: round(
        perProp
          .filter((p) => p.share != null)
          .reduce((s, p) => s + (p.share ?? 0), 0) /
          Math.max(1, perProp.filter((p) => p.share != null).length),
      ),
      benchmark_threshold: THRESHOLDS.privateOfficeShareMax,
      status: aggregate(perProp.map((p) => p.status)),
      sub_items: perProp.map((p) => ({
        sub_item: `${p.c.metrics.property_name}: ${p.share == null ? 'no space breakdown' : round(p.share) + '% private office'}`,
        status: p.status,
      })),
    });
  }

  // 9. Occupancy Variance — occupancy rates vary >40% between locations (brief §4.3 #9).
  {
    const rates = computations
      .filter((c) => c.hasOccupancyData)
      .map((c) => c.metrics.occupancy_rate);
    const spread =
      rates.length >= 2 ? Math.max(...rates) - Math.min(...rates) : 0;
    const status: CheckStatus =
      rates.length < 2
        ? 'pass'
        : spread > THRESHOLDS.occupancyVariancePercent
          ? 'warning'
          : 'pass';
    items.push({
      checklist_item_id: 9,
      category: 'Utilization',
      description: 'Occupancy rates vary more than 40 points across locations.',
      metric_value: round(spread),
      benchmark_threshold: THRESHOLDS.occupancyVariancePercent,
      status,
      sub_items: computations
        .filter((c) => c.hasOccupancyData)
        .map((c) => ({
          sub_item: `${c.metrics.property_name}: ${round(c.metrics.occupancy_rate)}% occupancy`,
          status: 'pass' as CheckStatus,
        })),
    });
  }

  // 10. Cost Variance — property costs >50% above benchmark (brief §4.3 #10).
  {
    const perProp = computations.map((c) => {
      const target = c.metrics.benchmark_target_cost_per_sf_per_employee;
      const ratio =
        c.hasCostData && target > 0
          ? c.metrics.cost_per_sf_per_employee / target
          : null;
      const status = tiered(
        ratio,
        (v) => v > 1 + THRESHOLDS.costVariancePercent / 100,
        (v) => v > 1.25,
      );
      return { c, ratio, status };
    });
    items.push({
      checklist_item_id: 10,
      category: 'Cost Efficiency',
      description: 'Property cost per SF per employee exceeds benchmark by >50%.',
      metric_value: round(
        (perProp
          .filter((p) => p.ratio != null)
          .reduce((s, p) => s + (p.ratio ?? 0), 0) /
          Math.max(1, perProp.filter((p) => p.ratio != null).length) -
          1) *
          100,
      ),
      benchmark_threshold: THRESHOLDS.costVariancePercent,
      status: aggregate(perProp.map((p) => p.status)),
      sub_items: perProp.map((p) => ({
        sub_item: `${p.c.metrics.property_name}: ${p.ratio == null ? 'no cost data' : round((p.ratio - 1) * 100) + '% above benchmark'}`,
        status: p.status,
      })),
    });
  }

  return items;
}

export { worst };
