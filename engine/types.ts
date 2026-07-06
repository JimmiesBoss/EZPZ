// Shared enums and analysis-result types for Profolio.
// Enum tuples are exported so Zod and the engine share one source of truth.

export const PROPERTY_TYPES = ['owned', 'leased'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const MARKET_TIERS = ['tier1', 'tier2', 'tier3'] as const;
export type MarketTier = (typeof MARKET_TIERS)[number];

export const LEASE_TYPES = ['gross', 'triple_net', 'modified_gross'] as const;
export type LeaseType = (typeof LEASE_TYPES)[number];

export const BREAK_PENALTY_TYPES = [
  'percentage_of_remaining',
  'fixed_amount',
  'none',
] as const;
export type BreakPenaltyType = (typeof BREAK_PENALTY_TYPES)[number];

export const OCCUPANCY_SOURCES = [
  'badge_access',
  'occupancy_sensor',
  'security_system',
  'desk_hoteling',
  'space_management',
  'manual_entry',
] as const;
export type OccupancySource = (typeof OCCUPANCY_SOURCES)[number];

export const SPACE_TYPES = [
  'private_office',
  'open_collaborative',
  'conference_rooms',
  'phone_booths',
  'focus_areas',
  'amenity_support',
] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export const RED_FLAG_STATUSES = [
  'underutilized',
  'overutilized',
  'acceptable',
  'insufficient_data',
] as const;
export type RedFlagStatus = (typeof RED_FLAG_STATUSES)[number];

export const CHECK_STATUSES = ['pass', 'warning', 'fail'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const UTILIZATION_ISSUE_TYPES = [
  'low_occupancy',
  'wrong_space_mix',
  'geographic_mismatch',
  'lease_lock_in',
  'poor_design',
] as const;
export type UtilizationIssueType = (typeof UTILIZATION_ISSUE_TYPES)[number];

export const OPPORTUNITY_TYPES = [
  'consolidate_properties',
  'sublease_excess',
  'adjust_space_mix',
  'relocate',
  'renegotiate_lease',
  'reduce_support_space',
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

// ---------------------------------------------------------------------------
// Analysis result shapes (brief §3.2)
// ---------------------------------------------------------------------------

/** Recurring operating-cost categories, annual $ (brief §4.1 + expense model). */
export interface OperatingCostBreakdown {
  rent: number;
  cams: number;
  utilities: number;
  parking: number;
  property_tax: number;
  insurance: number;
  janitorial: number;
  other: number;
}

export interface PortfolioLevelMetrics {
  total_portfolio_sf: number;
  total_portfolio_annual_cost: number;
  cost_per_sf_total: number;
  total_headcount: number;
  cost_per_sf_per_employee: number;
  portfolio_average_occupancy_rate: number;
  portfolio_average_utilization_rate: number;
  benchmark_variance_percent: number;
  // True-cost + standards metrics (IFMA / BOMA / CoStar)
  total_fully_loaded_annual_cost: number;
  fully_loaded_cost_per_sf: number;
  cost_per_employee: number;
  rentable_sf_per_employee: number;
  average_load_factor: number;
  operating_cost_breakdown: OperatingCostBreakdown;
}

export interface PropertyLevelMetrics {
  property_id: string;
  property_name: string;
  sf: number;
  annual_cost: number;
  cost_per_sf: number;
  headcount_on_site: number;
  cost_per_sf_per_employee: number;
  occupancy_rate: number;
  utilization_rate: number;
  /** Tier benchmark target, on a cost-per-SF scale (brief §4.2). */
  benchmark_target_cost_per_sf: number;
  /** Variance of cost_per_sf vs. the tier benchmark target, as a percent. */
  variance_from_benchmark: number;
  red_flag_status: RedFlagStatus;
  drivers: {
    utilization_level: number;
    cost_efficiency: number;
    space_mix_alignment: number;
  };
  // True-cost + standards metrics
  /** Recurring operating $/yr by category. */
  operating_cost_breakdown: OperatingCostBreakdown;
  /** Net one-time capital (spend − TI allowance) amortized over the lease term, $/yr. */
  amortized_capital_annual: number;
  /** Operating + amortized capital, $/yr. */
  fully_loaded_annual_cost: number;
  fully_loaded_cost_per_sf: number;
  /** Operating cost per on-site employee, $/yr (IFMA). */
  cost_per_employee: number;
  /** Operating cost per available desk/seat, $/yr; 0 when no desk data (IFMA). */
  cost_per_seat: number;
  /** Rentable ÷ usable SF; 0 when usable SF unknown (BOMA add-on/load factor). */
  load_factor: number;
  /** Rentable SF per on-site employee (IFMA density). */
  rentable_sf_per_employee: number;
}

/** One standards comparison line for the results panel (IFMA / BOMA / CoStar). */
export interface StandardBenchmark {
  standard: 'IFMA' | 'BOMA' | 'CoStar';
  metric: string;
  value: number;
  unit: string;
  benchmark: string;
  status: CheckStatus;
  note: string;
}

export interface UtilizationIssue {
  property_id: string;
  issue_type: UtilizationIssueType;
  severity: Severity;
  description: string;
  evidence: Record<string, number | string>;
}

export interface FinancialOpportunity {
  opportunity_id: string;
  property_id?: string;
  opportunity_type: OpportunityType;
  description: string;
  estimated_annual_savings: number;
  implementation_cost: number;
  payback_months: number;
  confidence_level: ConfidenceLevel;
  lease_implications: string;
}

export interface RedFlagChecklistItem {
  checklist_item_id: number;
  category: string;
  status: CheckStatus;
  metric_value: number;
  benchmark_threshold: number;
  description: string;
  sub_items: { sub_item: string; status: CheckStatus }[];
}

export interface AnalysisResults {
  portfolio_level_metrics: PortfolioLevelMetrics;
  property_level_metrics: PropertyLevelMetrics[];
  utilization_issues: UtilizationIssue[];
  financial_opportunities: FinancialOpportunity[];
  red_flag_checklist: RedFlagChecklistItem[];
  /** IFMA / BOMA / CoStar standards comparisons at the portfolio level. */
  standards_benchmarks: StandardBenchmark[];
  data_completeness_percent: number;
}
