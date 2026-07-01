// Analysis pipeline orchestrator (brief §5.2).
// Pure function: PortfolioInput -> AnalysisResults. No I/O, fully testable.

import type { PortfolioInput } from './domain.ts';
import { classifyUtilizationIssues } from './issues.ts';
import {
  computePortfolioMetrics,
  computeProperty,
  dataCompletenessPercent,
  type PropertyComputation,
} from './metrics.ts';
import { identifyOpportunities } from './opportunities.ts';
import { buildRedFlagChecklist } from './redflags.ts';
import type { AnalysisResults } from './types.ts';

export interface AnalyzeOptions {
  /** Reference date for lease-age / remaining-term math. Defaults to now. */
  asOf?: Date;
}

export function analyzePortfolio(
  portfolio: PortfolioInput,
  options: AnalyzeOptions = {},
): AnalysisResults {
  const asOf = options.asOf ?? new Date();

  // Step 2: per-property metric calculation.
  const computations: PropertyComputation[] = portfolio.properties.map(
    computeProperty,
  );

  // Step 3: portfolio aggregation.
  const portfolioMetrics = computePortfolioMetrics(computations);

  // Step 1 (reported alongside): data completeness / confidence.
  const completeness = dataCompletenessPercent(computations);

  // Step 4: red-flag checklist.
  const redFlagChecklist = buildRedFlagChecklist(computations);

  // Step 5: opportunity identification + ranking.
  const opportunities = identifyOpportunities(computations, asOf);

  // Step 6: utilization-issue classification.
  const issues = classifyUtilizationIssues(computations, asOf);

  // Step 7: serialize.
  return {
    portfolio_level_metrics: portfolioMetrics,
    property_level_metrics: computations.map((c) => c.metrics),
    utilization_issues: issues,
    financial_opportunities: opportunities,
    red_flag_checklist: redFlagChecklist,
    data_completeness_percent: completeness,
  };
}
