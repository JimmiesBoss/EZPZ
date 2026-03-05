# EZPZ Implementation Plan

## Architecture

```
┌─────────────────────────────────────┐
│         Next.js App (Vercel)        │
│  ┌───────────┐  ┌────────────────┐  │
│  │ Mobile PWA │  │  API Routes    │  │
│  │ (React)    │  │                │  │
│  │            │  │ POST /intake   │  │
│  │ - Capture  │  │ POST /clarify  │  │
│  │ - Queue    │  │ GET  /actions  │  │
│  │ - Chat     │  │ POST /callback │  │
│  │ - Detail   │  │ GET  /events   │  │
│  └───────────┘  └────────────────┘  │
└──────────┬──────────────┬───────────┘
           │              │
    ┌──────▼──────┐ ┌─────▼──────────┐
    │  PostgreSQL │ │ External APIs   │
    │  (Supabase) │ │                 │
    └─────────────┘ │ - Claude (parse)│
                    │ - Whisper (STT) │
                    │ - Elvis (webhook│
                    └─────────────────┘
```

## Tech Stack

| Layer          | Choice                        | Why                                    |
|----------------|-------------------------------|----------------------------------------|
| Framework      | Next.js 14 (App Router)       | Single deploy, API + UI, PWA support   |
| Database       | PostgreSQL via Supabase        | Free tier, hosted, real-time optional  |
| ORM            | Prisma                        | Type-safe, migrations, easy schemas    |
| Auth           | NextAuth.js + Google OAuth    | Built for Next.js, Google-native       |
| Transcription  | OpenAI Whisper API            | Best price/quality, simple REST call   |
| Intent Parsing | Claude API (structured output)| Best at nuanced extraction + reasoning |
| Styling        | Tailwind CSS                  | Mobile-first, fast to build            |
| Voice Capture  | Browser MediaRecorder API     | No dependencies, works in PWA          |
| Deploy         | Vercel                        | Zero-config Next.js hosting            |

## Database Schema (Prisma)

### Models

- **User** — id, email, name, role (OWNER | SUBMITTER | EXECUTOR), googleId, createdAt
- **Intake** — id, sourceType (VOICE | TEXT), rawText, audioUrl, transcript, submitterId, targetOwnerId, createdAt
- **ActionItem** — id, intakeId, actionType (TASK | MEETING | EMAIL), status, extractedFields (JSON), missingFields (JSON), inferredFields (JSON), executionArtifacts (JSON), createdAt, updatedAt
- **ClarificationMessage** — id, actionItemId, direction (SYSTEM | USER), content, answeredById, createdAt
- **AuditLog** — id, actionItemId, event, actorId, metadata (JSON), createdAt

### Status Enum
`NEEDS_INFO | READY | IN_PROGRESS | DONE | ARCHIVED`

## Implementation Phases

### Phase 1: Project Skeleton + Auth
1. Initialize Next.js project with TypeScript, Tailwind, PWA manifest
2. Set up Prisma with PostgreSQL schema
3. Configure NextAuth with Google OAuth
4. Create basic layout (mobile-first shell with bottom nav)
5. Protect routes — only authorized users

### Phase 2: Capture + Transcription
6. Build capture screen — text input + voice record button
7. Implement MediaRecorder for voice capture (WebM/MP4 audio)
8. Upload audio to storage (Supabase Storage or S3)
9. Transcribe via Whisper API
10. Create Intake record in database

### Phase 3: Intent Parsing + Action Items
11. Build Claude API integration for structured extraction
12. Define JSON schema for each action type (task, meeting, email)
13. Parse intake → create ActionItem(s) with extracted/missing/inferred fields
14. Route to clarification if fields are missing, otherwise mark READY

### Phase 4: Clarification Chat
15. Build chat-style UI for clarification questions
16. System generates questions from missingFields
17. User answers update extractedFields on the ActionItem
18. When all required fields resolved → status becomes READY

### Phase 5: Queue + Detail Views
19. Build queue list view with status filters (Needs Info / Ready / In Progress / Done)
20. Build action item detail view (summary, type, fields, transcript, artifacts)
21. Add manual status controls for executor role

### Phase 6: Elvis Integration (Webhook)
22. Webhook dispatcher — POST to Elvis endpoint when status → READY
23. Callback endpoint — Elvis POSTs execution results (artifact links)
24. Store artifacts on ActionItem, mark DONE
25. Event feed endpoint for polling fallback (GET /api/events?since=timestamp)

### Phase 7: Audit + Polish
26. Audit logging on all state changes and field edits
27. PWA manifest + service worker for home screen install
28. Mobile UX polish — loading states, optimistic updates, haptic-style feedback
29. Error handling and retry logic for external API calls

## Key Screens (4 views)

1. **Capture** — Big text input, prominent mic button, submit. That's it.
2. **Clarification Chat** — Message bubbles, system asks questions, user answers. Per action item.
3. **Queue** — Filterable list of action items with status chips and type icons.
4. **Detail** — Full action item view: fields, transcript, clarification log, artifact links.

## API Routes

| Method | Route                        | Purpose                              |
|--------|------------------------------|--------------------------------------|
| POST   | /api/intake                  | Submit voice/text intake             |
| GET    | /api/actions                 | List action items (filterable)       |
| GET    | /api/actions/[id]            | Get single action item detail        |
| PATCH  | /api/actions/[id]            | Update fields or status              |
| POST   | /api/actions/[id]/clarify    | Submit clarification answer          |
| POST   | /api/actions/[id]/callback   | Elvis posts execution results        |
| GET    | /api/events                  | Event feed (polling fallback)        |

## Elvis Webhook Payload (what Elvis receives)

```json
{
  "action_id": "uuid",
  "action_type": "meeting",
  "status": "ready",
  "extracted_fields": {
    "invitees": ["john@example.com"],
    "date": "2026-03-10",
    "time": "14:00",
    "duration_minutes": 30,
    "agenda": "Q2 pipeline review"
  },
  "source": {
    "raw_text": "...",
    "transcript": "...",
    "submitter": "nathan@example.com"
  },
  "callback_url": "https://ezpz.app/api/actions/uuid/callback"
}
```

## Elvis Callback Payload (what Elvis sends back)

```json
{
  "action_id": "uuid",
  "status": "executed",
  "artifacts": {
    "calendar_event_url": "https://calendar.google.com/...",
    "calendar_event_id": "evt_xyz"
  }
}
```

## Environment Variables Needed

```
DATABASE_URL=              # Supabase PostgreSQL connection string
NEXTAUTH_SECRET=           # Random secret for session encryption
GOOGLE_CLIENT_ID=          # Google OAuth app
GOOGLE_CLIENT_SECRET=      # Google OAuth app
OPENAI_API_KEY=            # For Whisper transcription
ANTHROPIC_API_KEY=         # For Claude intent parsing
ELVIS_WEBHOOK_URL=         # Elvis endpoint to receive action items
ELVIS_WEBHOOK_SECRET=      # Shared secret for webhook auth
SUPABASE_URL=              # For file storage (audio uploads)
SUPABASE_ANON_KEY=         # For file storage
```

## What's Deferred (Post-MVP)

- Multi-submitter (multiple people submitting for Nathan)
- Drive file linking/attachments
- Admin panel for configuration
- Siri Shortcuts / native iOS app
- Batch clarification mode (daily digest instead of immediate)
- Advanced routing rules
- Email notification when clarification is needed (push notification substitute)
