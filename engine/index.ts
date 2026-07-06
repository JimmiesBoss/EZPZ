// Public surface of the Profolio calculation engine.
// Import from here in Edge Functions and tests: `import { analyzePortfolio } from '../../engine/index.ts'`.

export * from './types.ts';
export * from './domain.ts';
export * from './benchmarks.ts';
export * from './normalize.ts';
export { analyzePortfolio, type AnalyzeOptions } from './analyze.ts';
export {
  computeProperty,
  computePortfolioMetrics,
  dataCompletenessPercent,
  utilizationRate,
  occupancyRate,
  type PropertyComputation,
} from './metrics.ts';
export { buildRedFlagChecklist } from './redflags.ts';
export { identifyOpportunities } from './opportunities.ts';
export { classifyUtilizationIssues } from './issues.ts';
export { buildStandardsBenchmarks } from './standards.ts';
export {
  validateCsv,
  parseCsv,
  CSV_TEMPLATES,
  type TemplateType,
  type CsvValidationResult,
  type CsvError,
} from './csv.ts';
export {
  buildReport,
  type ReportModel,
  type ReportSection,
  type ReportType,
} from './report.ts';
export {
  propertySchema,
  leaseSchema,
  occupancySchema,
  spaceSchema,
  analyzeRequestSchema,
  type PropertyPayload,
  type LeasePayload,
  type OccupancyPayload,
  type SpacePayload,
} from './validation.ts';
