import { describe, expect, it } from 'vitest';
import { parseCsv, validateCsv } from '../engine/csv.ts';

describe('parseCsv', () => {
  it('parses quoted fields, escaped quotes and CRLF', () => {
    const text = 'a,b,c\r\n"1,000","he said ""hi""",x\r\n';
    const grid = parseCsv(text);
    expect(grid[0]).toEqual(['a', 'b', 'c']);
    expect(grid[1]).toEqual(['1,000', 'he said "hi"', 'x']);
  });
});

describe('validateCsv — properties', () => {
  const header =
    'property_name,address,city,state,zip,property_type,total_rentable_sf,headcount_on_site\n';

  it('imports valid rows and coerces numbers (strips $ and commas)', () => {
    const csv = header + 'HQ,1 Main St,San Francisco,CA,94105,leased,"50,000",200\n';
    const result = validateCsv('properties', csv);
    expect(result.error_count).toBe(0);
    expect(result.imported_count).toBe(1);
    expect((result.rows[0].data as any).total_rentable_sf).toBe(50000);
  });

  it('reports row/column errors for bad enums and out-of-range numbers', () => {
    const csv = header + 'Bad,1 Main St,SF,CA,94105,condo,0,200\n';
    const result = validateCsv('properties', csv);
    expect(result.error_count).toBeGreaterThan(0);
    const cols = result.errors.map((e) => e.column);
    expect(cols).toContain('property_type');
    expect(cols).toContain('total_rentable_sf');
    expect(result.errors[0].row).toBe(2);
  });

  it('warns (does not error) on duplicate property names', () => {
    const csv =
      header +
      'HQ,1 Main St,SF,CA,94105,leased,50000,10\n' +
      'HQ,2 Main St,SF,CA,94105,leased,40000,10\n';
    const result = validateCsv('properties', csv);
    expect(result.error_count).toBe(0);
    expect(result.warnings.some((w) => w.column === 'property_name')).toBe(true);
  });
});

describe('validateCsv — leases', () => {
  it('rejects a lease whose start is after its end', () => {
    const csv =
      'property_name,lease_start_date,lease_end_date,lease_type,annual_rent\n' +
      'HQ,2030-01-01,2025-01-01,gross,100000\n';
    const result = validateCsv('leases', csv);
    expect(result.error_count).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.column === 'lease_end_date')).toBe(true);
  });

  it('requires property_name on child rows', () => {
    const csv =
      'property_name,lease_start_date,lease_end_date,lease_type,annual_rent\n' +
      ',2022-01-01,2025-01-01,gross,100000\n';
    const result = validateCsv('leases', csv);
    expect(result.errors.some((e) => e.column === 'property_name')).toBe(true);
  });
});

describe('validateCsv — occupancy', () => {
  it('rejects occupied_desks greater than total_desks_available', () => {
    const csv =
      'property_name,data_source,measurement_date,occupied_desks,total_desks_available\n' +
      'HQ,badge_access,2025-01-01,120,100\n';
    const result = validateCsv('occupancy', csv);
    expect(result.errors.some((e) => e.column === 'occupied_desks')).toBe(true);
  });
});
