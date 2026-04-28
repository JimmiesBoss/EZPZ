# Widgeter — Lovable Handoff Package

This package is the complete source for **Widgeter**, an AI-powered Parts Finder Engine. It is intended for handoff to Lovable for conversion into a managed web environment.

This README is intentionally exhaustive — it duplicates the executive brief, documents every model / route / state machine, and explains what is already built versus what is mocked for the prototype. Read it end to end before starting the rebuild.

---

## Table of contents
1. Product overview
2. Problem and solution
3. Business model and pricing
4. Ideal customer profiles
5. Tech stack
6. System architecture
7. Data model (full Prisma schema)
8. State machines (request, fulfillment, escrow)
9. API surface
10. Pages and screens
11. Critical business logic
12. Source-hiding strategy
13. Category taxonomy and routing
14. Liability waivers
15. Mock components versus production
16. Setup and installation
17. Environment variables
18. Database setup
19. Running locally
20. Testing approach
21. Test scripts provided
22. Verification results
23. Aesthetic and UX direction
24. What is already built versus what is mocked
25. Roadmap to production
26. File structure
27. Glossary

---

## 1. Product overview

Widgeter is an AI-powered **parts-finder and acquisition platform**. A buyer describes a rare, discontinued, or hard-to-find component (text, photo, and/or voice) and sets a pre-authorized budget. AI agents scour marketplaces, the platform curates candidates, and the buyer reviews matches with the source marketplace, seller handle, and listing URL hidden behind neutral "Marketplace A/B/C" labels. On approval, a non-refundable service fee is captured, the source is revealed, and the platform handles the actual purchase, shipping, and dispute resolution. Buyer payment is held in a 14-day verification escrow before the seller is paid out (Net 30).

**Short pitch:** a curated, privacy-protected concierge for industrial parts that today live across eBay, Reverb, Facebook Marketplace, niche specialty retailers, and yard-pull operations.

**Two roles:**
- **Buyer** — submits requests, reviews sanitized matches, approves, verifies delivery, opens disputes.
- **Operator** — internal staff. Inbox of all active requests; can re-run search, hide / edit / approve matches, attach proof-of-functionality videos, advance fulfillment, resolve disputes, release payouts.

**Three input modes (used together):** structured text + 5 photos (Claude Vision) + voice note (Whisper).

**Mobile-first PWA** — most buyers are in a shop / under a hood / on a job site when they need a part.

---

## 2. Problem and solution

Sourcing rare or discontinued parts today is fragmented and time-expensive:

- A part for a 1974 amp, a discontinued appliance board, or a 30-year-old tractor injector can take **hours of searching across five or more marketplaces**.
- Listings are inconsistent, photos are bad, and authentication is buyer-beware.
- Professionals (mechanics, restorers, cafe operators) bill at $80–$200/hr; spending an afternoon hunting a $40 part is poor economics.
- Casual marketplaces are full of counterfeits, mis-listings, and "for parts only" units misrepresented as working.
- Direct buyer ↔ seller contact lets sourcing relationships get bypassed, undermining any business that organizes the supply.

Widgeter consolidates the hunt into one structured intake, applies AI parsing + curation, hides sourcing details until acquisition is committed, and ships a verified part. The user trades time + a flat service fee for **certainty, curation, and time saved**.

---

## 3. Business model and pricing

### Revenue streams (in priority order)
1. **Service fee** — flat **$25 non-refundable** per approved request, captured at the moment of buyer approval. This covers curation, acquisition labor, and dispute support. Tunable per-category (e.g. could go to $50 for high-touch categories like commercial kitchen, or % of budget for very high-value categories like agricultural).
2. **Procurement margin** — the spread between the buyer's pre-authorized budget and the actual price the platform negotiates / sources at. Hidden from the buyer; never disclosed. Example: buyer budgets $250, operator sources at $180, platform retains the $70 spread plus the $25 service fee.
3. **Marketplace data** (post-MVP) — anonymized aggregated search-pattern and inventory-availability insights sold to suppliers, manufacturers, and retailers who want to understand demand for discontinued parts. Never identifies individual users or locations.
4. **B2B partnerships** (post-MVP) — white-label or category-specific deals with suppliers (e.g., AG dealers, marine distributors) who want a sourcing channel for the long tail.

### Pricing model
- **Service fee:** $25 per approved request, non-refundable. Disclosed up-front in the wizard, again in the approval modal, and again on the order confirmation.
- **Pre-authorized budget:** buyer sets an upper bound at intake. Platform never exceeds it; difference between budget and actual is platform margin.
- **No subscription** for buyers. (Operator seats are internal staff, not paid.)
- **Future:** tiered subscription for high-volume professionals (e.g., a fleet manager submitting 20+ requests/month gets a discounted service fee).

### Unit economics (target at scale)
- **Average order value:** $80–$400 depending on category. Tier 1 categories (automotive, agricultural, marine) skew higher.
- **Service fee realization:** $25 × conversion rate (target 35-50%) = $9–$12.50 per submitted request.
- **Procurement margin:** target 15–25% of item price. On a $200 average item, that is $30–$50.
- **Combined revenue per closed transaction:** $55–$75.
- **Operator labor cost:** target 15-30 minutes per closed request at $25/hr loaded = $6–$13. Margin per closed transaction: ~$45–$65.
- **CAC:** unmodeled; depends on channel. Trade-publication ads and category-specific community partnerships (e.g., audiophile forums, AG cooperatives) likely outperform broad digital.

### Escrow mechanics (regulatory and trust posture)
- Buyer total = item price + shipping + service fee.
- On approval: full total **authorized**, service fee captured immediately, item portion held.
- On delivery: 14-day buyer verification window starts.
- On verify: item portion captured, seller payout scheduled for delivery + 30 days (Net 30).
- On dispute: operator resolves to refund (item portion only — service fee never refunds) or override-to-verified.
- On 30-day mark + verified state: operator releases payout.
- This mirrors marketplace patterns (Reverb, eBay Money Back Guarantee). For production, a real escrow provider or Stripe Connect with delayed transfers handles this; the prototype tracks state only.

### Refund policy
- **Service fee:** never refundable. Disclosed at three points (wizard, approval modal, post-confirm).
- **Item + shipping:** fully refundable inside the 14-day window if the part doesn't match spec or arrives damaged. Buyer must provide photo evidence; operator adjudicates.
- After 14 days without action, the order auto-finalizes and the seller payout becomes due.

### Liability posture
Per-category waivers are mandatory before submission. Each waiver explicitly transfers post-delivery installation, fire, electrical, mechanical, food-safety, marine-at-sea, and personal-injury risk to the buyer. The platform's liability is bounded to part-matches-spec and damage-in-transit. Waiver text is versioned in `src/lib/waivers.ts` so a real lawyer can replace each one without schema changes — `PartsRequest.waiverVersion` records which version the buyer accepted.

---

## 4. Ideal customer profiles

### Primary (Tier 1 categories — biggest revenue per request)
1. **Independent mechanics & fleet operators** — sourcing OEM and reman parts for 5–25 year-old vehicles. Time-poor, $80–150/hr loaded rate, comfortable paying $25 to skip a 90-minute hunt.
2. **Property managers, landlords, and appliance repair techs** — older washers, dryers, fridges, dishwashers. Repair-vs-replace economics have shifted since 2020.
3. **Farmers and farm cooperatives** — tractor, combine, implement parts. Right-to-repair tailwinds; very low fraud (serial-number-keyed equipment); willing to wait days because downtime is expensive.
4. **Marine operators and recreational boat owners** — outboards, navigation, onboard systems. High-value equipment, professional installers, low return rates.

### Secondary (Tier 2 — high margin, very low returns)
5. **Professional woodworkers, metalworkers, and small fabrication shops** — keeping older Powermatic, Delta, Jet, and CNC machines running.
6. **Tailors, alteration shops, costume / textile makers** — industrial Singer, Bernina, Juki, Pfaff equipment.
7. **Trade contractors** (electricians, plumbers, finish carpenters) — specialty bits, blades, one-off tools.

### Tertiary (Tier 3 — passion-driven, premium-tolerant)
8. **Audiophile and vintage-amp restorers** — tubes, transformers, capacitors, tonearms.
9. **Film-photography enthusiasts and studios** — shutters, lens elements, light meters, darkroom parts.
10. **Cafe and restaurant owners** — La Marzocco, Synesso, Mahlkönig, Vitamix without dealer markup.
11. **Arcade operators and retro-gaming hobbyists** — cabinets, consoles, PCBs, controllers.

### Common traits across ICPs
- Willing to pay **$25–$100 for time saved**, not for the part itself.
- Tolerance for **3 days to 4 weeks** sourcing latency in exchange for confidence.
- Specific, technical use case — they know what they want or can describe it well enough.
- Repair / restoration / maintenance mindset, not collectors or flippers.

---

## 5. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | One codebase covers UI + API routes; PWA-ready; SSR/RSC for SEO and fast first paint |
| Language | TypeScript (strict) | Type safety across data model and API |
| Database | SQLite via Prisma (prototype) | Zero setup. **For Lovable prod, swap to PostgreSQL** — schema is identical |
| ORM | Prisma 5 | Type-safe queries, migrations, tooling |
| Auth | NextAuth.js v4 + Google OAuth + JWT | Production-grade, role-aware via JWT augmentation |
| AI parsing | Claude Sonnet 4.6 (Anthropic API) | Vision-capable, strong structured-extraction |
| Voice transcription | OpenAI Whisper API | Best price/quality, simple multipart REST |
| Styling | Tailwind CSS | Mobile-first, fast iteration, no design tokens to invent |
| File storage | Local filesystem (prototype) | **For Lovable prod, swap to S3 / R2 / Vercel Blob** — `src/lib/storage.ts` is the single point to change |
| Voice capture | Browser MediaRecorder API | No deps; works in PWA |
| PWA | Manifest + service worker | Installable on iOS / Android home screen |
| Payments | Mock state machine (prototype) | **For Lovable prod, swap to Stripe Connect** — `src/lib/payments.ts` is the single point to change |
| Marketplace search | Mock seeded fixtures (prototype) | **For Lovable prod, real connectors per marketplace** — `src/lib/search.ts` is the single point to change |

---

## 6. System architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Buyer browser (PWA)        Operator browser                 │
│   - intake wizard            - inbox                         │
│   - clarification chat       - request console               │
│   - match cards (sanitized)  - match editor                  │
│   - order timeline           - fulfillment + escrow controls │
└─────────────┬────────────────────────┬───────────────────────┘
              │                        │
              ▼                        ▼
┌──────────────────────────────────────────────────────────────┐
│              Next.js 14 App Router (single deploy)           │
│                                                              │
│   /(app)/* routes (session-gated)                            │
│   /api/* routes (auth + role guards)                         │
│                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│   │  src/lib     │  │ src/lib      │  │ src/lib          │   │
│   │  /auth       │  │ /claude      │  │ /search          │   │
│   │  /roles      │  │ /whisper     │  │ /sanitize        │   │
│   │  /prisma     │  │ /storage     │  │ /payments        │   │
│   │              │  │              │  │ /escrow          │   │
│   │              │  │              │  │ /stateMachine    │   │
│   │              │  │              │  │ /audit           │   │
│   │              │  │              │  │ /categories      │   │
│   │              │  │              │  │ /routing         │   │
│   │              │  │              │  │ /waivers         │   │
│   └──────────────┘  └──────────────┘  └──────────────────┘   │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          ▼                  ▼                  ▼
   ┌───────────┐      ┌────────────┐    ┌────────────────┐
   │  SQLite / │      │  Claude    │    │  Mock search   │
   │  Postgres │      │  Whisper   │    │  worker        │
   │  (Prisma) │      │  APIs      │    │  (in-process)  │
   └───────────┘      └────────────┘    └────────────────┘
                                              ▲
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │  Future:     │
                                       │  real        │
                                       │  marketplace │
                                       │  connectors  │
                                       │  (eBay,      │
                                       │   Reverb,    │
                                       │   Amazon, …) │
                                       └──────────────┘
```

Single deploy. The "search worker" is currently an in-process module that returns canned fixtures; in production it would be either (a) an out-of-process worker calling marketplace APIs and posting back via `/api/search/callback`, or (b) called inline.

---

## 7. Data model (full Prisma schema)

The full schema is in `prisma/schema.prisma`. Key models:

### `User`
```
id (cuid, PK)
email (unique)
name, image, googleId (unique, nullable)
role: "BUYER" | "OPERATOR"   // string for SQLite compatibility
isAdmin: boolean              // operator sub-flag
createdAt
+ NextAuth: accounts, sessions
+ App relations: requests (as buyer), curations (as curator),
                 clarifications (answered by), auditLogs
```

### `PartsRequest` (the central entity)
```
id, buyerId (→ User), curatorId? (→ User)
primaryCategory  // one of 11 (see categories.ts)
subCategory
title
rawDescription
transcript?      // voice note transcript
audioUrl?        // /api/media/audio/<file>
specs            // JSON: brand, model, partNumber, year, condition,
                 //       dimensions, identifyingMarks[], colors[],
                 //       searchKeywords[], notes
missingFields    // JSON string[]
rejectionReasons // JSON string[]
budgetCents
serviceFeeCents (default 2500)
waiverVersion?           // e.g. "audio-v1@1.0"
waiverAcceptedAt?
status          // see state machine §8
paymentAuthId?
createdAt, updatedAt
+ relations: images[], messages[], matches[], order?
```

### `RequestImage`
```
id, requestId (→ PartsRequest, cascade delete)
url             // /api/media/images/<file>
visionSummary?  // optional Claude Vision summary per image
createdAt
```

### `ClarificationMessage`
```
id, requestId (→ PartsRequest, cascade delete)
direction       // "SYSTEM" | "USER" | "OPERATOR"
content
answeredById? (→ User)
createdAt
```

### `Match`
```
id, requestId (→ PartsRequest, cascade delete)

// SENSITIVE — hidden from buyer until BUYER_APPROVED:
sourceMarketplace   // ebay | etsy | reverb | mercari | tractorhouse | amazon | facebook | specialty
listingUrl
sellerHandle
sellerLocation

// Always safe to show:
displayLabel        // "Marketplace A/B/C/D" — stable per request
title
priceCents
shippingCents
condition
thumbnailUrl?
specHighlights      // JSON
proofVideoUrl?      // mandatory before BUYER_APPROVED for category=gaming
confidence          // float 0-1
status              // see state machine §8
hiddenFromBuyer     // operator can suppress
createdAt, updatedAt
+ relations: order?
```

### `Order` (created on buyer approval)
```
id
requestId (unique → PartsRequest)
matchId   (unique → Match)
totalCents
paymentStatus           // "NONE" | "AUTHORIZED" | "CAPTURED" | "REFUNDED" | "FAILED"
fulfillmentStatus       // "PENDING" | "PURCHASED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"
escrowState             // "HELD" | "BUYER_VERIFIED" | "SELLER_PAID" | "DISPUTED" | "REFUNDED"
buyerVerificationDeadline?  // delivered + 14 days
sellerPayoutReleaseAt?      // captured + 30 days
trackingNumber?
notes?
timeline                // JSON [{at, event, actorId}]
createdAt, updatedAt
```

### `AuditLog`
```
id, event, requestId?, matchId?, orderId?, actorId? (→ User)
metadata (JSON)
createdAt
```

NextAuth models (`Account`, `Session`, `VerificationToken`) are unchanged from the standard Prisma adapter.

**Note for Lovable:** SQLite stores enums as `String` and JSON as `String`. When migrating to Postgres, switch enums to native Postgres enums and JSON columns to `Json` type for query-ability.

---

## 8. State machines

Centralized in `src/lib/stateMachine.ts`. All status writes funnel through `canTransition*` guards.

### `PartsRequest.status`
```
DRAFT ──submit──▶ SUBMITTED ──parse──▶ CLARIFYING ⇄ SUBMITTED
                                  └──no-missing──▶ SEARCHING
                                                      │
                              worker callback ────────▶ CURATED
                                                      │
                            operator publishes ──────▶ AWAITING_REVIEW
                                                      │
                                buyer approves ──────▶ APPROVED ──▶ ACQUIRING
                                                      │                │
                                                      ▼                ▼
                                                  CANCELLED         SHIPPED ──▶ DELIVERED
                                                      ▲
                                  routing reject ─────┘  REJECTED (terminal)
```

### `Match.status`
```
PROPOSED ─▶ APPROVED_BY_OPERATOR ─▶ PRESENTED ─▶ BUYER_APPROVED
                                              └─▶ REJECTED
                                              └─▶ WITHDRAWN  // siblings on approval of one
```

### `Order.fulfillmentStatus`
```
PENDING ─▶ PURCHASED ─▶ IN_TRANSIT ─▶ DELIVERED
                                  └─▶ CANCELLED
```

### `Order.paymentStatus`
```
NONE ─▶ AUTHORIZED ─▶ CAPTURED ─▶ REFUNDED  // remainder only; fee never refunds
                              └─▶ FAILED
```

### `Order.escrowState` (runs in parallel with fulfillment)
```
HELD ─verify──▶ BUYER_VERIFIED ─release──▶ SELLER_PAID
   └─dispute─▶ DISPUTED ─resolve─▶ REFUNDED   // or back to BUYER_VERIFIED
```

- `HELD` from order creation; service fee captured immediately.
- On `fulfillmentStatus = DELIVERED`, set `buyerVerificationDeadline = now + 14d`.
- Buyer **Verify** → `BUYER_VERIFIED`, capture remainder, set `sellerPayoutReleaseAt = capturedAt + 30d`.
- Buyer **Open dispute** → `DISPUTED` (operator-only resolutions).
- Operator **Release payout** on/after `sellerPayoutReleaseAt` → `SELLER_PAID`.
- Operator-only **fast-forward clock** collapses both timers (demo aid; remove or gate behind admin flag in production).

---

## 9. API surface

All routes are in `src/app/api/`. Auth via NextAuth session cookie. Role guards in `src/lib/roles.ts` (`getSessionUser`, `requireBuyer`, `requireOperator`).

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | Liveness probe | public |
| GET | `/api/categories` | Full taxonomy for dropdown | public |
| POST | `/api/routing` | `{text}` → `exact` / `partial` / `unclear` / `reject` | session |
| GET | `/api/waivers?category=…` | Per-category waiver body | public |
| POST | `/api/requests` | Create new request: validate, run Claude Flow A, persist, dispatch search if no missing fields | BUYER |
| GET | `/api/requests` | List requests (mine for buyer, all for operator) | session |
| POST | `/api/requests/[id]/clarify` | Append USER answer, run Claude Flow B, recompute status, dispatch search if resolved | request owner |
| POST | `/api/requests/[id]/search` | Operator re-triggers mock worker | OPERATOR |
| POST | `/api/media/upload` | Multipart image upload (≤5×4MB) | session |
| POST | `/api/intake/voice` | Multipart audio upload, transcribe via Whisper, return transcript + saved URL | session |
| GET | `/api/media/[kind]/[filename]` | Session-gated file serve for `images` or `audio` | session |
| PATCH | `/api/matches/[id]` | Operator: hide / show / set proof video / edit price / edit condition | OPERATOR |
| POST | `/api/matches/[id]/approve` | Buyer: approve match → authorize total, capture fee, create Order, withdraw siblings, reveal source for this match | BUYER (request owner) |
| POST | `/api/orders/[id]/advance` | Operator: PURCHASED / IN_TRANSIT (with tracking) / DELIVERED | OPERATOR |
| POST | `/api/orders/[id]/verify` | Buyer: verify within 14 days → BUYER_VERIFIED, capture remainder | BUYER (order owner) |
| POST | `/api/orders/[id]/dispute` | Buyer: open dispute within 14 days | BUYER (order owner) |
| POST | `/api/orders/[id]/release-payout` | Operator: release after 30 days → SELLER_PAID | OPERATOR |
| POST | `/api/orders/[id]/fast-forward` | **Demo only** — collapse both escrow timers | OPERATOR |
| GET / POST | `/api/auth/*` | NextAuth | n/a |

### Request / response sketches

**`POST /api/routing`**
```json
// Request
{ "text": "2012 Chevy Silverado alternator" }
// Response (exact)
{ "mode": "exact", "primary": { "id": "automotive", "label": "Automotive Parts" },
  "sub": { "id": "engine", "label": "Engine Components" }, "confidence": 0.5 }
// Response (reject)
{ "mode": "reject", "reason": "Collectibles are out of scope.",
  "message": "We don't currently support that search. …" }
```

**`POST /api/requests`**
```json
// Request
{
  "primaryCategory": "audio",
  "subCategory": "amp",
  "title": "1974 Fender Champ output transformer",
  "description": "5F1 circuit, primary 5K, secondary 4/8/16Ω, prefer NOS Hammond.",
  "budgetCents": 25000,
  "waiverAccepted": true,
  "imageUrls": ["/api/media/images/abc123.jpg"],
  "audioUrl": "/api/media/audio/xyz.webm",
  "transcript": "I need an output transformer for my tweed Champ…"
}
// Response
{ "id": "cmoh…", "status": "SEARCHING" }   // or CLARIFYING / REJECTED
```

**`POST /api/matches/[id]/approve`**
```json
// Response
{ "orderId": "cmoh…" }
// Error if gaming match without proof video
{ "error": "GAMING_PROOF_REQUIRED", "message": "Operator must attach a proof-of-functionality video before this match can be approved." }
```

**`POST /api/orders/[id]/advance`**
```json
// Request
{ "target": "IN_TRANSIT", "trackingNumber": "1Z999AA10123456784" }
// Response
{ "ok": true, "status": "IN_TRANSIT" }
```

---

## 10. Pages and screens

All pages are in `src/app/`. Public pages outside `(app)/`; session-gated app pages inside `(app)/` (the layout redirects to `/login` when no session).

| Path | Type | Purpose |
|---|---|---|
| `/` | Public | Marketing landing — h1, one-line pitch, CTAs to `/login` and `/requests` |
| `/login` | Public | Google sign-in button |
| `/requests` | Buyer | Dashboard list of own requests; status pill, category badge, budget; New CTA |
| `/requests/new` | Buyer | Wizard step 1 — `CategoryPicker` (text auto-route OR primary→sub dropdowns) + `RejectionDialog` for out-of-scope text |
| `/requests/new/brief` | Buyer | Wizard step 2 — title, description, photo upload (≤5×4MB), voice note (Whisper-transcribed and appended to description), budget. Draft persisted to sessionStorage. |
| `/requests/new/review` | Buyer | Wizard step 3 — summary, per-category waiver acceptance, submit |
| `/requests/[id]` | Buyer (owner) | Detail: status pill, description, audio player, photos, parsed specs, sanitized matches, clarification chat, order panel + escrow actions |
| `/operator` | Operator | Inbox of all non-terminal requests (filterable in UI), category badge, status pill |
| `/operator/[id]` | Operator | Buyer's data + `OperatorControls` (re-run search, hide/edit matches, attach proof video, advance fulfillment with tracking, fast-forward clock, release payout). Full match list with raw seller info. |

### Components (`src/components/`)
- `SessionProvider.tsx` — wraps `<NextAuthSessionProvider>`.
- `ServiceWorker.tsx` — registers `/sw.js` in production.
- `BottomNav.tsx` — mobile bottom nav: Requests, New, conditionally Operator (if role), Sign out.
- `CategoryPicker.tsx` — combo: free-text routing input + primary/sub dropdown. Calls `/api/routing` and `/api/categories`.
- `RejectionDialog.tsx` — modal shown when routing returns `reject`.
- `ClarificationChat.tsx` — message thread + inline answer input. Enabled only when `status==CLARIFYING && viewer is owner`.
- `MatchCard.tsx` — sanitized match display with confirmation modal that itemizes service fee + item + shipping = total before approval.
- `OrderTimeline.tsx` — JSON-array timeline renderer.
- `EscrowActions.tsx` — buyer-side Verify and Open Dispute buttons; only shown when `escrowState=HELD && fulfillmentStatus=DELIVERED`.
- `OperatorControls.tsx` — operator-side console with all the operator buttons.

### Hooks (`src/hooks/`)
- `useVoiceRecorder.ts` — MediaRecorder wrapper. Returns `{ isRecording, duration, error, start(), stop() }`. Stop returns a Blob.

---

## 11. Critical business logic

### What every code path must respect
1. **Source-hiding** — every read of a `Match` MUST go through `sanitizeMatch(match, viewerRole)` in `src/lib/sanitize.ts`. No route may compose a Match payload directly. Audit this before deployment — a single unsanitized leak defeats the privacy model.
2. **State machine guards** — all status transitions go through `canTransition*` in `src/lib/stateMachine.ts`. Do not write `status` fields directly without consulting the helper.
3. **Service fee never refunds** — `payments.ts` has a `refundRemainder` but no `refundFee` for a reason. Disclosed three times, captured at approval, never returned.
4. **Waiver accepted before submit** — `POST /api/requests` returns 400 `WAIVER_REQUIRED` if `waiverAccepted` is not `true`. The accepted version is recorded on `PartsRequest.waiverVersion` so disputes can reference the exact text shown.
5. **Gaming proof-of-video** — `POST /api/matches/[id]/approve` returns 409 `GAMING_PROOF_REQUIRED` if `match.proofVideoUrl` is missing on a gaming-category request. Operator must attach via `PATCH /api/matches/[id] { proofVideoUrl: "…" }` first.
6. **One approval per request** — approving a match auto-WITHDRAWs siblings. No parallel acquisitions in MVP.
7. **Audit log on every state change** — `src/lib/audit.ts` writes to `AuditLog` for every approval, advance, verify, dispute, release, fast-forward. Operator views can surface this for trust.
8. **Operator fast-forward is demo-only** — gate behind an admin or env-flag in production, or remove.

---

## 12. Source-hiding strategy

The privacy model is the heart of the business case — without it, buyers go around the platform and never come back. Implementation:

- **Sensitive fields on `Match`:** `sourceMarketplace`, `listingUrl`, `sellerHandle`, `sellerLocation`.
- **Stable display label:** `displayLabel` is computed at insert time as `"Marketplace " + LABELS[hash(requestId, sourceMarketplace) % LABELS.length]`. So a re-search returns the same label for the same marketplace within a request — buyers can compare matches consistently.
- **Sanitization rules** in `src/lib/sanitize.ts → sanitizeMatch(match, viewerRole)`:
  - `viewerRole === "OPERATOR"` → return raw row, all fields visible.
  - Buyer view, `match.status !== "BUYER_APPROVED"` → strip the four sensitive fields, expose `displayLabel`.
  - Buyer view, `match.status === "BUYER_APPROVED"` → reveal sensitive fields **for that match only**; siblings stay sanitized.
- **Enforcement:** every server-side render of a request detail page filters matches through `sanitizeMatch`. Every API GET that returns matches uses the same helper.

### Verified end-to-end
The verification scripts (see §22) prove that:
- Buyer detail page HTML contains only `Marketplace D`, `Marketplace E` text — no `reverb.com`, no `tube_amp_parts`, no `vintage_audio_seller`, no `MercuryDirect`.
- After approval of one match: that match's seller info appears (`reverb.com/example`, `tube_amp_parts`); siblings remain anonymized.
- Operator view always exposes everything.

### UX recommendation for Lovable
Surface the source-hiding deliberately. Don't let it look like missing data. Suggested treatment: a small lock icon next to `Marketplace A` with a tooltip — "Source revealed after approval to protect curated supply." This converts a feature that could feel sketchy into a trust signal.

---

## 13. Category taxonomy and routing

### The closed list (11 primary, ~70 subcategories)
The complete taxonomy lives in `src/lib/categories.ts` as a typed constant. Each entry has:

```ts
{
  id, label, tier ("T1"|"T2"|"T3"), waiverId,
  description, subcategories: [{ id, label, examples[] }],
  keywords: ["alternator","starter",…],   // for routing index
  rejectionTriggers: ["pre-1970","complete vehicle",…],
  expectedReturnRate: 0.12
}
```

The 11 categories:

| # | ID | Label | Tier | Waiver |
|---|---|---|---|---|
| 1 | `automotive` | Automotive Parts | T1 | `automotive-v1` |
| 2 | `appliance` | Small Appliance Parts | T1 | `appliance-v1` |
| 3 | `woodmetal` | Woodworking & Metalworking Equipment | T2 | `woodmetal-v1` |
| 4 | `sewing` | Sewing & Textile Equipment | T2 | `sewing-v1` |
| 5 | `gaming` | Gaming & Arcade Equipment | T3 | `gaming-v1` |
| 6 | `photo` | Vintage Photography Equipment | T3 | `photo-v1` |
| 7 | `audio` | Vintage Audio & Hi-Fi Equipment | T3 | `audio-v1` |
| 8 | `kitchen` | Commercial Kitchen & Cafe Equipment | T3 | `kitchen-v1` |
| 9 | `tools` | Small Tools & Hand Tools | T2 | `tools-v1` |
| 10 | `agri` | Agricultural Equipment Parts | T1 | `agri-v1` |
| 11 | `marine` | Marine & Boating Equipment | T1 | `marine-v1` |

### Routing algorithm (`src/lib/routing.ts`)
1. Lowercase + strip punctuation.
2. Run global rejection patterns first (collectibles, decorative, complete units, food, clothing, designer, FDA-medical, software/ROM). Hit → `{ mode: "reject", reason, message }`.
3. Tokenize, drop stopwords, score each category by keyword + subcategory-example overlap (multi-word matches weighted 2x).
4. **Top score ≥ 3 AND beats #2 by 1.5x** → `{ mode: "exact", primary, sub?, confidence }`.
5. **Top 3 within margin** → `{ mode: "partial", candidates }` (UI shows chooser).
6. Else → `{ mode: "unclear" }` (UI falls back to dropdown).

### Live test results (sanity-tested against 12 prompts)
| Input | Decision |
|---|---|
| `2012 Chevy Silverado alternator` | exact → automotive · engine |
| `vintage coin collection from 1920` | reject (collectibles) |
| `Fender Champ output transformer` | exact → audio · amp |
| `John Deere combine header part` | exact → agri · combine |
| `espresso machine group head` | exact → kitchen · espresso |
| `snes motherboard replacement` | partial → gaming · console |
| `1965 Singer sewing machine bobbin` | exact → sewing · sewing-machine |
| `outboard water pump for 2010 Yamaha` | exact → marine · outboard |
| `carbide drill bit` | exact → tools |
| `complete working 1969 Mustang` | unclear (would benefit from "vehicle" alias in regex) |
| `rolex submariner` | reject (designer / luxury) |
| `weird random gizmo` | unclear |

### Standard rejection copy
Generated by `STANDARD_REJECTION_COPY(supportEmail)` — lists all 11 categories and includes a `mailto:` link from `SUPPORT_EMAIL` env. Tone is helpful and redirective, not punishing.

---

## 14. Liability waivers

`src/lib/waivers.ts` exports 11 versioned waivers, one per category. Each waiver has:
- `id` (e.g. `automotive-v1`)
- `categoryId`
- `version` (e.g. `1.0`)
- `title` (e.g. "Automotive parts — installer responsibility")
- `body` (multi-paragraph plain text)

Every waiver covers:
1. Installation / integration is the buyer's responsibility (or that of a qualified technician).
2. A category-specific hazard line (electrical / fire for appliances; personal injury for woodworking; food safety for kitchen; at-sea operations for marine; etc.).
3. The 14-day buyer verification window and Net 30 payout.
4. The non-refundable service fee.
5. No liability for downstream / consequential damages.

The current copy is **plausible placeholder, not legal text.** It is structured so a real lawyer can replace each `body` field without schema changes. The `waiverVersion` field on `PartsRequest` is recorded as `<id>@<version>` (e.g. `audio-v1@1.0`) so you can always look up exactly what the buyer accepted on a given date.

---

## 15. Mock components versus production

Three modules in this prototype are deliberately mocked. Each is a **single point of replacement**.

### `src/lib/search.ts` — marketplace search worker (MOCK)
**Current:** `dispatchSearch(requestId)` schedules a `setTimeout` of 1.5–4s, then picks 3–6 fixtures from `src/lib/search.fixtures.ts` (24 canned listings keyed by category) and inserts Match rows. Auto-advances request status `SEARCHING → CURATED → AWAITING_REVIEW`.

**For production:** replace with one of:
1. **Inline real connectors** — eBay Browse API, Reverb API, Mercari API, Etsy Open API, custom scrapers for Facebook Marketplace and specialty shops. Aggregate into the same `Match` shape and call the same insert/upsert path.
2. **Out-of-process worker** — a background service (Cloud Run, Inngest, BullMQ, etc.) that subscribes to "request submitted" events, runs the connectors, and POSTs results to `/api/search/callback` (route stubbed, easy to add).

The shape of a fixture exactly matches the production payload — `{title, priceCents, shippingCents, condition, thumbnailUrl, sourceMarketplace, listingUrl, sellerHandle, sellerLocation, specHighlights, confidence}`. Connectors only need to map their API responses into this shape.

### `src/lib/payments.ts` — payments (MOCK)
**Current:** four functions (`authorize`, `captureFee`, `captureRemainder`, `refundRemainder`) that just write to `Order.paymentStatus` and `AuditLog`. Plus `void` for cancellations.

**For production:** swap to **Stripe Connect** with delayed transfers:
1. `authorize` → Stripe `PaymentIntent` with `capture_method: "manual"`.
2. `captureFee` → capture only the service-fee portion immediately (Stripe split-capture pattern, or two PaymentIntents).
3. `captureRemainder` → capture the held item portion when the buyer verifies.
4. `refundRemainder` → Stripe `Refund` on the captured item portion only.
5. Seller payouts via Stripe Connect transfers, scheduled at `sellerPayoutReleaseAt`.

The function signatures in `payments.ts` are designed to mirror Stripe so the swap is mechanical — `{ authId }` returned from `authorize` becomes the `paymentIntentId`.

### `src/lib/storage.ts` — file storage (MOCK)
**Current:** writes to local filesystem under `MEDIA_STORAGE_PATH` (default `./data/widgeter`); served via session-gated `/api/media/[kind]/[filename]`.

**For production:** swap to **S3, R2, or Vercel Blob**:
1. `saveImage(buffer, mediaType)` and `saveAudio(buffer, mediaType)` upload to the bucket and return a CDN URL or a signed URL.
2. The `/api/media/[kind]/[filename]` route can either redirect to a signed URL or be removed entirely if you go with public buckets + signed URLs at upload time.
3. Image compression (`sharp`) is optional; uncomment in package.json when you add it.

### What is NOT mocked
- **Claude API** — real calls in `src/lib/claude.ts`. Vision-capable. Real cost.
- **Whisper API** — real calls in `src/lib/whisper.ts`. Real cost.
- **NextAuth + Google OAuth** — real OAuth flow, real Google credentials needed.
- **Prisma + SQLite** — real database, just tiny.

---

## 16. Setup and installation

### Prerequisites
- Node.js 20+ (tested on 22)
- npm 10+
- (For Lovable production) PostgreSQL — change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma` and update `DATABASE_URL`.

### Install
```bash
npm install
cp .env.example .env
# fill in env vars (see §17)
```

### First run
```bash
npx prisma migrate dev          # creates SQLite db + applies migration
npx prisma db seed              # promotes OPERATOR_EMAIL to OPERATOR (optional)
npm run dev                     # http://localhost:3000
```

### Build for production
```bash
npm run build
npm start
```

---

## 17. Environment variables

Documented in `.env.example`. All required for production except the OPERATOR_EMAIL (which only matters at first seed).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Prisma connection string. Default `file:./widgeter.db` for SQLite. |
| `NEXTAUTH_URL` | yes | Public URL of the app, e.g. `https://widgeter.example.com`. |
| `NEXTAUTH_SECRET` | yes | Random 32-byte secret for JWT encryption. Generate with `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID` | yes | Google OAuth app client ID. |
| `GOOGLE_CLIENT_SECRET` | yes | Google OAuth app client secret. |
| `ANTHROPIC_API_KEY` | yes | Claude API key for Flow A (parsing) and Flow B (clarification). |
| `OPENAI_API_KEY` | yes | Whisper API key for voice transcription. |
| `MEDIA_STORAGE_PATH` | yes | Local filesystem root for uploads. Default `./data/widgeter`. **Swap with cloud storage for production.** |
| `SEARCH_SECRET` | yes | Shared secret for the (currently unused) `/api/search/callback` route. Will be needed if you split the search worker into its own process. |
| `OPERATOR_EMAIL` | no | If set, the seed script promotes this email to `OPERATOR` on first sign-in. |
| `SUPPORT_EMAIL` | no | Used in the standard rejection copy `mailto:` link. Default `support@widgeter.example`. |

### Google OAuth setup
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID.
2. Authorized JavaScript origins: `https://your-domain` (and `http://localhost:3000` for dev).
3. Authorized redirect URIs: `https://your-domain/api/auth/callback/google`.
4. Copy client ID + secret into env.

---

## 18. Database setup

Schema lives in `prisma/schema.prisma`. To produce / apply migrations:

```bash
npx prisma migrate dev --name <change-description>     # dev: creates + applies migration
npx prisma migrate deploy                               # prod: applies pending migrations
npx prisma generate                                     # regenerate the client
npx prisma studio                                       # browse db in a web UI
```

### SQLite → PostgreSQL migration (recommended for production)
1. Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `DATABASE_URL` to a Postgres URL.
3. Delete `prisma/migrations/` (regenerate from scratch) **or** keep them and run `prisma migrate deploy` against the new DB.
4. Optionally convert `String` enum columns to native Postgres `enum` types in the schema (improves query-ability; requires a manual data migration if there is existing data).
5. Optionally convert `String` JSON columns (`specs`, `missingFields`, `rejectionReasons`, `specHighlights`, `timeline`) to `Json` type for Postgres-side queries.

### Seed scripts
- `prisma/seed.ts` — promotes `OPERATOR_EMAIL` to OPERATOR. Run via `npx prisma db seed`.
- `scripts/seed-test-session.ts` — creates a buyer + operator user and mints encrypted NextAuth JWT cookies for direct API testing (no Google OAuth needed). See §22.
- `scripts/seed-test-data.ts` — inserts a sample request in `AWAITING_REVIEW` with three matches across reverb / specialty / ebay. See §22.

---

## 19. Running locally

```bash
npm run dev
# Open http://localhost:3000
# Click Get started → Google sign-in (you must have GOOGLE_CLIENT_* set)
# Promote yourself to OPERATOR if you want operator access:
OPERATOR_EMAIL=you@example.com npx prisma db seed
```

For testing without Google OAuth:
```bash
NEXTAUTH_SECRET=dev DATABASE_URL=file:./widgeter.db npx tsx scripts/seed-test-session.ts
# prints a buyer cookie and an operator cookie — paste into the browser as next-auth.session-token
```

---

## 20. Testing approach

The prototype was built phase-by-phase with a `next build` smoke after every phase (10 phases total + 1 runtime-fix phase). Each phase ended in a known-green state and a commit. After all phases, an end-to-end runtime smoke covered:

1. **Build smoke** — `npm run lint` + `npm run build` clean.
2. **Server smoke** — `next start` on port 3001, then `curl` against every public + auth-gated route to confirm response codes.
3. **Auth gate smoke** — confirm role-based access by hitting `/operator` as a buyer (expect 307→/login) and as an operator (expect 200).
4. **Routing smoke** — hit `/api/routing` with twelve representative inputs, verify decision modes (exact / partial / unclear / reject).
5. **End-to-end flow smoke** — full Buyer→Operator handshake with seeded data: approval, source-reveal, fulfillment progression, escrow verify, payout release.

There is no automated test suite (Jest/Vitest/Playwright) yet — Lovable should add one when productionizing. The verification scripts (§21) are the closest equivalent.

---

## 21. Test scripts provided

Two scripts in `scripts/` let you exercise the platform with no API keys:

### `scripts/seed-test-session.ts`
Creates `buyer@widgeter.test` and `operator@widgeter.test` Users and mints encrypted NextAuth JWT session cookies for both, signed with `NEXTAUTH_SECRET`. Output is JSON: `{buyerId, operatorId, buyerCookie, operatorCookie}`. Paste a cookie into curl `-H "Cookie: …"` or into your browser's cookie store and you're authenticated.

```bash
DATABASE_URL=file:./widgeter.db NEXTAUTH_SECRET=dev npx tsx scripts/seed-test-session.ts
```

### `scripts/seed-test-data.ts`
Inserts one `PartsRequest` for `buyer@widgeter.test` in `AWAITING_REVIEW` status with three matches (Hammond NOS @ Reverb, Mercury Magnetics @ specialty, used Champ OT @ eBay) — perfect for exercising the source-hiding helper, the approval flow, and the operator console without needing Claude or Whisper to be configured.

```bash
DATABASE_URL=file:./widgeter.db npx tsx scripts/seed-test-data.ts
```

---

## 22. Verification results

Captured during the live runtime smoke against `next start` on port 3001:

### Public + auth-gated routes
| Endpoint | Status | Notes |
|---|---|---|
| `GET /` | 200 | Marketing landing |
| `GET /login` | 200 | Google sign-in |
| `GET /requests` (no cookie) | 307 → `/login` | Auth gate |
| `GET /operator` (no cookie) | 307 → `/login` | Auth gate |
| `GET /api/health` | 200 | `{"ok":true,"name":"widgeter"}` |
| `GET /api/categories` | 200 | Full taxonomy payload |
| `POST /api/routing` (no cookie) | 401 | `{"error":"UNAUTHENTICATED"}` |

### Auth gating (using minted JWT cookies)
| Endpoint | As Buyer | As Operator |
|---|---|---|
| `GET /requests` | 200 | 200 |
| `GET /operator` | 307 → `/login` | 200 |

### Routing decisions
| Input | Decision |
|---|---|
| `2012 Chevy Silverado alternator` | exact → automotive · engine, conf 0.5 |
| `vintage coin collection` | reject — "Collectibles are out of scope." |
| `Fender Champ output transformer` | exact → audio · amp, conf 0.5 |
| `John Deere combine header part` | exact → agri · combine, conf 0.67 |
| `espresso machine group head` | exact → kitchen · espresso, conf 0.83 |
| `snes motherboard replacement` | partial → gaming · console |
| `1965 Singer sewing machine bobbin` | exact → sewing · sewing-machine, conf 0.67 |
| `outboard water pump for 2010 Yamaha` | exact → marine · outboard, conf 0.5 |
| `carbide drill bit` | exact → tools, conf 0.5 |
| `complete working 1969 Mustang` | unclear |
| `rolex submariner` | reject — "Designer / luxury goods are out of scope." |
| `weird random gizmo` | unclear |

### Source-hiding (verified end-to-end)
With a seeded request having matches at `reverb`, `specialty`, and `ebay`:

**Buyer view of `/requests/<id>` (HTML grep):**
```
Marketplace D
Marketplace E
```
(Source marketplaces, listing URLs, seller handles all absent.)

**Operator view of `/operator/<id>` (HTML grep):**
```
MercuryDirect
ebay
reverb
specialty
tube_amp_parts
vintage_audio_seller
```
(All marketplaces and seller handles visible.)

### Approval and source-reveal
- `POST /api/matches/<top-match-id>/approve` as Buyer → `{"orderId":"cmoh…"}`.
- After approval, buyer view of `/requests/<id>` (HTML grep):
  ```
  Marketplace D            ← sibling, still hidden
  Marketplace E            ← sibling, still hidden
  reverb.com/example       ← approved match, seller URL revealed
  tube_amp_parts           ← approved match, seller handle revealed
  ```

### Fulfillment + escrow advance
- Operator: `PURCHASED` → `IN_TRANSIT` (with tracking `1Z999AA10123456784`) → `DELIVERED`. All three returned `{"ok":true,"status":"…"}`.
- Buyer: `verify` → `{"ok":true}`.
- Operator: `fast-forward` → `release-payout` → both `{"ok":true}`.

### Final order state
```json
{
  "paymentStatus": "CAPTURED",
  "fulfillmentStatus": "DELIVERED",
  "escrowState": "SELLER_PAID",
  "trackingNumber": "1Z999AA10123456784"
}
```

### Audit trail (event names)
`PAYMENT_AUTHORIZED, MATCH_APPROVED, ORDER_ADVANCED (×3), ESCROW_HELD_ON_DELIVERY, ESCROW_BUYER_VERIFIED, PAYMENT_REMAINDER_CAPTURED, ESCROW_FAST_FORWARD, ESCROW_SELLER_PAID`

The full set of state machines is exercised end-to-end. Source-hiding is verified by direct HTML inspection. Auth gating is verified by role mismatch. Approval correctly creates an Order, captures the fee, withdraws siblings, reveals only the approved seller, and advances escrow on the buyer's verify action.

---

## 23. Aesthetic and UX direction

Starting points, intentionally not prescriptive — Lovable can take it where it wants.

- **Mood:** serious, technical, slightly industrial. Closer to Reverb's marketplace clean than to a fashion app's softness. Buyers are professionals or serious hobbyists; the UI should feel competent, not playful.
- **Color:** high-contrast neutral base (deep charcoal text on warm white), with a single accent color used sparingly for CTAs and approval moments. Avoid gradients, avoid pastels.
- **Typography:** a workmanlike sans (Inter / Geist / IBM Plex Sans) for body, with a slightly heavier weight for category labels. Fixed-width type for spec tables, part numbers, model identifiers.
- **Density:** closer to Linear / Notion than to Instagram. Specs and identifiers are dense and scannable; whitespace is for hierarchy, not breathing room.
- **Imagery:** photographs of actual parts. Resist stock-photo "smiling professional" imagery. The hero of every screen should be the part itself.
- **Trust cues:** explicit fee disclosures, escrow countdown timers, audit trails, and source-hiding made visible (the "Marketplace A/B/C" labels should feel intentional, not like missing data — show a tooltip explaining why the source is hidden).
- **Mobile-first:** most buyers are in a shop / under a hood / on a job site when they discover they need a part. The intake wizard should be one-thumb usable. Voice capture is a first-class input, not an afterthought.
- **Two distinct surfaces:** the buyer experience should feel like a marketplace; the operator console should feel like a tool — denser, more table-like, more keyboard-driven. They share a design system but not a layout.

### Specific moments worth designing carefully
- **The category picker** — first impression. Should make the closed taxonomy feel like a feature ("we only do parts that matter"), not a limitation.
- **The rejection dialog** — when a search is out of scope, the message should redirect helpfully. Don't punish.
- **The approval modal** — the moment of truth. Show the fee + total breakdown, the escrow timeline, and what reveals next. Make the buyer feel informed, not surprised.
- **The source reveal** — after approval, animate the transition from "Marketplace A" to "reverb.com" with a small flourish. This is what they paid for.
- **The order timeline** — buyers want certainty. A clean vertical timeline showing every event (purchased → label created → in transit → delivered → verify by [date] → seller paid) builds it.

---

## 24. What is already built versus what is mocked

### Real and production-ready (with minor polish)
- Next.js 14 App Router app with TypeScript strict mode
- NextAuth + Google OAuth + JWT-augmented session (role-aware)
- Full Prisma schema with 8 app models + NextAuth models
- Mobile-first PWA shell with manifest, service worker, bottom nav
- 11-category taxonomy in code, with subcategories, keywords, rejection triggers, expected return rates
- Search routing algorithm (exact / partial / unclear / reject)
- 11 versioned per-category liability waivers (placeholder text)
- Claude Sonnet integration (Flow A: parse text + images → structured spec; Flow B: merge clarification answer)
- OpenAI Whisper integration (voice → transcript)
- Image upload with type/size caps, server-side validation
- Voice capture with MediaRecorder, transcript appended to description
- Source-hiding helper (`sanitizeMatch`) used by every match-returning route
- Stable per-request `displayLabel` assignment via hash
- Three state machines (request, fulfillment, escrow) with `canTransition*` guards
- Audit log on every state change
- Buyer dashboard, intake wizard (3 steps), request detail with tabs, matches grid
- Operator inbox, operator request console (re-search, hide/edit matches, attach proof video, advance fulfillment with tracking, fast-forward, release payout)
- Buyer escrow actions (verify, dispute) within 14-day window
- Service fee captured on approval, never refundable
- Item-portion authorization → captured on verify → refundable on dispute
- Gaming category gates approval behind operator-attached proof video
- Approving one match auto-WITHDRAWs siblings
- Test scripts that exercise the entire flow without API keys

### Mocked (single point of replacement)
- **Marketplace search** — `src/lib/search.ts` returns canned fixtures. Replace with real API connectors per marketplace.
- **Payments** — `src/lib/payments.ts` updates DB state only. Replace with Stripe Connect.
- **File storage** — `src/lib/storage.ts` writes to local filesystem. Replace with S3 / R2 / Vercel Blob.
- **Escrow timers** — fields are set, but no cron or scheduled job. Operator "fast-forward clock" is a demo crutch; production needs a scheduler (Inngest, Cloud Scheduler, or DB-poll).

### Not built yet (deferred from MVP)
- Email notifications (clarification needed, match ready, order delivered, payout released).
- Push notifications.
- Order tracking auto-events (label created, out for delivery) — currently operator-manual.
- Multi-match parallel approval (one buyer, two parts).
- Operator assignment / claim queue (operators currently see all requests).
- Admin panel for waivers, fees, category management.
- Marketplace data analytics product (the third revenue stream).
- Subscription tiering for high-volume professionals.
- Native iOS / Android apps (PWA covers most of this).
- Localization (currently English only).
- A11y audit (basic semantic HTML in place; nothing tested with screen readers).
- Automated test suite — the verification scripts in §22 are the closest current equivalent.

---

## 25. Roadmap to production

### Week 1 — Lovable setup
- Migrate Postgres in Lovable's hosted DB.
- Wire real Stripe Connect account; replace `payments.ts`.
- Wire S3 / R2; replace `storage.ts`.
- Re-run the test scripts in the Lovable environment to confirm parity.

### Week 2 — first real marketplace connector
- Pick one Tier 1 marketplace (eBay Browse API is highest-leverage).
- Implement the connector inside `search.ts`. Keep fixtures as a fallback / test mode.
- Run a closed beta: 10–20 paid requests across automotive + appliance.

### Week 3-4 — second + third connectors
- Reverb (audio), Mercari (gaming/photo) — pick based on which categories have early traction.
- Add operator scheduler for escrow auto-release (Inngest or pg_cron).
- Add email notifications (Resend or Postmark) for clarification-needed and match-ready.

### Month 2 — scale prep
- Add real waiver text from a lawyer.
- Replace fast-forward-clock with admin-only feature flag.
- Add automated test suite (Vitest for libs, Playwright for the buyer flow).
- Instrument analytics (PostHog or Mixpanel) for funnel: submit → clarify → approve → verify.
- Add basic admin views (user list, audit log search).

### Month 3+ — growth
- Subscription tier for high-volume buyers.
- Marketplace data analytics product (anonymized aggregated demand data sold to suppliers).
- B2B partnerships with category-specific suppliers.

---

## 26. File structure

```
.
├── HANDOFF_README.md         ← this file
├── docs/
│   └── EXECUTIVE_BRIEF.md    ← shorter brief for non-technical handoff
├── README.md                 ← short repo readme
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .eslintrc.json
├── .env.example
├── .gitignore
│
├── prisma/
│   ├── schema.prisma         ← full data model
│   ├── seed.ts               ← OPERATOR_EMAIL promotion
│   └── migrations/
│       └── <ts>_init/migration.sql
│
├── public/
│   ├── manifest.json         ← PWA manifest
│   └── sw.js                 ← service worker
│
├── scripts/
│   ├── seed-test-session.ts  ← creates test users + JWT cookies (no OAuth)
│   └── seed-test-data.ts     ← sample request + 3 matches in AWAITING_REVIEW
│
└── src/
    ├── app/
    │   ├── layout.tsx        ← root layout (SessionProvider + ServiceWorker)
    │   ├── page.tsx          ← marketing landing
    │   ├── globals.css
    │   ├── login/page.tsx
    │   ├── (app)/            ← session-gated app routes
    │   │   ├── layout.tsx    ← session check + BottomNav
    │   │   ├── page.tsx      ← redirect to /requests
    │   │   ├── requests/
    │   │   │   ├── page.tsx
    │   │   │   ├── new/
    │   │   │   │   ├── page.tsx           ← step 1: category picker
    │   │   │   │   ├── brief/page.tsx     ← step 2: brief + photos + voice
    │   │   │   │   └── review/page.tsx    ← step 3: waiver + submit
    │   │   │   └── [id]/page.tsx          ← request detail
    │   │   └── operator/
    │   │       ├── page.tsx               ← operator inbox
    │   │       └── [id]/page.tsx          ← operator console
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── health/route.ts
    │       ├── categories/route.ts
    │       ├── routing/route.ts
    │       ├── waivers/route.ts
    │       ├── requests/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       ├── clarify/route.ts
    │       │       └── search/route.ts
    │       ├── matches/[id]/
    │       │   ├── route.ts             ← PATCH (operator)
    │       │   └── approve/route.ts     ← POST (buyer)
    │       ├── orders/[id]/
    │       │   ├── advance/route.ts
    │       │   ├── verify/route.ts
    │       │   ├── dispute/route.ts
    │       │   ├── release-payout/route.ts
    │       │   └── fast-forward/route.ts
    │       ├── media/
    │       │   ├── upload/route.ts
    │       │   └── [kind]/[filename]/route.ts
    │       └── intake/voice/route.ts
    ├── components/
    │   ├── SessionProvider.tsx
    │   ├── ServiceWorker.tsx
    │   ├── BottomNav.tsx
    │   ├── CategoryPicker.tsx
    │   ├── RejectionDialog.tsx
    │   ├── ClarificationChat.tsx
    │   ├── MatchCard.tsx
    │   ├── OrderTimeline.tsx
    │   ├── EscrowActions.tsx
    │   └── OperatorControls.tsx
    ├── hooks/
    │   └── useVoiceRecorder.ts
    ├── lib/
    │   ├── prisma.ts
    │   ├── auth.ts
    │   ├── roles.ts
    │   ├── audit.ts
    │   ├── stateMachine.ts
    │   ├── claude.ts          ← Flow A + Flow B
    │   ├── whisper.ts
    │   ├── storage.ts         ← MOCK: local fs (replace for prod)
    │   ├── categories.ts      ← 11-category taxonomy
    │   ├── routing.ts         ← search routing algorithm
    │   ├── waivers.ts         ← 11 waiver bodies (placeholder text)
    │   ├── sanitize.ts        ← source-hiding helper
    │   ├── search.ts          ← MOCK: fixture-based search worker
    │   ├── search.fixtures.ts ← 24 canned listings across 11 categories
    │   ├── payments.ts        ← MOCK: state-only payments
    │   └── escrow.ts          ← escrow state transitions
    └── types/
        └── next-auth.d.ts     ← session augmentation (id, role, isAdmin)
```

---

## 27. Glossary

- **PartsRequest** — the central entity. A buyer's request for a specific part.
- **Match** — a candidate listing returned by the search worker for a request.
- **Order** — created on buyer approval of a match. Has its own payment, fulfillment, and escrow state machines.
- **Operator** — internal staff role. Curates matches, manages fulfillment, releases payouts.
- **Buyer** — end user role. Submits requests, approves matches, verifies delivery.
- **Display label** — the neutral "Marketplace A/B/C" string a buyer sees instead of the real marketplace name.
- **Sanitize** — to strip sensitive fields from a Match before sending it to a buyer.
- **Service fee** — non-refundable fee captured at approval. Currently flat $25.
- **Escrow** — the period between delivery and seller payout. 14 days for buyer verification + Net 30 for payout.
- **Flow A** — Claude call that parses a buyer's intake into structured specs.
- **Flow B** — Claude call that merges a buyer's clarification answer into the existing specs.
- **Routing** — the algorithm that classifies free-text intake into one of 11 categories or rejects it.
- **Waiver** — per-category liability acknowledgment the buyer must accept before submission.
- **PWA** — Progressive Web App. Installable on mobile home screens; works partially offline.
- **NextAuth JWT** — encrypted session token; this app uses the JWT strategy with PrismaAdapter, augmenting the token with `id`, `role`, `isAdmin`.

---

**End of handoff README.** Questions or gaps belong in `docs/` as separate files; keep this doc as the canonical entry point.
