# My Success Story — History & Archive

This file contains the project's full history, original vision, and completed
phase notes. For current working context see `CLAUDE.md`.

---

## Vision

An AI-powered goal achievement platform that helps users discover their true,
most important goals (which may not be immediately obvious even to themselves),
commit to actionable steps, and adaptively track progress with compassionate
accountability.

The application is anonymous-first: users are more willing to take risks, be
honest, and face failures when human judgment is eliminated from the equation.

---

## Three Core Components

### 1. Goal Discovery (The Questionnaire)
An interactive, multi-turn LLM-powered conversation that surfaces latent goals —
the ones beneath the surface of what users initially say they want.

- Moderate psychological depth: adult life issues (career, relationships, health,
  finances, purpose) but not deep psychoanalysis or therapy
- Socratic in approach: follow-up questions probe the "why" behind stated goals
- Misalignment detection: if a user's answers across the conversation contradict
  each other, the system challenges them explicitly
- The conversation should feel like talking to a thoughtful, curious,
  non-judgmental friend — not a therapist, not a life coach selling something
- Concludes with a structured summary of agreed-upon goals, confirmed with the
  user before moving to action planning

### 2. Action Planning
Given confirmed goals, the system generates granular, concrete actions required
to achieve them.

- Tasks specific enough to be unambiguous ("walk for 20 minutes after dinner on
  Monday, Wednesday, Friday" not "exercise more")
- Flexible deadlines: timing adapts to user effort and pace
- Multiple parallel action tracks may exist for different goals simultaneously
- Task decomposition quality is a core differentiator

### 3. Adaptive Execution Loop
An iterative progress tracking and feedback system that adjusts over time.

- Users check in regularly (daily or weekly, flexible)
- System is encouraging but does not shy away from calling out failures
- Adaptive difficulty:
  - >80% task completion → increase difficulty and ambition
  - 40–80% completion → maintain current difficulty
  - <40% completion → simplify tasks, focus on smaller wins
- Repeated failure on a specific goal raises the question of abandonment or reframe

---

## Key Design Principles

**Anonymity First** — No social accountability features in MVP. Entirely private.

**Compassionate Accountability** — Honest about failures, never punitive.

**Goal Pivoting** — System must know when to suggest stopping.

**Autonomy** — Users choose from AI-suggested tasks rather than having them prescribed.

---

## Market & Business Context

### Target Markets
- **B2C**: Individuals seeking self-improvement and structured accountability
- **B2B**: Employee development, wellness benefits, performance coaching, white-label

### Monetization (MVP)
- **Free tier**: 1 active goal, limited check-ins, basic task generation
- **Paid tier**: $15–20/month — unlimited goals, daily AI coaching, full adaptive system
- **B2B**: $50–100/user/year, sold in packs of 10+

### Competitive Landscape
Apps to analyse: Coachello, Akido, GoalsWon, Mentor AI, Noa Coach, Habitica,
Rosebud, Reflectly, Woebot, Wysa, Lattice, 15Five

Key differentiators to validate: anonymity-first design, deep goal discovery,
adaptive difficulty, psychological sophistication without crossing into therapy.

---

## Project Phases

### Phase 0.0 — Complete: Throwaway Prototype (Local)
Test whether the LLM can reliably conduct goal discovery conversations that
surface meaningful, non-obvious goals. Intentionally disposable.

### Phase 0.1 — Current: Throwaway Prototype (Vercel)
Make prototype available to friends and family to determine viability.

### Phase 1 — MVP (Months 1–3)
Full application with goal discovery, task generation, check-in system, and
adaptive feedback. Web-only. Anonymous sessions. No social features.

### Phase 2 — Post-MVP
- User accounts and persistent history
- Mobile-responsive polish / potential React Native app
- B2B admin panel and team features
- Human coaching integration (TBD)
- Neo4j integration for relationship-based goal pattern analysis
- ML-enhanced adaptive difficulty

---

## Open Questions

- Should the goal discovery conversation have a defined maximum number of turns,
  or should the LLM determine when to conclude?
- How should conversation context be managed across multiple sessions once
  persistent storage is added?
- What is the right level of task granularity — who decides, user or system?
- At what failure threshold exactly should the system raise a goal pivot conversation?
- Should check-in frequency be user-defined, system-recommended, or adaptive?
- How do we handle goals that require external data (fitness, finance) vs.
  purely self-reported progress?
- Human coaching integration: marketplace model, referral model, or in-house?
- B2B go-to-market: direct sales, partnerships, or product-led growth?

---

## Full Historical Changelog

### Phase 0.1 — Feb 22–23 2026
- Session identity: UUID generated on first visit, stored in `localStorage` under
  `goalapp_session_id`, sent with every `/chat` request
- Conversation logging to Supabase (`conversation_logs` table)
- Admin transcript viewer: `admin.html`
- User identity and name collection via `POST /register-name` (Claude Haiku extracts
  name, Supabase RPC `increment_user_counter()` assigns sequential number, formats
  as `Name####` e.g. `Sarah0001`)
- User identifier stored in `localStorage` under `goalapp_user_identifier`
- Returning users see "Welcome back" on reload and skip name prompt
- AI persona: assistant presents as "Stef"
- Vercel deployment: `vercel.json` with `@vercel/node` build, `includeFiles`, catch-all route
- `server.js` exports app as default, guards `app.listen()` behind `!process.env.VERCEL`

### Phase 0.1 — Feb 24 2026
- Auto-focus textarea after each AI response
- Token usage tracking: `input_tokens` / `output_tokens` columns in `conversation_logs`

### Phase 0.1 — Mar 1 2026
- Responsive CSS / PWA viewport fixes (viewport-fit=cover, 100dvh, safe-area padding,
  16px textarea font-size, 44px tap targets, @media 480px breakpoint)

### Phase 0.1 — Mar 2026 — PWA Support
- `public/manifest.json`, `sw.js` service worker (cache-first app shell)
- Full PWA icon set (9 files, 72px–512px, dark purple #0d0d1a background)
- PWA meta tags in `index.html`
- Explicit Express routes for `/manifest.json`, `/sw.js`, `/icons/*`
- SW registration gated to mobile only

### Phase 0.1 — Mar 7 2026 — Voice Features
- **Step 3 — Voice input**: Mic button using `SpeechRecognition` API; red pulse animation
- **Step 4 — Voice output**: `speakResponse()` using `SpeechSynthesis`; sentence-by-sentence
  streaming in sync with speech; `activeSpeechIdRef` guards stale callbacks
- **Step 5 — Hands-free loop**: Continuous receive mode, 4s silence timer auto-sends,
  `handsFreeRef` resumes `startReceiveMode()` after speech ends
- **Bug fixes**: `sendMessageRef` stale closure fix; Chrome TTS user-gesture unlock;
  Chrome stuck speech queue fix; empty utterance queue-blocking fix
- **Step 5a — Tap-to-start overlay**: Full-screen overlay on first load, pulsing hint,
  dismisses and starts receive mode; `voiceStarted` state
- **Step 5b**: Silent `SpeechSynthesisUtterance('')` on overlay tap unlocks Android Chrome TTS
- **Step 5c**: Debug overlay promoted to permanent dev feature (`?debug=true`)

### Phase 0.1 — Mar 2026 — OpenAI TTS
- Server-side `POST /api/tts` — strips markdown, calls OpenAI TTS (`tts-1`, `nova`, `mp3`)
- Client `speakWithOpenAI()` — plays blob via `new Audio(url)`, falls back to `speakResponse()`
- `currentAudioRef` tracks playing element for interrupt
- `openai` npm package added; `OPENAI_API_KEY` in `.env.example`

### Phase 0.1 — Mar 2026 — Synthesis Backend
- New system prompt with `%%SYNTHESIS_READY%%` and `%%STORY_CONFIRMED%%` markers
- `prompts/extraction-prompt.txt` — structured JSON extraction
- `prompts/synthesis-prompt.txt` — four-section narrative writing prompt
- `runSynthesisPipeline()` — extraction → synthesis; results stored in Supabase
- `%%STORY_CONFIRMED%%` detection → sets `storyConfirmed`, runs Next Chapter pipeline
- Supabase logging fix: `await`ed insert in `/chat`

### Phase 0.1 — Mar 2026 — Next Chapter, Frontend State, PDF
- `prompts/next-chapter-prompt.txt`
- `runNextChapterPipeline()` triggered on `%%STORY_CONFIRMED%%`
- `%%CHAPTER_CONFIRMED%%` detection → sets `chapterConfirmed`
- `GET /session/:sessionId` — returns `{ storyConfirmed, chapterConfirmed, hasNarrative, hasNextChapter }`
- `GET /download-pdf/:sessionId` → two-page PDF via `pdfkit`
- Parchment card CSS (`.narrative-card`, `.narrative-card-header`, `.download-btn`)
- `classifyMsg()` helper; `sessionState` state; `fetchSessionState()` after each reply
- Download button appears only when `chapterConfirmed = true`

### Phase 0.1 — Mar 2026 — Debug Test Fixture
- `FIXTURE_MESSAGES` and `FIXTURE_SESSION_STATE` constants
- "Inject Test Conversation" button in debug overlay
- `injectFixture()` sets messages, sessionId, awaitingName, sessionState directly

### Supabase Session Persistence
- Replaced in-memory `sessionStore` Map with Supabase-backed persistence
- `getSession()` and `saveSession()` async helpers wrapping `sessions` table
- Fixes synthesis pipeline and PDF generation failures on Vercel serverless

### Admin Synthesis Notes Display
- `GET /admin/transcript/:sessionId` returns `extractionJson` and `userIdentifier`
- Transcript / Synthesis Notes tab toggle in `admin.html`

### Extraction JSON Persistence
- Supabase update stores `extraction_json` in `users` table after `runSynthesisPipeline`

### Server-side Message Type Tagging
- Replaced fragile content-based `classifyMsg()` with explicit `messageType` field
- Server tags responses as `'synthesis'`, `'next-chapter'`, or `'chat'`
- `classifyMsg()` simplified to direct `messageType` lookup

### Test Chapter Adjustment Fixture
- `FIXTURE_MESSAGES_CHAPTER` — ends before chapter confirmation
- `FIXTURE_SESSION_STATE_CHAPTER` with `chapterConfirmed: false`
- `injectFixtureChapter()` function and "Test Chapter Adjustment" button

### Desktop First-Turn Mic Prompt
- Desktop users see instructional message prompting mic click
- First mic click unlocks Chrome autoplay policy and dismisses message

### Mobile-Only Overlay / Desktop Auto-Init
- Tap-to-start overlay shown on mobile only
- `voiceStarted` initialises to `!isMobile`
- `initializeSession()` extracted as named function

### DebugOverlay Component Extraction
- Extracted `{debugMode && (...)}` block from `index.html` into `DebugOverlay` component
- Props: `debugOpen`, `setDebugOpen`, `debugLog`, `injectFixture`, `injectFixtureChapter`

### Vite Migration
- CDN React/Babel replaced with Vite build
- `src/App.jsx`, `src/main.jsx`, `src/styles.css` created
- `index.html` is now a thin Vite shell
- `server.js` updated to serve `dist/`
- `vercel.json` updated to include `dist/**`

### New Repo
- Project moved to waynemareci/mysuccessstory (previously waynemareci/strategyFacilitator000)
- Explicit `app.get('/admin.html')` route added (`express.static` unreliable on Vercel)

### Component Extractions (Mar 2026)
- `NarrativeCard` extracted into `src/components/NarrativeCard.jsx`
- `NextChapterCard` extracted into `src/components/NextChapterCard.jsx`
- `VoiceOverlay` extracted into `src/components/VoiceOverlay.jsx`

### CLAUDE.md Restructure
- Split into `CLAUDE.md` (lean working context) and `CLAUDE-history.md` (this file)
- Changelog format standardised to date-grouped entries, newest first
