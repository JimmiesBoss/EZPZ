# Widgeter — Executive Brief

## What it is
Widgeter is an AI-powered **parts-finder and acquisition platform**. A buyer describes a rare, discontinued, or hard-to-find component (text, photo, and/or voice) and sets a pre-authorized budget. AI agents scour marketplaces, the platform curates candidates, and the buyer reviews matches **with the source marketplace, seller handle, and listing URL hidden behind neutral "Marketplace A/B/C" labels**. On approval, a non-refundable service fee is captured, the source is revealed, and the platform handles the actual purchase, shipping, and dispute resolution. Buyer payment is held in a 14-day verification escrow before the seller is paid out (Net 30).

In one sentence: **a curated, privacy-protected concierge for industrial parts that today live across eBay, Reverb, Facebook Marketplace, niche specialty retailers, and yard-pull operations.**

## The problem we solve
Sourcing rare or discontinued parts today is fragmented and time-expensive:
- A part for a 1974 amp, a discontinued appliance board, or a 30-year-old tractor injector can take **hours of searching across five or more marketplaces**.
- Listings are inconsistent, photos are bad, and authentication is buyer-beware.
- Professionals (mechanics, restorers, cafe operators) bill at $80–$200/hr; spending an afternoon hunting a $40 part is poor economics.
- Casual marketplaces are full of counterfeits, mis-listings, and "for parts only" units misrepresented as working.
- Direct buyer↔seller contact lets sourcing relationships get bypassed, undermining any business that organizes the supply.

Widgeter consolidates the hunt into one structured intake, applies AI parsing + curation, hides sourcing details until acquisition is committed, and ships a verified part. The user trades time + a flat service fee for **certainty, curation, and time saved**.

## Core functionality

### 1. Structured intake (mandatory)
- The user **must** select a primary category (one of 11) and a subcategory before describing the part. Free-text-only search is not supported — it routes through the same taxonomy.
- Three input modes, used together:
  - **Text** description + structured spec fields (brand, model, condition, part #, year).
  - **Photo upload** (up to 5 images), routed through Claude Vision to extract identifying features.
  - **Voice note** (MediaRecorder), routed through Whisper, transcript appended to the description.
- A flat $25 non-refundable **service fee** is disclosed up front and captured at the moment of approval.

### 2. The 11 categories (closed taxonomy)
Tier 1 (primary revenue, established repair markets): **Automotive Parts**, **Small Appliance Parts**, **Agricultural Equipment Parts**, **Marine & Boating Equipment**.
Tier 2 (high-margin, low return rate): **Woodworking & Metalworking Equipment**, **Sewing & Textile Equipment**, **Small Tools & Hand Tools**.
Tier 3 (niche, passion markets): **Gaming & Arcade Equipment**, **Vintage Photography Equipment**, **Vintage Audio & Hi-Fi Equipment**, **Commercial Kitchen & Cafe Equipment**.

Anything outside (collectibles, decorative items, complete working units, software/media, food, designer goods, regulated medical) is rejected at intake with a helpful redirect message. Each category has a **dedicated liability waiver** — installation, food-safety, fire, marine-at-sea, and personal-injury risk are explicitly the buyer's responsibility post-delivery.

### 3. AI-driven routing & parsing
- Free-text searches like "2012 Chevy Silverado alternator" are auto-routed to **Automotive → Engine Components**; "1974 Fender Champ output transformer" routes to **Vintage Audio & Hi-Fi → Amplifiers & Receivers**. Ambiguous text surfaces a 2-3 candidate chooser. Out-of-scope text shows the rejection dialog.
- Claude Sonnet (text + vision) extracts a structured spec (`brand`, `model`, `partNumber`, `year`, `condition`, `dimensions`, `searchKeywords[]`) plus a `missingFields[]` list. Missing fields drive a **clarification chat**: the system asks for what it needs, the buyer answers, Claude merges the answer back into the spec.

### 4. Curated matches with hidden sources
- Once specs are clean, an AI "search worker" returns 3–6 candidate listings per request. (Production: real marketplace integrations. Current prototype: seeded fixtures across 11 categories.)
- Each match shows: title, price, shipping, condition, spec highlights, confidence score, thumbnail.
- **What is hidden until approval**: source marketplace, seller handle, seller location, listing URL. The buyer sees only `Marketplace A`, `Marketplace B`, etc. Labels are stable per request (a re-search returns the same label for the same marketplace).
- Operators see everything; buyers see only sanitized payloads. The sanitization is centralized so no route can bypass it.

### 5. Approval, escrow, and fulfillment
- The buyer approves a single match via a modal that itemizes **service fee + item price + shipping = total**, plus the escrow disclosure (14-day verification window, Net 30 seller payout).
- On approval: the service fee is captured immediately, the item-price portion is authorized but held, the source is revealed for that match (siblings stay anonymized), and an Order is created.
- Operator console drives fulfillment: **Mark Purchased → In Transit (with tracking) → Delivered**. Delivery starts the 14-day clock.
- Buyer can **Verify** (releases the held balance to capture; sets seller payout date) or **Open dispute** within 14 days.
- After Net 30 + verification, the operator releases the seller payout. (For demos, a "fast-forward clock" collapses both timers.)

### 6. Two-role workflow
- **Buyer**: submits requests, reviews sanitized matches, approves, verifies delivery, opens disputes. PWA-installable on mobile.
- **Operator**: internal staff. Inbox of all active requests; can re-run search, hide/edit/approve individual matches, attach proof-of-functionality videos (mandatory for the gaming category), advance fulfillment, resolve disputes, release payouts. Operator role is the foundation of trust and curation; the platform's quality is operator-mediated.

## Ideal Customer Profiles

### Primary (Tier 1 categories — biggest revenue per request)
1. **Independent mechanics & fleet operators** sourcing OEM and reman parts for 5–25 year-old vehicles. Time-poor, high hourly rate, comfortable paying $25 to skip a 90-minute hunt across pull-yards and eBay.
2. **Property managers, landlords, and appliance repair techs** sourcing parts for older washers, dryers, fridges, dishwashers. The economics of repair-vs-replace have shifted since 2020; this is a growing repair culture.
3. **Farmers and farm cooperatives** sourcing tractor, combine, and implement parts. Right-to-repair tailwinds; very low fraud (serial-number-keyed); willing to wait days for the right part because downtime is more expensive.
4. **Marine operators and recreational boat owners** sourcing outboard, navigation, and onboard-system parts. High-value equipment, professional installers, low return rates.

### Secondary (Tier 2 — high margin, very low returns)
5. **Professional woodworkers, metalworkers, and small fabrication shops** keeping older Powermatic, Delta, Jet, and CNC machines running.
6. **Tailors, alteration shops, and costume/textile makers** with industrial Singers, Bernina, Juki, and Pfaff equipment.
7. **Trade contractors** (electricians, plumbers, finish carpenters) wanting specialty bits, blades, and one-off tools.

### Tertiary (Tier 3 — passion-driven, premium tolerant)
8. **Audiophile and vintage-amp restorers** sourcing tubes, transformers, capacitors, and tonearm parts.
9. **Film-photography enthusiasts and studios** sourcing shutter assemblies, lens elements, light meters, and darkroom parts.
10. **Cafe and restaurant owners** keeping La Marzocco / Synesso / Mahlkönig equipment alive without dealer markup.
11. **Arcade operators and retro-gaming hobbyists** keeping cabinets, consoles, and PCBs running.

### Common traits across ICPs
- Willingness to pay **$25–$100 for time saved**, not for the part itself.
- Tolerance for **3 days to 4 weeks** sourcing latency, traded for confidence.
- A specific, technical use-case (not browsing). They know what they want or can describe it well enough that AI + a human curator can find it.
- A repair / restoration / maintenance mindset — not collectors, not flippers.

## What success looks like
- **Conversion** (% of submitted requests that result in approved purchase): target 35-50% at scale.
- **Resolution time** (submit → delivered): target 5–14 days median, 28 days p95.
- **Service fee realization** per closed transaction.
- **Return rate** by category (the model expects 5-15% in repair categories, up to ~24% for gaming due to fraud risk; sourcing friction is itself a return-rate stabilizer).
- **NPS** in the 50+ range, supported by the curation + concierge model.

## Aesthetic & UX direction (light, for Lovable)
A few starting points; these are intentionally not prescriptive — Lovable can take it where it wants.

- **Mood**: serious, technical, slightly industrial. Closer to Reverb's marketplace clean than to a fashion app's softness. Buyers are professionals or serious hobbyists; the UI should feel competent, not playful.
- **Color**: high-contrast neutral base (deep charcoal text on warm white), with a single accent color used sparingly for CTAs and approval moments. Avoid gradients, avoid pastels.
- **Typography**: a workmanlike sans (Inter / Geist / IBM Plex Sans) for body, with a slightly heavier weight for category labels. Fixed-width type for spec tables, part numbers, model identifiers.
- **Density**: closer to Linear / Notion than to Instagram. Specs and identifiers are dense and scannable; whitespace is for hierarchy, not breathing room.
- **Imagery**: photographs of actual parts. Resist stock-photo "smiling professional" imagery. The hero of every screen should be the part itself.
- **Trust cues**: explicit fee disclosures, escrow countdown timers, audit trails, source-hiding made visible (the "Marketplace A/B/C" labels should feel intentional, not like missing data — show a tooltip explaining why the source is hidden).
- **Mobile-first**: most buyers are in a shop / under a hood / on a job site when they discover they need a part. The intake wizard should be one-thumb usable. Voice capture is a first-class input, not an afterthought.
- **Two distinct surfaces**: the buyer experience should feel like a marketplace; the operator console should feel like a tool — denser, more table-like, more keyboard-driven. They share a design system but not a layout.

## What the current prototype proves
The implementation on `claude/build-parts-finder-JaS2m` is a clickable end-to-end prototype with:
- Real Google OAuth, real Claude (text + vision) parsing, real Whisper transcription.
- Mocked marketplace search (seeded fixtures) and mocked payments (state-only, no Stripe).
- Full state machines for request status, fulfillment status, and escrow state.
- Source-hiding verified end-to-end in tests; approval reveals only the approved match.
- Operator console with fast-forward-clock for demos.
- 11 product categories with their full subcategory taxonomies, routing keywords, rejection triggers, and per-category waivers.

This is the substrate to hand to Lovable — the data model, state machines, and business rules are settled; the visual + interaction layer is where Lovable adds the most value.
