// Utilization-issue classification (brief §5.2 step 6).
// For each under/over-utilized property, determine the likely root cause and severity.

import { SUPPORT_SPACE_EXCESS_THRESHOLD_PERCENT, THRESHOLDS } from './benchmarks.ts';
import { maxLeaseYearsRemaining, type PropertyInput } from './domain.ts';
import { round } from './normalize.ts';
import type { PropertyComputation } from './metrics.ts';
import type { Severity, UtilizationIssue, UtilizationIssueType } from './types.ts';

function severityFrom(utilization: number): Severity {
  if (utilization < 30) return 'critical';
  if (utilization < 50) return 'high';
  if (utilization < 70) return 'medium';
  return 'low';
}

function leaseLockedIn(property: PropertyInput, asOf: Date): boolean {
  const years = maxLeaseYearsRemaining(property, asOf);
  const hasBreak = property.leases.some((l) => l.hasBreakClause);
  return years > THRESHOLDS.leaseLockInYears && !hasBreak;
}

export function classifyUtilizationIssues(
  computations: PropertyComputation[],
  asOf: Date = new Date(),
): UtilizationIssue[] {
  const totalHeadcount = computations.reduce(
    (s, c) => s + c.input.headcountOnSite,
    0,
  );
  const issues: UtilizationIssue[] = [];

  for (const c of computations) {
    const status = c.metrics.red_flag_status;
    if (status !== 'underutilized' && status !== 'overutilized') continue;

    const util = c.metrics.utilization_rate;
    const privateOfficeShare = c.metrics.drivers.space_mix_alignment;
    const supportShare =
      c.totalAllocatedSf > 0
        ? (['conference_rooms', 'phone_booths', 'focus_areas', 'amenity_support'] as const).reduce(
            (s, t) => s + c.spaceSfByType[t],
            0,
          ) /
          c.totalAllocatedSf *
          100
        : 0;
    const headcountShare =
      totalHeadcount > 0 ? (c.input.headcountOnSite / totalHeadcount) * 100 : 0;

    let issueType: UtilizationIssueType;
    let description: string;

    if (status === 'underutilized' && util < THRESHOLDS.utilization.failBelow) {
      issueType = 'low_occupancy';
      description = `${c.metrics.property_name} runs at ${round(util)}% utilization — well below the 70% healthy floor.`;
    } else if (
      c.hasSpaceData &&
      (privateOfficeShare > THRESHOLDS.privateOfficeShareMax ||
        supportShare > SUPPORT_SPACE_EXCESS_THRESHOLD_PERCENT)
    ) {
      issueType = 'wrong_space_mix';
      description = `${c.metrics.property_name} has an inefficient space mix (${round(privateOfficeShare)}% private office, ${round(supportShare)}% support space).`;
    } else if (leaseLockedIn(c.input, asOf)) {
      issueType = 'lease_lock_in';
      description = `${c.metrics.property_name} is underused but locked into a long lease with no early-exit clause.`;
    } else if (headcountShare > THRESHOLDS.geographicConcentrationPercent) {
      issueType = 'geographic_mismatch';
      description = `${c.metrics.property_name} concentrates ${round(headcountShare)}% of portfolio headcount, creating geographic risk.`;
    } else {
      issueType = 'poor_design';
      description = `${c.metrics.property_name} shows ${status.replace('_', ' ')} space (${round(util)}% utilization) likely tied to layout/design.`;
    }

    issues.push({
      property_id: c.input.id,
      issue_type: issueType,
      severity:
        status === 'overutilized' ? 'medium' : severityFrom(util),
      description,
      evidence: {
        utilization_rate: round(util),
        occupancy_rate: round(c.metrics.occupancy_rate),
        private_office_share: round(privateOfficeShare),
        support_space_share: round(supportShare),
        headcount_share: round(headcountShare),
      },
    });
  }

  return issues;
}
