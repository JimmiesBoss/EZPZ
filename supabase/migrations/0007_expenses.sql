-- Richer occupancy-cost model — the "true cost of a space" (leases table).
--
-- The leases row is the cost container for a property (leased buildings and the
-- carrying costs of owned buildings alike). We split costs into:
--   * recurring operating costs (annual): rent, CAM, utilities, parking, property
--     tax, insurance, janitorial, other — summed into operating cost/SF.
--   * one-time / capital costs: tenant improvement (with the landlord's TI
--     allowance as an offsetting credit), furniture/FF&E, construction/build-out,
--     moving, other — netted and amortized over the lease term into fully-loaded
--     cost/SF by the engine.
-- All new columns are optional and constrained >= 0.

alter table leases
  -- recurring operating costs (annual $)
  add column utilities_annual            double precision check (utilities_annual is null or utilities_annual >= 0),
  add column parking_annual              double precision check (parking_annual is null or parking_annual >= 0),
  add column property_tax_annual         double precision check (property_tax_annual is null or property_tax_annual >= 0),
  add column insurance_annual            double precision check (insurance_annual is null or insurance_annual >= 0),
  add column janitorial_annual           double precision check (janitorial_annual is null or janitorial_annual >= 0),
  -- one-time / capital costs ($)
  add column tenant_improvement_cost      double precision check (tenant_improvement_cost is null or tenant_improvement_cost >= 0),
  add column tenant_improvement_allowance double precision check (tenant_improvement_allowance is null or tenant_improvement_allowance >= 0),
  add column furniture_ffe_cost           double precision check (furniture_ffe_cost is null or furniture_ffe_cost >= 0),
  add column construction_buildout_cost   double precision check (construction_buildout_cost is null or construction_buildout_cost >= 0),
  add column moving_cost                  double precision check (moving_cost is null or moving_cost >= 0),
  add column other_one_time_costs         double precision check (other_one_time_costs is null or other_one_time_costs >= 0);
