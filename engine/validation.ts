// Input validation schemas (brief §7). Shared by the Edge Functions and the CSV
// importer so manual entry and bulk upload enforce identical rules.

import { z } from 'zod';
import {
  BREAK_PENALTY_TYPES,
  LEASE_TYPES,
  MARKET_TIERS,
  OCCUPANCY_SOURCES,
  PROPERTY_TYPES,
  SPACE_TYPES,
} from './types.ts';

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'invalid date' });

export const propertySchema = z.object({
  property_name: z.string().min(1).max(255),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  property_type: z.enum(PROPERTY_TYPES),
  total_rentable_sf: z.number().positive(),
  total_usable_sf: z.number().positive().optional(),
  number_of_floors: z.number().int().positive().optional(),
  year_built: z.number().int().optional(),
  headcount_on_site: z.number().int().min(0),
  occupancy_rate_percent: z.number().min(0).max(100).optional(),
  market_tier: z.enum(MARKET_TIERS).optional(),
});
export type PropertyPayload = z.infer<typeof propertySchema>;

export const leaseSchema = z
  .object({
    lease_start_date: isoDate,
    lease_end_date: isoDate,
    lease_type: z.enum(LEASE_TYPES),
    annual_rent: z.number().min(0),
    cams_annual: z.number().min(0).optional(),
    other_annual_costs: z.number().min(0).optional(),
    // Recurring operating costs
    utilities_annual: z.number().min(0).optional(),
    parking_annual: z.number().min(0).optional(),
    property_tax_annual: z.number().min(0).optional(),
    insurance_annual: z.number().min(0).optional(),
    janitorial_annual: z.number().min(0).optional(),
    // One-time / capital costs
    tenant_improvement_cost: z.number().min(0).optional(),
    tenant_improvement_allowance: z.number().min(0).optional(),
    furniture_ffe_cost: z.number().min(0).optional(),
    construction_buildout_cost: z.number().min(0).optional(),
    moving_cost: z.number().min(0).optional(),
    other_one_time_costs: z.number().min(0).optional(),
    has_break_clause: z.boolean().optional(),
    break_date: isoDate.optional(),
    break_penalty_type: z.enum(BREAK_PENALTY_TYPES).optional(),
    break_penalty_amount: z.number().min(0).optional(),
    cancellation_clause: z.string().optional(),
    holdover_terms: z.string().optional(),
  })
  .refine((l) => Date.parse(l.lease_start_date) < Date.parse(l.lease_end_date), {
    message: 'lease_start_date must be before lease_end_date',
    path: ['lease_end_date'],
  })
  .refine((l) => !l.has_break_clause || (l.break_date && l.break_penalty_type), {
    message: 'break_date and break_penalty_type are required when has_break_clause is true',
    path: ['break_date'],
  })
  .refine(
    (l) =>
      !l.break_date ||
      (Date.parse(l.break_date) >= Date.parse(l.lease_start_date) &&
        Date.parse(l.break_date) <= Date.parse(l.lease_end_date)),
    { message: 'break_date must fall within the lease term', path: ['break_date'] },
  )
  .refine(
    (l) =>
      l.break_penalty_type !== 'percentage_of_remaining' ||
      (l.break_penalty_amount != null &&
        l.break_penalty_amount >= 0 &&
        l.break_penalty_amount <= 100),
    { message: 'percentage break penalty must be 0–100', path: ['break_penalty_amount'] },
  );
export type LeasePayload = z.infer<typeof leaseSchema>;

export const occupancySchema = z
  .object({
    data_source: z.enum(OCCUPANCY_SOURCES),
    measurement_date: isoDate.refine((s) => Date.parse(s) <= Date.now(), {
      message: 'measurement_date cannot be in the future',
    }),
    occupied_desks: z.number().int().min(0),
    total_desks_available: z.number().int().positive(),
    occupancy_rate_percent: z.number().min(0).max(100).optional(),
    average_occupancy_rate_percent: z.number().min(0).max(100).optional(),
    peak_occupancy_time: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((o) => o.occupied_desks <= o.total_desks_available, {
    message: 'occupied_desks cannot exceed total_desks_available',
    path: ['occupied_desks'],
  });
export type OccupancyPayload = z.infer<typeof occupancySchema>;

export const spaceSchema = z.object({
  space_type: z.enum(SPACE_TYPES),
  allocated_sf: z.number().min(0),
  allocated_headcount: z.number().int().min(0),
  utilization_rate_percent: z.number().min(0).max(100).optional(),
  estimated_cost_portion: z.number().min(0).optional(),
});
export type SpacePayload = z.infer<typeof spaceSchema>;

export const analyzeRequestSchema = z.object({
  portfolio_id: z.string().min(1),
  snapshot_date: isoDate.optional(),
  data_as_of_date: isoDate.optional(),
  notes: z.string().optional(),
});
