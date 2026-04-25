# Widgeter

AI-powered Parts Finder Engine. Buyers submit a description (text + photo + voice) and a budget; AI agents source rare/discontinued parts across marketplaces; matches are presented with the source hidden until approval. On approval the platform charges a non-refundable service fee, completes the purchase, and tracks delivery through a 14-day buyer-verification + Net 30 seller-payout escrow.

This is a clickable prototype: real Claude (text + vision) and Whisper, mocked marketplace search, mocked payments.

## Stack
- Next.js 14 (App Router, TypeScript)
- Prisma + SQLite
- NextAuth + Google OAuth
- Tailwind CSS, mobile-first PWA
- Anthropic Claude (text + vision)
- OpenAI Whisper (voice transcription)

## Roles
- **BUYER** — submits requests, reviews sanitized matches, approves, verifies delivery.
- **OPERATOR** — curates matches, advances fulfillment, releases payout.

## Getting started
```bash
npm install
cp .env.example .env       # fill in OAuth + API keys
npx prisma migrate dev
npx prisma db seed
npm run dev
```
Visit `http://localhost:3000`.

## Plan
See `/root/.claude/plans/widgeter-is-a-website-optimized-shamir.md` for the full design (data model, state machines, API surface, screen breakdown, and phased implementation).
