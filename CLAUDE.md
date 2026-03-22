# Goal Achievement App — Project Brief

## Vision
An AI-powered goal achievement platform that helps users discover their true, most 
important goals (which may not be immediately obvious even to themselves), commit to 
actionable steps, and adaptively track progress with compassionate accountability.

The application is anonymous-first: users are more willing to take risks, be honest, 
and face failures when human judgment is eliminated from the equation.

---

## Three Core Components

### 1. Goal Discovery (The Questionnaire)
An interactive, multi-turn LLM-powered conversation that surfaces latent goals — the 
ones beneath the surface of what users initially say they want.

- Moderate psychological depth: adult life issues (career, relationships, health, 
  finances, purpose) but not deep psychoanalysis or therapy
- Socratic in approach: follow-up questions probe the "why" behind stated goals
- Misalignment detection: if a user's answers across the conversation contradict each 
  other, the system challenges them explicitly rather than accepting surface responses
- The conversation should feel like talking to a thoughtful, curious, non-judgmental 
  friend — not a therapist, not a life coach selling something
- Concludes with a structured summary of agreed-upon goals, confirmed with the user 
  before moving to action planning
- The LLM is expected to do the heavy lifting of determining when goals are 
  sufficiently surfaced vs. when to probe deeper

### 2. Action Planning
Given confirmed goals, the system generates granular, concrete actions required to 
achieve them.

- Tasks should be specific enough to be unambiguous (not "exercise more" but 
  "walk for 20 minutes after dinner on Monday, Wednesday, Friday")
- Flexible deadlines: timing adapts to user effort and pace rather than rigid 
  calendar targets
- Multiple parallel action tracks may exist for different goals simultaneously
- User is presented with AI-suggested tasks and commits to them (with autonomy to 
  adjust)
- Task decomposition quality is a core differentiator — this must be excellent

### 3. Adaptive Execution Loop
An iterative progress tracking and feedback system that adjusts over time.

- Users check in regularly (daily or weekly, flexible based on preference)
- Check-ins are text-based: user reports what happened, system interprets success 
  or failure
- System is encouraging but does not shy away from calling out failures to execute
- Adaptive difficulty:
  - >80% task completion rate → increase difficulty and ambition of next tasks
  - 40–80% completion rate → maintain current difficulty level
  - <40% completion rate → simplify tasks, focus on smaller wins
- If a user repeatedly fails at tasks associated with a specific goal, the system 
  raises the question of whether the goal should be abandoned or reframed
- No human coaching in MVP — purely AI-driven

---

## Key Design Principles

**Anonymity First**
No social accountability features in MVP. Users do not share progress with others. 
The entire experience is private. This reduces fear of judgment and increases 
willingness to set ambitious or unconventional goals and to honestly report failures.

**Compassionate Accountability**
The system is honest about failures — it does not let users rationalize or ignore 
missed commitments — but delivers this honesty with encouragement, not shame. Tone 
should never feel punitive.

**Goal Pivoting**
The system must know when to suggest stopping. Repeated failure on a specific goal 
is a signal, not just noise. The system should surface this pattern and offer the 
user a structured conversation about abandoning, reframing, or scaling back the goal.

**Autonomy**
Users choose from AI-suggested tasks rather than having tasks prescribed. The system 
recommends, the user commits. This increases ownership and follow-through.

---

## Market & Business Context

### Target Markets
- **B2C**: Individuals seeking self-improvement, goal clarity, and structured 
  accountability without the cost or vulnerability of human coaching
- **B2B**: 
  - Employee development (L&D departments)
  - Wellness benefits programs (HR)
  - Performance coaching for teams (sales, leadership)
  - White-label licensing to coaches and consultants

### Monetization (MVP)
- **Free tier**: 1 active goal, limited check-ins, basic task generation
- **Paid tier**: $15–20/month
  - Unlimited goals
  - Daily AI coaching interactions
  - Full adaptive difficulty system
  - Progress analytics
- **B2B**: $50–100/user/year, sold in packs of 10+ users

### Competitive Landscape (Research in Progress)
Apps to analyze: Coachello, Akido, GoalsWon, Mentor AI, Noa Coach, Habitica, 
Rosebud, Reflectly, Woebot, Wysa, Lattice, 15Five

Key differentiators to validate:
- Anonymity-first design
- Deep goal discovery (not surface-level task management)
- Adaptive difficulty
- Psychological sophistication without crossing into therapy

---

## Tech Stack

### MVP Stack
- **Frontend**: React (Next.js preferred for routing and API routes)
- **Backend**: Node.js / Express (or Next.js API routes)
- **Database**: PostgreSQL (chosen over Neo4j for MVP speed; Neo4j reconsidered 
  post-MVP when relationship complexity justifies it)
- **LLM**: Anthropic Claude API (primary), OpenAI as fallback consideration
- **Auth**: Anonymous sessions for MVP (no login required initially)
- **Hosting**: TBD (Vercel for frontend, Railway or Render for backend/DB)
- **Analytics**: Mixpanel or Amplitude (post-MVP)

### Database Schema (Initial Thinking)
Core entities:
- **Users** (anonymized session-based profiles)
- **Goals** (hierarchical: meta-goals → sub-goals, with status tracking)
- **Tasks** (states: pending, in-progress, completed, failed, abandoned)
- **CheckIns** (timestamped self-reports tied to tasks)
- **ConversationHistory** (stored for LLM context in future sessions)
- **MisalignmentFlags** (logged when system challenges user's stated goal)

### LLM Integration Approach
- Anthropic Claude API via `@anthropic-ai/sdk`
- Multi-turn conversation with full history passed on each request
- Structured JSON outputs for goal summaries and task generation
- Separate system prompts for each mode: discovery, planning, check-in, 
  pivot conversation
- API key via environment variable: `ANTHROPIC_API_KEY`

---

## Project Phases

### Phase 0.0 — Complete: Throwaway Prototype (Local)
**Goal**: Test whether the LLM can reliably conduct goal discovery conversations 
that surface meaningful, non-obvious goals.

This prototype is intentionally disposable. No production code. No scalability. 
The only output that matters is knowledge about what works in the conversation flow.

What to build:
- Minimal Express server with one POST `/chat` endpoint
- In-memory conversation history (no database)
- Single-page chat UI (React via CDN, no build tools)
- `/prompts` folder with versioned system prompt files
- `/notes` folder for documenting what works and what doesn't

What to learn:
- Does the AI ask interesting, probing follow-up questions or stay surface-level?
- Does it catch misalignment between different user responses?
- How many turns does it take to reach something meaningful?
- What prompt strategies produce the best goal summaries?
- Does the conversation feel natural or robotic?

### Phase 0.1 — Current: Throwaway Prototype (Vercel)
**Goal**: Make prototype available to friends and family on the Internet to determine viability of project.

This prototype is intentionally disposable. No production code. No scalability. 
The only output that matters is knowledge about what works in the conversation flow.

What to build:
- Vercel deployment with Supabase database and minimal UI

What to learn:
- Do others find the goal-determining process useful?

### Phase 1 — MVP (Months 1–3)
Full application with goal discovery, task generation, check-in system, and 
adaptive feedback. Web-only. Anonymous sessions. No social features.

### Phase 2 — Post-MVP
- User accounts and persistent history
- Mobile-responsive polish / potential React Native app
- B2B admin panel and team features
- Human coaching integration (TBD)
- Community/accountability features (TBD)
- Neo4j integration for relationship-based goal pattern analysis
- ML-enhanced adaptive difficulty (replacing rules-based system)

---

## Current Development Status

**Active task**: Gathering feedback from testers on Prototype v0.1

**Completed (Phase 0.1 — Feb 22–23 2026)**:
- Session identity: UUID generated on first visit, stored in `localStorage` under
  `goalapp_session_id`, sent with every `/chat` request. Server is fully stateless.
- Conversation logging: full turn-by-turn logging to Supabase (`conversation_logs`
  table). Timestamps formatted as "Sun Feb 22 9:12:00 AM EST".
- Admin transcript viewer: `admin.html` — two-panel UI showing session list (left)
  and full conversation transcript (right), sourced from Supabase via
  `GET /admin/sessions` and `GET /admin/transcript/:sessionId`.
- User identity and name collection:
  - `prompts/welcome.txt` — source of truth for the welcome/intro message, loaded
    at server startup. Developer warning header stripped before serving. Server exits
    if file is missing.
  - `GET /welcome` endpoint — serves the welcome message to the UI (never hardcoded
    in HTML).
  - `POST /register-name` endpoint — accepts `{sessionId, rawInput}`, uses Claude
    Haiku to extract the name from natural language, calls Supabase RPC
    `increment_user_counter()` atomically to assign a sequential number, formats
    identifier as `Name####` (e.g. `Sarah0001`), stores in `users` table.
  - User identifier stored in `localStorage` under `goalapp_user_identifier` and
    passed to `/chat` on every request.
  - System prompt personalized with first name on each `/chat` call.
  - Returning users (identifier in localStorage) see "Welcome back" on reload and
    skip the name prompt.
- AI persona: assistant presents itself as "Stef" (per welcome text).
- App title changed from "Goal Discovery" to "Strategy Facilitator".
- Vercel deployment: `vercel.json` at project root with `@vercel/node` build,
  `includeFiles` for HTML and prompts, catch-all route. `server.js` exports app
  as default and guards `app.listen()` behind `!process.env.VERCEL`.
- Git repository initialized with `.gitignore` (excludes node_modules, .env,
  CLAUDE session backup files) and `prototype/.env.example`.
- `GET /admin/sessions` joins `users` table to display `user_identifier` in the
  session list instead of raw session UUID. `__START__` messages excluded from
  message counts.
- Timestamps pinned to `America/New_York` timezone via `Intl.DateTimeFormat`
  to prevent UTC display on Vercel servers.

**Completed (Phase 0.1 — Feb 24 2026)**:
- Auto-focus textarea: cursor automatically placed in text input after each AI
  response via `useRef` + `useEffect` on `loading` state in `index.html`.
- Token usage tracking: `input_tokens` and `output_tokens` columns added to
  `conversation_logs` table. Server stores Anthropic API usage data on every
  assistant row. `admin.html` transcript view displays token counts (e.g.
  `1842 in / 214 out`) alongside the timestamp beneath each assistant bubble.

**Completed (Phase 0.1 — Mar 1 2026)**:
- Responsive CSS / PWA viewport fixes applied to `prototype/index.html` (CSS
  only; no JS or HTML structure changed):
  - `viewport-fit=cover` added to meta viewport tag for iPhone notch/home
    indicator support.
  - `body` uses `height: 100dvh` (with `100vh` fallback) so layout fills the
    visual viewport, not the larger layout viewport that includes browser chrome.
  - `#messages` gains `min-height: 0` (prevents flex child from refusing to
    shrink when virtual keyboard appears) and `overscroll-behavior: contain`
    (stops iOS rubber-band scroll bleed-through).
  - `.message` max-width changed to `min(600px, 88vw)` for narrow phones.
  - `footer` has `flex-shrink: 0` and safe-area-aware padding via
    `max(Npx, env(safe-area-inset-*))` for iPhone home indicator clearance.
  - `textarea` font-size raised to `16px` (prevents iOS auto-zoom on focus);
    `min-height: 44px` added.
  - `button` gains `min-height: 44px` / `min-width: 44px` (Apple HIG tap target).
  - `@media (max-width: 480px)` rule reduces header padding and h1 font size on
    small phones.

**Completed (Phase 0.1 — Mar 2026)**:
- PWA support added — app is installable on Android and iOS home screens:
  - `prototype/public/manifest.json` — web app manifest (name, theme color,
    icon references, display: standalone).
  - `prototype/sw.js` — service worker: cache-first for app shell assets,
    network-pass-through for all API routes (`/chat`, `/register-name`,
    `/welcome`, `/admin`). Cache versioned via `CACHE_VERSION` constant —
    bump on each deploy to force cache refresh.
  - `prototype/public/icons/` — full PWA icon set (9 files: 72px through 512px
    plus apple-touch-icon.png). Icons use dark purple `#0d0d1a` background,
    cropped from source image to remove original rounded-square frame.
  - `prototype/index.html` — PWA meta tags added to `<head>` (manifest link,
    theme-color, apple-mobile-web-app-* tags, apple-touch-icon). SW registration
    script added before `</body>`, gated to mobile only via userAgent check so
    desktop users never see install prompts or SW behavior.
  - `prototype/server.js` — explicit Express routes added for `/manifest.json`,
    `/sw.js`, and `/icons/*` so Vercel serverless function can serve these files.
  - `vercel.json` — updated `includeFiles` to bundle `sw.js`, `manifest.json`,
    and `public/icons/**` with the serverless function. All four PWA routes
    (`/manifest.json`, `/sw.js`, `/icons/(.*)`, `(.*)`) point to
    `prototype/server.js` — Express handles all routing, not Vercel's CDN.
  - Desktop browser experience is unchanged — no install prompt, no SW
    registration, identical behavior to pre-PWA.
  - Android Chrome: "Add to Home Screen" available via three-dot menu; app
    launches full-screen without browser chrome after install.
  - iOS Safari: install via Share → Add to Home Screen; apple-touch-icon and
    apple-mobile-web-app-* meta tags provide correct icon and standalone behavior.

**Completed (Phase 0.1 — Mar 7 2026) — Voice features (Steps 3–5)**:
- **Step 3 — Voice input**: Mic button in footer using `SpeechRecognition` API.
  Clicking starts a single-utterance listen session; transcript appended to textarea.
  Button shows red pulse animation while recording. Setting `voiceModeRef = true` so
  the subsequent send is tagged as a voice turn.
- **Step 4 — Voice output**: `speakResponse()` function using `SpeechSynthesis` API.
  Text split into sentences; each spoken sequentially via `SpeechSynthesisUtterance`.
  Text streams into the message bubble in sync with speech (sentence-by-sentence).
  `activeSpeechIdRef` guards stale callbacks if speech is cancelled/superseded.
  Typing in textarea while speaking sets `pendingStopRef = true` — speech stops
  cleanly after current sentence, full text fills bubble.
  Voice output only triggered when `wasVoiceMode = true` at send time.
- **Step 5 — Hands-free loop**: Continuous receive mode with auto-send and auto-resume.
  `startReceiveMode()` runs continuous `SpeechRecognition`, accumulates transcript in
  textarea and ref. After 4s of silence with non-empty transcript, auto-sends as a
  voice turn (`voiceModeRef = true`, `handsFreeRef = true`). After AI speech ends,
  `handsFreeRef` triggers `startReceiveMode()` again — fully automatic loop.
  `stopReceiveMode(leaveAccumulated)` — stops recognition, clears silence timer;
  `leaveAccumulated=true` preserves textarea for manual editing/send.
  Manual typing exits receive mode cleanly (no auto-resume). Enter/Send while in
  receive mode treats the turn as hands-free (voice out + resume listening after).
  Mic button: green pulsing = receive mode active, grey = idle, disabled during loading.
  Status bar: green dot + "Listening…" during receive; purple dot + "Speaking…" during TTS.
  `visibilitychange` effect restarts recognition when tab returns to foreground.
  `recognition.onend` auto-restarts recognition while in receive mode (browser stops
  continuous recognition after ~60s of silence on some platforms).
- **Bug fixes during Step 5 implementation**:
  - Stale closure: `sendMessageRef` ref pattern added so `startReceiveMode`'s silence
    timer always calls the latest `sendMessage` (with current `synthSupported`, `messages`,
    `awaitingName` state) rather than a stale first-render version.
  - Chrome TTS user-gesture requirement: `speechSynthesis.speak()` is blocked until
    the page receives user activation. Fixed with a "Tap to start voice conversation"
    purple banner that appears on load; tapping it fires a silent `'a'` utterance
    (volume=0, rate=10) to unlock TTS for the session, then starts receive mode.
    Banner disappears and is replaced by the green "Listening…" indicator. The mic
    button click also does the TTS unlock on first press.
  - Chrome stuck speech queue: added `activeSpeechIdRef.current = null` +
    `window.speechSynthesis.cancel()` at the start of every `speakResponse()` call
    to clear any queued utterances that might block new speech.
  - Empty utterance queue-blocking: earlier unlock attempts used
    `SpeechSynthesisUtterance('')` which can get permanently stuck in Chrome's queue.
    Replaced with `SpeechSynthesisUtterance('a')` with rate=10 (processes in ~50ms).
- **Step 5a — Tap-to-start overlay**: Full-screen `position:fixed` overlay on first load.
  Background `#0d0d1a` (matches manifest theme). Shows app name "My Success Story" and
  pulsing "Tap to begin your session" subtitle (`overlay-hint` CSS class). Tap anywhere
  dismisses, calls `startReceiveMode()` (if speechSupported), unlocks TTS via silent
  `'a'` utterance. Unsupported browsers: tap dismisses, normal text chat revealed.
  Controlled by `voiceStarted` state — never reappears within a session. Shown on both
  desktop and mobile for consistency; satisfies Android Chrome user-gesture requirement.
- **Step 5b — SpeechSynthesis gesture unlock**: Added `speechSynthesis.speak(new
  SpeechSynthesisUtterance(''))` to the overlay tap handler. Fires a silent zero-length
  utterance during the tap gesture, unlocking SpeechSynthesis for the remainder of the
  session. Fixes silent voice output on Android Chrome.
- **Step 5c — Debug overlay promoted to permanent dev feature**: On-screen console panel
  fixed bottom-right, gated behind `?debug=true` URL parameter. `const debugMode` added
  alongside `isTestMode`. `dbg` is a no-op when `!debugMode` (no overhead in production).
  Debug state (`debugLog`, `debugOpen`) declared unconditionally (React hook rules);
  overlay JSX wrapped in `{debugMode && (...)}`. All `// DEBUG` and `{/* DEBUG */}`
  comment markers removed. Access at `/?debug=true` — invisible in normal use.

**Supabase tables in use**:
- `conversation_logs` — all chat turns (session_id, role, content,
  timestamp_display, input_tokens, output_tokens)
- `users` — registered user identifiers (user_identifier, display_name, session_id)
- `user_id_counter` — single-row atomic counter; column is `next_value`
- RLS disabled on all three tables; anon role granted appropriate permissions

- **Step 6 — OpenAI TTS (nova) as primary voice output**: Server-side `POST /api/tts`
  endpoint accepts `{ text }`, strips markdown via `stripMarkdown()` utility, calls
  OpenAI TTS API (`tts-1` model, `nova` voice, `mp3` format), and streams the binary
  audio back. Client `speakWithOpenAI(fullText)` fetches `/api/tts`, plays the returned
  blob via `new Audio(url)`, sets `isSpeaking` on `onplay`/`onended`, and resumes
  receive mode (hands-free loop) on `onended` if `handsFreeRef` is set. On any error
  (non-200 or fetch failure) falls back silently to existing `speakResponse()`.
  Full response text is now displayed immediately on arrival; audio plays ~1 s later
  (no more sentence-by-sentence streaming sync). `currentAudioRef` tracks the playing
  Audio element for immediate interrupt on mic tap or textarea edit. `openai` npm
  package added; `OPENAI_API_KEY` added to `.env.example`. `stripMarkdown` extracted
  to server-level utility (shared by TTS endpoint).

**Completed (Phase 0.1 — Mar 2026) — Synthesis backend implementation**:
- Replaced system prompt with revised version: synthesis readiness instructions,
  `%%SYNTHESIS_READY%%` and `%%STORY_CONFIRMED%%` marker protocol, six listening
  dimensions, two-movement narrative structure.
- Replaced welcome text with rebranded My Success Story version (no longer
  references "Stef" or Wayne by name; explains story + Next Chapter deliverables).
- Created `prompts/extraction-prompt.txt` — structured JSON extraction from
  conversation transcript (identity signals, current reality, history/pattern,
  emotional texture, signal phrases, surface/real goal, central tension).
- Created `prompts/synthesis-prompt.txt` — four-section narrative writing prompt
  (opening reframe, what came through, the thing worth naming, first-person close).
- `%%SYNTHESIS_READY%%` detection in `/chat` handler: triggers `runSynthesisPipeline()`
  server-side; Claude's own synthesis attempt is discarded in favour of pipeline output.
  Graceful fallback (strips marker, returns preamble text) if pipeline throws.
- `runSynthesisPipeline(sessionId, messages)`: calls extraction model
  (`claude-sonnet-4-20250514`, max 2048 tokens) with full transcript; parses JSON
  (strips markdown fences); calls synthesis model (same, max 1024 tokens) with
  pretty-printed extraction data; stores both results on `sessionStore`.
- `%%STORY_CONFIRMED%%` detection: strips marker from displayed text, sets
  `session.storyConfirmed = true`, stores `session.confirmedNarrative` from
  `session.pendingNarrative`. Logs confirmation with session ID.
- In-memory `sessionStore` (Map) keyed by `sessionId` persists extraction JSON,
  pending narrative, and confirmed story for future Next Chapter / PDF tasks.
- Supabase logging fix (same deploy): `await`ed the insert in `/chat` so Vercel
  serverless doesn't freeze the function before the write completes.

**Completed (Phase 0.1 — Mar 2026) — Next Chapter, frontend state, and PDF**:
- Created `prompts/next-chapter-prompt.txt` — generates 2–3 specific first moves from
  confirmed narrative + extraction JSON; ends with `%%CHAPTER_CONFIRMED%%` marker.
- Added `CHAPTER_CONFIRMED_MARKER` constant.
- Loaded `next-chapter-prompt.txt` at startup alongside extraction/synthesis prompts.
- Added `session.extractionJson` alias in `runSynthesisPipeline` (alongside `extractionData`).
- Added `runNextChapterPipeline(sessionId, confirmedNarrative, extractionJson)` —
  calls `claude-sonnet-4-20250514` with the next-chapter prompt + actual inputs.
- Extended `%%STORY_CONFIRMED%%` detection to trigger `runNextChapterPipeline`; stores
  `session.nextChapter`; appends Next Chapter text to the confirmed reply.
- Added `%%CHAPTER_CONFIRMED%%` detection — strips marker, sets `session.chapterConfirmed`.
- Added `GET /session/:sessionId` — returns `{ storyConfirmed, chapterConfirmed,
  hasNarrative, hasNextChapter }` from in-memory session store.
- Added `GET /download-pdf/:sessionId` — generates a two-page Letter PDF using
  `pdfkit`: Page 1 "MY SUCCESS STORY" (narrative), Page 2 "MY NEXT CHAPTER".
  Filename: `my-success-story.pdf`. `pdfkit` added to `prototype/package.json`.
- Frontend (`index.html`):
  - Added `classifyMsg(msg, index, visibleMsgs)` helper — classifies assistant messages
    as `'synthesis'` (length > 400, starts with "You "), `'next-chapter'` (follows
    synthesis, contains numbered actions), or `null`.
  - Added parchment card CSS (`.narrative-card`, `.narrative-card-header`, `.download-btn`).
  - Added `sessionState` state; `fetchSessionState()` called after each assistant reply.
  - Message render loop replaced with classified renderer: synthesis → MY SUCCESS STORY
    card; next-chapter → MY NEXT CHAPTER card + conditional download button.
  - Download button (`Download My Story (PDF)`) appears below the last Next Chapter
    card only when `sessionState.chapterConfirmed` is true.

**Completed (Phase 0.1 — Mar 2026) — Debug Test Fixture**:
- Added `FIXTURE_MESSAGES` and `FIXTURE_SESSION_STATE` constants to `index.html`
- Added "Inject Test Conversation" button to debug overlay (visible only at `?debug=true`)
- `injectFixture()` handler sets messages, sessionId, awaitingName, and sessionState
  directly in React state — no API calls, no Supabase writes
- `fetchSessionState` guards against polling when `sessionId === 'fixture-test-session'`
- Allows immediate testing of parchment card rendering, Next Chapter display, and PDF
  download button without conducting a real conversation

**Next steps**:
- Continue gathering tester feedback
- Deploy to Vercel and run end-to-end test conversation through all three stages

---

## Folder Structure (Actual)

Strategy Facilitator/
├── CLAUDE.md                  # This file — persistent project context
├── /prototype                 # Phase 0 throwaway code
│   ├── server.js              # Express server, Claude API, Supabase logging
│   ├── index.html             # Single-page chat UI (React via CDN)
│   ├── admin.html             # Transcript viewer for developer review
│   ├── sw.js                  # PWA service worker (cache-first app shell)
│   ├── package.json
│   ├── .env                   # API keys (gitignored)
│   └── /public                # Static assets served by Express
│       ├── manifest.json      # PWA web app manifest
│       └── /icons             # PWA icon set (9 files, 72px–512px)
├── /prompts                   # System prompt files
│   ├── system-prompt-v1.txt   # Goal discovery system prompt
│   └── welcome.txt            # Welcome/intro message (source of truth)
├── /notes                     # Research and design decisions (to be populated)
└── /app                       # Phase 1 MVP (not started)

---

## Developer Context

- Solo developer initially, with plans to bring on collaborators as the product matures
- Strong background in React, Node.js, Neo4j, MongoDB, PostgreSQL
- Experience with Anthropic Claude API and LLM integration
- Existing project: Personal Finance Dashboard (credit card optimization, Plaid 
  integration) — separate codebase, potential future integration point for 
  financial goal tracking
- Currently studying for Series 65 exam (investment advisory) — B2B angle in 
  financial wellness space worth exploring
- Development environment: Windows 11, VSCode, WSL
- Vercel deployment pattern: all routes in `vercel.json` point to
  `prototype/server.js`. Static files (manifest, icons, sw.js) are served
  via explicit Express routes using `res.sendFile` and `express.static`,
  not via Vercel's CDN. Files must be listed in `includeFiles` in `vercel.json`
  to be bundled with the serverless function.

---

## Change Log

### Server-side message type tagging
- Replaced fragile content-based classifyMsg() with explicit messageType field returned by /chat endpoint
- Server tags responses as 'synthesis', 'next-chapter', or 'chat'
- Client stores messageType alongside message content
- classifyMsg() simplified to direct messageType lookup
- Eliminates edge cases from pattern matching on message length and content

### Test Chapter Adjustment fixture
- Added FIXTURE_MESSAGES_CHAPTER array ending before chapter confirmation
- Added FIXTURE_SESSION_STATE_CHAPTER with chapterConfirmed: false
- Added injectFixtureChapter() function
- Added "Test Chapter Adjustment" button alongside existing inject button

### Desktop first-turn mic prompt
- Desktop users see an instructional message prompting them to click the mic button
- First mic click unlocks Chrome autoplay policy and dismisses the message
- All subsequent turns on desktop are fully hands-free
- Mobile overlay behavior unchanged

### Mobile-only tap-to-start overlay with automatic desktop initialization
- Tap-to-start overlay now only shown on mobile devices (Android/iPhone/iPad/iOS)
- Desktop users bypass overlay; first mic click initializes voice (no auto-start)
- Mobile behavior and voice warm-up logic unchanged
- Extracted session initialization into named initializeSession() function

### Supabase session persistence
- Replaced in-memory sessionStore Map with Supabase-backed session persistence
- Added getSession() and saveSession() async helpers wrapping the `sessions` table
- All sessionStore.get / sessionStore.set calls replaced throughout server.js
- Fixes synthesis pipeline and PDF generation failures on Vercel serverless

### Admin Synthesis Notes Display
- Extended GET /admin/transcript/:sessionId to return extractionJson and userIdentifier
  from users table
- Added Transcript / Synthesis Notes tab toggle to admin.html session detail view
- Synthesis Notes tab displays extraction JSON as formatted labeled sections

### Extraction JSON Persistence
- Added Supabase update to store extraction_json in users table after extraction
  completes in runSynthesisPipeline

> Step 3 complete — Voice input layer added. Mic button in footer wires Web Speech API
> to textarea. Graceful hide on unsupported browsers. Send logic untouched.

> Step 4 complete — Voice output layer added. App speaks responses for voice-initiated
> turns via SpeechSynthesis. Text streams sentence-by-sentence in sync with speech.
> Interrupt on next user action (finishes current sentence). Text-only flow unchanged.

---

## Open Questions (To Resolve During Development)

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