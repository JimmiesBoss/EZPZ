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
| Benchmark variance | `((actual_cost_per_sf_per_employee − benchmark_target) / benchmark_target) × 100` | `metrics.computeProperty` |
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

### ⚠️ Known ambiguity: "cost per SF per employee"

The brief defines the metric (§4.1) as `(cost / SF) / headcount` — dollars per SF
*per employee* — but the benchmark table (§4.2) lists `$12–$35 per SF per
employee`, which is the scale of **cost per SF** (rent PSF), not cost-per-SF
divided by headcount. For any real portfolio the two are orders of magnitude
apart, so the computed variance is a large negative number.

The engine implements **both exactly as the brief specifies** (so results match a
manual calculation of the written formulas — acceptance criterion §12.2). If the
intended comparison is actually *cost per SF* vs. the tier table, it is a
one-line change in `metrics.computeProperty`: compare `costPerSf` (not
`costPerSfPerEmployee`) to `benchmarkTarget`. Flagged here for the project owner
to confirm before this drives client-facing recommendations.

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
