# Portfolio Intake Wizard — Build Spec (Lovable)

The guided, step-by-step data-entry flow for teams entering portfolio data **by
hand** (not importing from CSV or an outside system). This is the definitive spec
for the wizard; it expands "Screen 4" of `LOVABLE_BUILD.md`. Build the forms in
Lovable from this document. The backend already supports every field — nothing
here needs a schema change.

---

## 1. Goals & principles

- **Guided, one thing at a time.** Never show a 40-field form. Walk the user
  through Organization → Portfolio → each Property (four short sub-steps) → Review.
- **Explain the "why".** Each step states, in plain language, *what report output
  it unlocks*. This is what turns data entry into understanding.
- **Validate inline, save as you go.** Enforce the rules in §7 on blur and on
  "Save & continue". Persist to Supabase after each sub-step so the user can
  leave and resume (see §6).
- **Progress is always visible.** A left rail shows every step with a completeness
  tick; a readiness panel shows which analyses are unlocked so far.
- **Calm, data-clean UI.** Corporate real-estate / finance audience. Segmented
  controls for enums, `$`/`SF` suffixes, right-aligned tabular figures, generous
  spacing. Semantic color (green/amber/red) only for status, never as decoration.

## 2. Information architecture

```
Entry → Path chooser:  [Guided manual entry]  [Import CSV]  [Connect a system — soon]
                              │
Guided wizard:
  Step 1  Organization profile        (org-level context)
  Step 2  Portfolio overview          (names the single portfolio)
  Step 3  Properties  (repeat per building)
            3a  Property basics
            3b  Lease & cost
            3c  Occupancy
            3d  Space mix
          → "Add another property"  or  "Continue to review"
  Step 4  Review & run analysis
```

- **Launch:** after workspace resolution (`LOVABLE_BUILD.md` Screen 2), if the
  portfolio has no properties, open the wizard automatically. Always reachable via
  a "Guided setup" / "Add property" button.
- **Layout:** left **progress rail** (steps + per-property sub-step ticks) · center
  **form panel** · right **Analysis Readiness** panel (§5). Sticky footer:
  `Back` · autosave indicator · `Save & continue`.
- **Roles:** viewers can't enter data — hide the wizard, show read-only. Editors
  and admins can run it.

## 3. The data-to-output map (show this to users)

This mapping is the backbone of the "what this unlocks" microcopy and the
readiness panel. Every field earns its place by feeding an output.

| Step | Data captured | Unlocks in the analysis |
|---|---|---|
| 3a Basics | rentable SF, on-site headcount, market tier | Portfolio totals, SF-per-employee, benchmark target |
| 3b Lease & cost | rent, CAM, utilities, parking, tax, insurance, janitorial; TI (+allowance), furniture, build-out, moving; term; break clause | Operating **and** fully-loaded cost/SF, cost-per-employee/seat, operating-expense breakdown, benchmark variance, cost-efficiency flags (#2, #10), lease lock-in (#7), CoStar cost comparison, renegotiation & consolidation opportunities |
| 3c Occupancy | desks occupied/available, data source, date | Utilization & occupancy rates, low-use flags (#1, #3, #9), sublease opportunity |
| 3d Space mix | SF + seats per space type, room utilization | Space-mix flags (#4 conference, #5 support, #8 private-office), reconfiguration opportunity, "wrong space mix" diagnosis |

A property is **analyzable** with Basics + (Lease or Occupancy). It's **complete**
with all four sub-steps. Missing data degrades gracefully — the report simply
notes lower confidence (see completeness, §5).

## 4. Step-by-step specification

For every field: **label** · type · required? · options · helper microcopy.
Validation is consolidated in §7; the Supabase write for each step is in §8.
All enum values are exactly as listed (they're enforced by the database).

### Step 1 — Organization profile
Intro: *"Tell us about your organization. This frames your reports; it doesn't
change the math."*

| Field | Type | Required | Notes |
|---|---|---|---|
| Organization name | text | yes | prefilled from the org; editable |
| Industry | select | no | Technology · Financial Services · Healthcare · Legal · Professional Services · Manufacturing · Other |
| Primary region | text/select | no | e.g. "US West", "Northeast" |
| Notes | textarea | no | anything worth remembering |

### Step 2 — Portfolio overview
Intro: *"Your organization has one portfolio. Name it, then we'll add each
property."* Show a 4-icon preview of what each property needs (basics, lease,
occupancy, space) to set expectations.

| Field | Type | Required |
|---|---|---|
| Portfolio name | text | yes (default `"<Org> Portfolio"`) |
| Notes | textarea | no |

### Step 3a — Property basics
Intro: *"Start with the building itself."* Unlocks: *portfolio size and your
cost-per-employee baseline.*

| Field | Type | Required | Options / helper |
|---|---|---|---|
| Property name | text | yes | e.g. "HQ Tower" |
| Address | text | yes | street |
| City / State / ZIP | text ×3 | yes | |
| Ownership | segmented | yes | **Leased** · **Owned** (`leased` / `owned`) |
| Total rentable SF | number (SF) | yes | must be > 0 |
| On-site headcount | number | yes | people who work here; 0 allowed |
| Market tier | segmented | recommended | **Tier 1** major metro · **Tier 2** secondary · **Tier 3** suburban. Helper shows the cost benchmark: Tier 1 ≈ $30/SF, Tier 2 ≈ $21.50/SF, Tier 3 ≈ $15/SF (default $20 if unset) |
| More detail ▸ (collapsed) | — | no | Usable SF · Floors · Year built |

### Step 3b — Lease & cost
Intro (leased): *"What does this space really cost?"* Intro (owned): *"Enter the
lease term and annual carrying costs."* Unlocks: *true cost per SF (operating &
fully-loaded), benchmark comparison, cost-efficiency flags, and renegotiation /
consolidation opportunities.* Present as three groups so it never feels like one
giant form — **Lease term**, **Recurring annual costs**, **One-time / build-out
costs** (the last two collapsible, "add what you have").

**Lease term**

| Field | Type | Required | Options / helper |
|---|---|---|---|
| Lease structure | segmented | yes | **Gross** · **Triple net** · **Modified gross** (`gross` / `triple_net` / `modified_gross`) |
| Lease start / end | date ×2 | yes | end after start; the **term** (years) is derived and shown — it drives capital amortization and lock-in flags |
| Has an early-exit (break) clause | toggle | no | when on, reveal ↓ |
| Break date | date | if toggle on | must fall within the lease term |
| Break penalty type | segmented | if toggle on | **% of remaining rent** · **Fixed amount** · **None** (`percentage_of_remaining` / `fixed_amount` / `none`) |
| Break penalty amount | number | conditional | 0–100 if %; ≥ 0 if fixed |

**Recurring annual costs ($/yr)** — the operating cost of the space

| Field | Type | Required | Helper |
|---|---|---|---|
| Base rent | number ($) | yes | annual base rent |
| CAM / operating expenses | number ($) | no | common-area maintenance |
| Utilities | number ($) | no | electricity, gas, water |
| Parking | number ($) | no | parking cost |
| Property tax | number ($) | no | esp. owned or NNN pass-through |
| Insurance | number ($) | no | |
| Janitorial | number ($) | no | cleaning / day-porter |
| Other recurring | number ($) | no | anything else annual |

**One-time / build-out costs ($)** — amortized over the lease term

| Field | Type | Required | Helper |
|---|---|---|---|
| Tenant improvement (TI) cost | number ($) | no | total build-out spend |
| **TI allowance** | number ($) | no | landlord's contribution — **subtracted** from TI/capital |
| Furniture / FF&E | number ($) | no | |
| Construction / build-out | number ($) | no | if separate from TI |
| Moving costs | number ($) | no | |
| Other one-time | number ($) | no | |

Show a live *"Fully-loaded ≈ operating + (net capital ÷ term)"* readout so users
see the true annual cost as they enter capital items and the TI allowance.

### Step 3c — Occupancy
Intro: *"How full is this space, really?"* Unlocks: *utilization & occupancy
rates, under-use flags, and sublease opportunities.*

| Field | Type | Required | Options / helper |
|---|---|---|---|
| Data source | select | yes | Badge access · Occupancy sensor · Security system · Desk hoteling · Space management · Manual estimate (`badge_access` / `occupancy_sensor` / `security_system` / `desk_hoteling` / `space_management` / `manual_entry`) |
| Measurement date | date | yes | can't be in the future |
| Desks occupied (typical) | number | yes | ≥ 0 |
| Desks available (total) | number | yes | > 0, and ≥ desks occupied |
| Occupancy rate % | number | no | optional override; else derived |

Show a live derived line: *"Utilization ≈ occupied ÷ available = **NN%**"* as they type.

### Step 3d — Space mix
Intro: *"How is the floor space used?"* Unlocks: *space-mix red flags and
reconfiguration savings.* This is the step your team most wanted made easy — make
it a **live allocator**, not a blank grid.

- Show the property's **Total rentable SF** as the budget.
- A repeatable row list. Each row:

| Field | Type | Required | Options |
|---|---|---|---|
| Space type | select | yes | Private office · Open collaborative · Conference rooms · Phone booths · Focus areas · Amenity / support (`private_office` / `open_collaborative` / `conference_rooms` / `phone_booths` / `focus_areas` / `amenity_support`) |
| Allocated SF | number (SF) | yes | ≥ 0 |
| Seats / desks | number | no | seats in this space type |
| Utilization % | number | no | **especially for Conference rooms** — drives flag #4 |

- **Live math** (the key interaction): a bar and readout —
  *Allocated **X** of **Y** SF · **Z** remaining* — updating as they edit.
  Turn the remaining figure amber when it's < 0 (over-allocated) or when a large
  share is still unassigned. Don't hard-block a mismatch (buildings have
  circulation/core), but nudge toward accounting for the space.
- "Add space type" adds a row; offer a one-tap "Prefill common types" (private
  office, open collaborative, conference rooms, amenity/support).

After 3d: **"＋ Add another property"** (loops to 3a for a new building) or
**"Continue to review"**.

### Step 4 — Review & run analysis
- **Portfolio summary:** total properties, total SF, total headcount, overall
  data-completeness % (§5).
- **Per-property cards:** name, SF, ownership, and a completeness ring with the
  missing pieces listed ("No occupancy data", "Space mix not entered"). Each card
  links back to the relevant sub-step to fix.
- **Primary action: "Run analysis"** → calls the `analyze` Edge Function
  (`LOVABLE_BUILD.md` Screen 5) and routes to the dashboard. Allow running even if
  incomplete; show a gentle note about which flags/opportunities stay dark until
  the missing data is added.

## 5. Completeness & readiness model

Mirror the engine's own scoring so the UI and the report agree. Per property,
completeness = presence of the three data categories, each worth one-third:

- **Cost** — at least one lease with rent entered.
- **Occupancy** — at least one occupancy record.
- **Space** — at least one space-breakdown row.

Basics is the prerequisite (a property can't exist without it). Portfolio
completeness = mean of per-property completeness. Show it as a percentage and
drive the **Analysis Readiness** panel, which lights up five output groups as
their inputs arrive across the portfolio:

1. **Portfolio metrics** — any property with Basics.
2. **Utilization analysis** — any property with Occupancy.
3. **Cost benchmarking** — any property with Lease/cost.
4. **Space-mix analysis** — any property with Space mix.
5. **Opportunity finder** — brightest when cost + occupancy (+ space) are present.

Each item: lit (green check) / partial (amber) / not yet (grey), with a one-line
"add X to unlock" hint.

## 6. Save, resume & drafts

**Persist progressively to the real tables** — no separate draft store needed:

- Insert the **property** when Step 3a is saved (so 3b–3d rows can FK to it).
- Insert **lease / occupancy / space** rows as each sub-step is saved.
- Editing a completed sub-step updates the existing rows.

Because everything is RLS-protected and already in the tables, "resume" is just
reading current state and re-deriving completeness — a user can close the tab and
return to exactly where they were. Partial data is valid; the analysis simply
reflects lower completeness. (Optional nicety: a boolean `setup_complete` flag on
the portfolio, flipped at Review — not required.)

## 7. Validation rules (enforce client-side; DB enforces too)

Mirror these exactly — they match `engine/validation.ts` and the database CHECK
constraints, so client and server agree and error messages are predictable.

**Property:** name required (≤255); address/city/state/zip required;
`total_rentable_sf` > 0; `total_usable_sf` > 0 if given; `headcount_on_site` ≥ 0
(integer); `occupancy_rate_percent` 0–100 if given; ownership & market tier must
be from their option lists.

**Lease:** `lease_start_date` < `lease_end_date`; `annual_rent` ≥ 0; every other
cost field (`cams_annual`, `utilities_annual`, `parking_annual`,
`property_tax_annual`, `insurance_annual`, `janitorial_annual`,
`other_annual_costs`, `tenant_improvement_cost`, `tenant_improvement_allowance`,
`furniture_ffe_cost`, `construction_buildout_cost`, `moving_cost`,
`other_one_time_costs`) ≥ 0 if given; if break clause on → `break_date` **and**
penalty type required, `break_date` within the lease term; penalty amount 0–100
for "% of remaining", ≥ 0 for "fixed".

**Occupancy:** `measurement_date` ≤ today; `occupied_desks` ≥ 0;
`total_desks_available` > 0; `occupied_desks` ≤ `total_desks_available`; rates
0–100 if given.

**Space:** `allocated_sf` ≥ 0; `allocated_headcount` ≥ 0;
`utilization_rate_percent` 0–100 if given. (Sum-vs-rentable is a *warning*, not a
hard error.)

**Error copy style:** say what's wrong and how to fix it — "End date must be after
the start date," not "Invalid date." No apologies.

## 8. Supabase writes per step

Use the signed-in user's Supabase client (RLS applies). `ws` is the resolved
workspace from `my_workspaces`. Set `org_id` on every insert.

```ts
// Step 1 — Organization profile
await supabase.from('organizations')
  .update({ name, industry, primary_region, notes }).eq('id', ws.org_id);

// Step 2 — Portfolio
await supabase.from('portfolios')
  .update({ name, notes }).eq('id', ws.portfolio_id);

// Step 3a — Property basics  → keep the returned id for the sub-steps
const { data: property } = await supabase.from('properties').insert({
  org_id: ws.org_id, portfolio_id: ws.portfolio_id,
  name, address, city, state, zip,
  property_type,            // 'leased' | 'owned'
  total_rentable_sf, headcount_on_site,
  market_tier,              // 'tier1' | 'tier2' | 'tier3' | null
  total_usable_sf, number_of_floors, year_built,   // optional
}).select('id').single();

// Step 3b — Lease & cost
await supabase.from('leases').insert({
  org_id: ws.org_id, property_id: property.id,
  lease_type, lease_start_date, lease_end_date,
  // recurring operating ($/yr)
  annual_rent, cams_annual, utilities_annual, parking_annual,
  property_tax_annual, insurance_annual, janitorial_annual, other_annual_costs,
  // one-time / capital ($) — TI allowance is a credit
  tenant_improvement_cost, tenant_improvement_allowance, furniture_ffe_cost,
  construction_buildout_cost, moving_cost, other_one_time_costs,
  // break clause
  has_break_clause, break_date, break_penalty_type, break_penalty_amount,
});

// Step 3c — Occupancy
await supabase.from('occupancy_records').insert({
  org_id: ws.org_id, property_id: property.id,
  data_source, measurement_date, occupied_desks, total_desks_available,
  occupancy_rate_percent,   // optional
});

// Step 3d — Space mix  (one row per space type)
await supabase.from('space_breakdowns').insert(
  rows.map(r => ({
    org_id: ws.org_id, property_id: property.id,
    space_type: r.space_type, allocated_sf: r.allocated_sf,
    allocated_headcount: r.allocated_headcount,
    utilization_rate_percent: r.utilization_rate_percent,  // optional
  }))
);

// Step 4 — Run analysis
const { data: analysis } = await supabase.functions.invoke('analyze', {
  body: { portfolio_id: ws.portfolio_id },
});
```

For editing an already-saved sub-step, swap `.insert` for `.update(...).eq('id', rowId)`
(or delete + re-insert the space rows, which is simplest for the allocator).

## 9. UI/UX checklist for Lovable

- **Progress rail** with Organization · Portfolio · each Property (expandable to
  its 4 sub-steps) · Review; check/partial/empty ticks per the completeness model.
- **Sticky footer:** `Back` · autosave ("Saved ✓") · `Save & continue`
  (disabled until the step's required fields pass).
- **Segmented controls** for ownership, lease structure, market tier, break
  penalty; **selects** for industry, data source, space type.
- **Numbers:** right-aligned, tabular figures, `$` / `SF` / `%` affordances,
  thousands separators.
- **Inline validation** on blur and on continue; summary of remaining issues at
  the top of a step if the user tries to advance.
- **Space allocator:** live "X of Y SF · Z remaining" bar; amber when over or
  largely unallocated; "Prefill common types".
- **Readiness panel** (§5) persistent on desktop, collapsible on mobile.
- **Responsive:** rail collapses to a top stepper on narrow screens; forms go
  single-column; the readiness panel moves below the form.
- **Accessibility:** labeled inputs, visible focus states, keyboard-navigable
  segmented controls, `aria-live` on the autosave + allocator readouts.
- **Empty & done states:** first-run "Let's set up your portfolio" launch;
  Review "You're ready to analyze" with the completeness summary.

## 10. Field → column quick reference

| Wizard field | Table.column | Enum values |
|---|---|---|
| Ownership | `properties.property_type` | `owned`, `leased` |
| Market tier | `properties.market_tier` | `tier1`, `tier2`, `tier3` |
| Lease structure | `leases.lease_type` | `gross`, `triple_net`, `modified_gross` |
| Break penalty type | `leases.break_penalty_type` | `percentage_of_remaining`, `fixed_amount`, `none` |
| Occupancy data source | `occupancy_records.data_source` | `badge_access`, `occupancy_sensor`, `security_system`, `desk_hoteling`, `space_management`, `manual_entry` |
| Space type | `space_breakdowns.space_type` | `private_office`, `open_collaborative`, `conference_rooms`, `phone_booths`, `focus_areas`, `amenity_support` |

Everything else maps by name to the columns in `docs/DATA_MODEL.md`.
