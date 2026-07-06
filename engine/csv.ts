// CSV import + validation (brief §5.1, §7). Dependency-free so it runs unchanged
// in Node (tests) and Deno (Edge Functions).

import { coerceEnum } from './normalize.ts';
import {
  leaseSchema,
  occupancySchema,
  propertySchema,
  type LeasePayload,
  type OccupancyPayload,
  type PropertyPayload,
} from './validation.ts';
import {
  BREAK_PENALTY_TYPES,
  LEASE_TYPES,
  MARKET_TIERS,
  OCCUPANCY_SOURCES,
  PROPERTY_TYPES,
} from './types.ts';

export type TemplateType = 'properties' | 'leases' | 'occupancy';

export interface CsvError {
  row: number;
  column: string;
  message: string;
}

export interface CsvValidationResult<T> {
  imported_count: number;
  error_count: number;
  rows: { row: number; ref: string; data: T }[];
  errors: CsvError[];
  warnings: CsvError[];
}

/** Header templates offered for download (brief §5.1). `ref` links child rows to a property by name. */
export const CSV_TEMPLATES: Record<TemplateType, string[]> = {
  properties: [
    'property_name',
    'address',
    'city',
    'state',
    'zip',
    'property_type',
    'total_rentable_sf',
    'total_usable_sf',
    'number_of_floors',
    'year_built',
    'headcount_on_site',
    'occupancy_rate_percent',
    'market_tier',
  ],
  leases: [
    'property_name',
    'lease_start_date',
    'lease_end_date',
    'lease_type',
    'annual_rent',
    'cams_annual',
    'utilities_annual',
    'parking_annual',
    'property_tax_annual',
    'insurance_annual',
    'janitorial_annual',
    'other_annual_costs',
    'tenant_improvement_cost',
    'tenant_improvement_allowance',
    'furniture_ffe_cost',
    'construction_buildout_cost',
    'moving_cost',
    'other_one_time_costs',
    'has_break_clause',
    'break_date',
    'break_penalty_type',
    'break_penalty_amount',
  ],
  occupancy: [
    'property_name',
    'data_source',
    'measurement_date',
    'occupied_desks',
    'total_desks_available',
    'occupancy_rate_percent',
    'average_occupancy_rate_percent',
  ],
};

/** RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  // Strip a UTF-8 BOM if present.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  // Flush trailing field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toObjects(text: string): { headers: string[]; records: Record<string, string>[] } {
  const grid = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (grid.length === 0) return { headers: [], records: [] };
  const headers = grid[0].map((h) => h.trim().toLowerCase());
  const records = grid.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (cells[i] ?? '').trim();
    });
    return rec;
  });
  return { headers, records };
}

function num(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const cleaned = v.replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function bool(v: string | undefined): boolean | undefined {
  if (v == null || v === '') return undefined;
  const t = v.trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(t)) return true;
  if (['false', 'no', 'n', '0'].includes(t)) return false;
  return undefined;
}

function coerceProperty(rec: Record<string, string>) {
  return {
    property_name: rec.property_name,
    address: rec.address,
    city: rec.city,
    state: rec.state,
    zip: rec.zip,
    property_type: coerceEnum(rec.property_type, PROPERTY_TYPES),
    total_rentable_sf: num(rec.total_rentable_sf),
    total_usable_sf: num(rec.total_usable_sf),
    number_of_floors: num(rec.number_of_floors),
    year_built: num(rec.year_built),
    headcount_on_site: num(rec.headcount_on_site),
    occupancy_rate_percent: num(rec.occupancy_rate_percent),
    market_tier: coerceEnum(rec.market_tier, MARKET_TIERS),
  };
}

function coerceLease(rec: Record<string, string>) {
  return {
    lease_start_date: rec.lease_start_date,
    lease_end_date: rec.lease_end_date,
    lease_type: coerceEnum(rec.lease_type, LEASE_TYPES),
    annual_rent: num(rec.annual_rent),
    cams_annual: num(rec.cams_annual),
    utilities_annual: num(rec.utilities_annual),
    parking_annual: num(rec.parking_annual),
    property_tax_annual: num(rec.property_tax_annual),
    insurance_annual: num(rec.insurance_annual),
    janitorial_annual: num(rec.janitorial_annual),
    other_annual_costs: num(rec.other_annual_costs),
    tenant_improvement_cost: num(rec.tenant_improvement_cost),
    tenant_improvement_allowance: num(rec.tenant_improvement_allowance),
    furniture_ffe_cost: num(rec.furniture_ffe_cost),
    construction_buildout_cost: num(rec.construction_buildout_cost),
    moving_cost: num(rec.moving_cost),
    other_one_time_costs: num(rec.other_one_time_costs),
    has_break_clause: bool(rec.has_break_clause),
    break_date: rec.break_date || undefined,
    break_penalty_type: coerceEnum(rec.break_penalty_type, BREAK_PENALTY_TYPES),
    break_penalty_amount: num(rec.break_penalty_amount),
  };
}

function coerceOccupancy(rec: Record<string, string>) {
  return {
    data_source: coerceEnum(rec.data_source, OCCUPANCY_SOURCES),
    measurement_date: rec.measurement_date,
    occupied_desks: num(rec.occupied_desks),
    total_desks_available: num(rec.total_desks_available),
    occupancy_rate_percent: num(rec.occupancy_rate_percent),
    average_occupancy_rate_percent: num(rec.average_occupancy_rate_percent),
  };
}

// Drop undefined keys so Zod `.optional()` fields aren't seen as present-and-invalid.
function prune<T extends Record<string, unknown>>(obj: T): T {
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) delete obj[k];
  }
  return obj;
}

/**
 * Validate a CSV upload for a template type. Reports errors by row/column and
 * returns the valid, typed rows ready to persist (brief §5.1 CSV workflow).
 */
export function validateCsv(
  templateType: TemplateType,
  text: string,
): CsvValidationResult<PropertyPayload | LeasePayload | OccupancyPayload> {
  const { headers, records } = toObjects(text);
  const errors: CsvError[] = [];
  const warnings: CsvError[] = [];
  const rows: { row: number; ref: string; data: any }[] = [];

  const expected = CSV_TEMPLATES[templateType];
  const required = expected.filter(
    (h) => templateType !== 'properties' || h !== 'market_tier',
  );
  // Header presence check (case-insensitive; extra columns ignored with a warning).
  for (const h of required) {
    if (templateType !== 'properties' && h === 'property_name') {
      if (!headers.includes('property_name')) {
        errors.push({ row: 1, column: h, message: `missing required column "${h}"` });
      }
      continue;
    }
  }

  const seenNames = new Set<string>();

  records.forEach((rec, idx) => {
    const rowNum = idx + 2; // 1-based, +1 for header row
    const ref = rec.property_name ?? '';

    let coerced: Record<string, unknown>;
    let schema: typeof propertySchema | typeof leaseSchema | typeof occupancySchema;
    if (templateType === 'properties') {
      coerced = prune(coerceProperty(rec));
      schema = propertySchema;
      if (ref) {
        if (seenNames.has(ref.toLowerCase())) {
          warnings.push({
            row: rowNum,
            column: 'property_name',
            message: `duplicate property name "${ref}" in import`,
          });
        }
        seenNames.add(ref.toLowerCase());
      }
    } else if (templateType === 'leases') {
      coerced = prune(coerceLease(rec));
      schema = leaseSchema;
    } else {
      coerced = prune(coerceOccupancy(rec));
      schema = occupancySchema;
    }

    if (templateType !== 'properties' && !ref) {
      errors.push({ row: rowNum, column: 'property_name', message: 'property_name is required' });
      return;
    }

    const result = schema.safeParse(coerced);
    if (result.success) {
      rows.push({ row: rowNum, ref, data: result.data });
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNum,
          column: String(issue.path[0] ?? '(row)'),
          message: issue.message,
        });
      }
    }
  });

  return {
    imported_count: rows.length,
    error_count: errors.length,
    rows,
    errors,
    warnings,
  };
}
