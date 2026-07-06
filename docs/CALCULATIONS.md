# Calculation Reference

This documents exactly what the engine computes, mapped to the brief. Source of
truth is `engine/` — this file explains intent and calls out the one modeling
ambiguity in the brief.

## Core metrics (brief §4.1)

| Metric | Formula | Code |
|---|---|---|
| Property annual cost | `Σ(annual_rent + cams_annual + other_annual_costs)` over leases | `domain.propertyAnnualCost` |
| Cost per SF | `annual_cost / total_rentable_sf` | `metrics.computeProperty` |
| Cost per SF per employee | `(annual_cost / total_rentable_sf) / headcount_on_site` | `metrics.computeProperty` |
| Utilization rate | `occupied_desks / total_desks_available × 100`, degrading to headcount/desks, then to `occupancy_rate_percent` | `metrics.utilizationRate` |
| Occupancy rate | measured rate, else `headcount / total_desks × 100`, else property `occupancy_rate_percent` | `metrics.occupancyRate` |
| Benchmark variance | `((cost_per_sf − benchmark_target) / benchmark_target) × 100` (see scale note below) | `metrics.computeProperty` |
| Portfolio averages | simple mean of per-property rates (brief §4.1) | `metrics.computePortfolioMetrics` |
| Portfolio benchmark variance | actual vs. **headcount-weighted** tier target | `metrics.computePortfolioMetrics` |

Graceful degradation is deliberate: a property with no desk data still gets a
utilization estimate from `occupancy_rate_percent`, and `red_flag_status` becomes
`insufficient_data` only when there is no basis at all.

## Benchmarks (brief §4.2)

Embedded in `engine/benchmarks.ts` (IFMA/CoStar baseline):

- **SF per employee:** open 100–125, hybrid 125–175, focus-heavy 150–225,
  default 150.
- **Cost per SF per employee target:** tier1 $30, tier2 $21.50, tier3 $15,
  default $20 (midpoints of the published ranges).
- **Meeting-room utilization:** healthy 40–60%, flag < 30% or > 80%.
- **Support space:** flag when combined support types exceed 7% of allocated SF.

### Resolved: two cost scales, benchmark applied to cost-per-SF

The brief defines the metric (§4.1) as `(cost / SF) / headcount` — dollars per SF
*per employee* — but the benchmark table (§4.2) lists `$12–$35 per SF per
employee`, which is on the scale of **cost per SF**, not cost-per-SF divided by
headcount. Example (HQ Tower: $2.4M cost, 50,000 SF, 200 people):

- cost per SF = `2,400,000 / 50,000` = **$48/SF**
- cost per SF per employee = `48 / 200` = **$0.24/SF/employee**

The tier-1 target ($30) matches the $48 scale, not $0.24. Comparing $0.24 to $30
made variance ≈ −99% for every property, so the cost red-flags never fired.

**Resolution (confirmed with the project owner):** report **both** cost metrics
on every property (`cost_per_sf` and `cost_per_sf_per_employee`), and apply the
benchmark comparison to `cost_per_sf`. So:

- `benchmark_target_cost_per_sf` — the tier target ($30/$21.50/$15).
- `variance_from_benchmark` — `((cost_per_sf − target) / target) × 100`.
- Red-flag items #2 and #10 and the portfolio benchmark variance all key off
  `cost_per_sf`.

`cost_per_sf_per_employee` remains reported per location as an informational
efficiency metric (useful for comparing space-cost intensity across sites of
different headcounts), it just isn't the value benchmarked.

## True cost of a space (operating vs. fully-loaded)

Each property's cost comes from its lease row(s), now split into two layers
(`engine/domain.ts`):

- **Operating (recurring, $/yr)** = rent + CAM + utilities + parking + property
  tax + insurance + janitorial + other. This is `annual_cost` and drives
  `cost_per_sf`, benchmark variance, and the cost red-flags — unchanged scale from
  before, so existing behavior holds when only rent/CAM are entered.
- **Capital (one-time, $)** = TI + furniture/FF&E + construction/build-out +
  moving + other one-time, **minus the tenant-improvement allowance** (the
  landlord's contribution). Net capital is amortized straight-line over the lease
  term (min 1 yr, floored at 0) into `amortized_capital_annual`.
- **Fully loaded ($/yr)** = operating + amortized capital →
  `fully_loaded_annual_cost` and `fully_loaded_cost_per_sf`.

Each property also reports `operating_cost_breakdown` (the eight categories),
`cost_per_employee`, `cost_per_seat`, and `rentable_sf_per_employee`; the
portfolio aggregates all of these.

## Industry standards — IFMA / BOMA / CoStar (`engine/standards.ts`)

Surfaced as `standards_benchmarks` in the results (separate from the 10-point
checklist so the brief's structure is untouched):

- **IFMA — Density:** rentable SF ÷ employees vs. ~150 SF/employee; warns above
  225, fails above 300, warns below 90.
- **IFMA — Utilization:** portfolio average desk utilization vs. a 70% healthy
  floor.
- **BOMA — Load factor:** rentable ÷ usable SF (add-on / core factor); typical
  ≤ 1.15, warns above, fails above 1.20. Needs usable SF entered.
- **BOMA — Operating expense intensity:** ex-rent opex per SF vs. a
  $8–16/SF office reference.
- **CoStar — Fully-loaded cost/SF:** vs. the market-tier target, flagged by
  variance the same way as the cost red-flags.

Each item returns a value, the benchmark, a pass/warning/fail status, and a
plain-language note for the UI.

## Red-flag checklist (brief §4.3)

Ten items in `engine/redflags.ts`, each evaluated per property then aggregated to
one status with per-property detail in `sub_items`. Aggregation: an item **fails**
when a majority (or ≥3) of properties fail, **warns** on any fail/warning, else
**passes**. Items with no supporting data report `warning` rather than a false
`pass`. The 10 items follow the brief's numbering (utilization, cost efficiency,
headcount mismatch, conference capacity, support redundancy, geographic
concentration, lease lock-in, space-type mix, occupancy variance, cost variance).

## Opportunities (brief §4.4)

`engine/opportunities.ts`, ranked by savings-to-implementation-cost ratio then
absolute savings (brief §5.2 step 5):

- **Consolidation** — same-market pair whose combined headcount is < 60% of the
  portfolio and combined cost > 8%; eliminates the lower-cost site, savings = its
  ongoing cost, implementation = migration (50% of that cost) + lease break
  penalty.
- **Sublease** — occupancy < 50%, gross lease, > 2 yrs remaining; revenue from
  excess SF at own PSF proxy, less 17.5% broker/fit-out.
- **Space-mix** — private office > 50% and occupancy < 70%; utilities savings
  (12.5% of assumed utilities) vs. ~$15/SF reconfiguration.
- **Renegotiation** — cost/SF > 30% above portfolio average, gross lease,
  > 1 yr remaining; 15% conservative rent reduction.

Two MVP proxies worth noting (both isolated in `benchmarks.OPPORTUNITY_PARAMS`
and `normalize.withinProximity`): "within 15 miles" is approximated as same
city+state (no geocoding in MVP), and local sublease market rate uses the
property's own rent PSF. Both are Phase-2 upgrades once CoStar/geocoding data is
available.

## Utilization issues (brief §5.2 step 6)

`engine/issues.ts` classifies each under/over-utilized property into
`low_occupancy`, `wrong_space_mix`, `lease_lock_in`, `geographic_mismatch`, or
`poor_design`, with severity scaled by how far below the utilization floor it is.
