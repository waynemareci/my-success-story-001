# Development Status

## Project Phases

### Phase 0.0 — Complete: Throwaway Prototype (Local)
**Goal**: Test whether the LLM can reliably conduct goal discovery conversations that surface meaningful, non-obvious goals.

This prototype is intentionally disposable. No production code. No scalability. The only output that matters is knowledge about what works in the conversation flow.

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

This prototype is intentionally disposable. No production code. No scalability. The only output that matters is knowledge about what works in the conversation flow.

What to build:
- Vercel deployment with Supabase database and minimal UI

What to learn:
- Do others find the goal-determining process useful?

### Phase 1 — MVP (Months 1–3)
Full application with goal discovery, task generation, check-in system, and adaptive feedback. Web-only. Anonymous sessions. No social features.

### Phase 2 — Post-MVP
- User accounts and persistent history
- Mobile-responsive polish / potential React Native app
- B2B admin panel and team features
- Human coaching integration (TBD)
- Community/accountability features (TBD)
- Neo4j integration for relationship-based goal pattern analysis
- ML-enhanced adaptive difficulty (replacing rules-based system)

---

## Active Task
Gathering feedback from testers on Prototype v0.1

## Completed (Phase 0.1 — Feb 22–23 2026)
- Session identity: UUID generated on first visit, stored in `localStorage` under `goalapp_session_id`, sent with every `/chat` request. Server is fully stateless.
- Conversation logging: full turn-by-turn logging to Supabase (`conversation_logs` table). Timestamps formatted as "Sun Feb 22 9:12:00 AM EST".
- Admin transcript viewer: `admin.html` — two-panel UI showing session list (left) and full conversation transcript (right), sourced from Supabase via `GET /admin/sessions` and `GET /admin/transcript/:sessionId`.
- User identity and name collection:
  - `prompts/welcome.txt` — source of truth for the welcome/intro message, loaded at server startup. Developer warning header stripped before serving. Server exits if file is missing.
  - `GET /welcome` endpoint — serves the welcome message to the UI (never hardcoded in HTML).
  - `POST /register-name` endpoint — accepts `{sessionId, rawInput}`, uses Claude Haiku to extract the name from natural language, calls Supabase RPC `increment_user_counter()` atomically to assign a sequential number, formats identifier as `Name####` (e.g. `Sarah0001`), stores in `users` table.
  - User identifier stored in `localStorage` under `goalapp_user_identifier` and passed to `/chat` on every request.
  - System prompt personalized with first name on each `/chat` call.
  - Returning users (identifier in localStorage) see "Welcome back" on reload and skip the name prompt.
- AI persona: assistant presents itself as "Stef" (per welcome text).
- App title changed from "Goal Discovery" to "Strategy Facilitator".
- Vercel deployment: `vercel.json` at project root with `@vercel/node` build, `includeFiles` for HTML and prompts, catch-all route. `server.js` exports app as default and guards `app.listen()` behind `!process.env.VERCEL`.
- Git repository initialized with `.gitignore` (excludes node_modules, .env, CLAUDE session backup files) and `prototype/.env.example`.
- `GET /admin/sessions` joins `users` table to display `user_identifier` in the session list instead of raw session UUID. `__START__` messages excluded from message counts.
- Timestamps pinned to `America/New_York` timezone via `Intl.DateTimeFormat` to prevent UTC display on Vercel servers.

## Completed (Phase 0.1 — Feb 24 2026)
- Auto-focus textarea: cursor automatically placed in text input after each AI response via `useRef` + `useEffect` on `loading` state in `index.html`.
- Token usage tracking: `input_tokens` and `output_tokens` columns added to `conversation_logs` table. Server stores Anthropic API usage data on every assistant row. `admin.html` transcript view displays token counts (e.g. `1842 in / 214 out`) alongside the timestamp beneath each assistant bubble.

## Completed (Phase 0.1 — Mar 1 2026)
- Responsive CSS / PWA viewport fixes applied to `prototype/index.html` (CSS only; no JS or HTML structure changed):
  - `viewport-fit=cover` added to meta viewport tag for iPhone notch/home indicator support.
  - `body` uses `height: 100dvh` (with `100vh` fallback) so layout fills the visual viewport, not the larger layout viewport that includes browser chrome.
  - `#messages` gains `min-height: 0` (prevents flex child from refusing to shrink when virtual keyboard appears) and `overscroll-behavior: contain` (stops iOS rubber-band scroll bleed-through).
  - `.message` max-width changed to `min(600px, 88vw)` for narrow phones.
  - `footer` has `flex-shrink: 0` and safe-area-aware padding via `max(Npx, env(safe-area-inset-*))` for iPhone home indicator clearance.
  - `textarea` font-size raised to `16px` (prevents iOS auto-zoom on focus); `min-height: 44px` added.
  - `button` gains `min-height: 44px` / `min-width: 44px` (Apple HIG tap target).
  - `@media (max-width: 480px)` rule reduces header padding and h1 font size on small phones.

## Supabase Tables in Use
- `conversation_logs` — all chat turns (session_id, role, content, timestamp_display, input_tokens, output_tokens)
- `users` — registered user identifiers (user_identifier, display_name, session_id)
- `user_id_counter` — single-row atomic counter; column is `next_value`
- RLS disabled on all three tables; anon role granted appropriate permissions

## Next Steps
- Continue gathering tester feedback
- Iterate on system prompt based on conversation quality

---

## Folder Structure (Actual)

```
Strategy Facilitator/
├── CLAUDE.md                  # Legacy project context (migrated to .amazonq/rules/)
├── .amazonq/
│   └── rules/                 # Amazon Q auto-loaded context files
├── /prototype                 # Phase 0 throwaway code
│   ├── server.js              # Express server, Claude API, Supabase logging
│   ├── index.html             # Single-page chat UI (React via CDN)
│   ├── admin.html             # Transcript viewer for developer review
│   ├── package.json
│   └── .env                   # API keys (gitignored)
├── /prompts                   # System prompt files
│   ├── system-prompt-v1.txt   # Goal discovery system prompt
│   └── welcome.txt            # Welcome/intro message (source of truth)
├── /notes                     # Research and design decisions (to be populated)
└── /app                       # Phase 1 MVP (not started)
```
