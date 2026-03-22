# My Success Story — Project Context

## What This Is
A voice-driven web app that guides users through a Socratic goal-discovery
conversation, then generates a personalised narrative ("My Success Story") and
action plan ("My Next Chapter"), delivered as a downloadable PDF.

Production URL: successstory.mareci.com  
Repo: waynemareci/mysuccessstory  
Stack: React + Vite, Node.js/Express, Vercel (serverless), Supabase, Anthropic API, OpenAI API (TTS)

---

## Folder Structure

```
repo root/
  vercel.json                  # Vercel build + routing config
  CLAUDE.md                    # This file — working context
  CLAUDE-history.md            # Archived history, vision, open questions
  prompts/                     # System prompt files (source of truth)
    system-prompt-vX.txt
    extraction-prompt.txt
    synthesis-prompt.txt
    next-chapter-prompt.txt
    welcome.txt
  prototype/
    server.js                  # Express server — all API routes
    index.html                 # Thin Vite shell (~15 lines)
    admin.html                 # Session transcript viewer
    sw.js                      # PWA service worker
    vite.config.js             # Vite build config (outputs to dist/)
    package.json               # All deps: server + Vite + React
    .env                       # API keys (gitignored)
    public/                    # Static assets (Vite copies to dist/)
      manifest.json
      icons/
    src/
      main.jsx                 # Vite entry point
      App.jsx                  # Main React component (~1,050 lines)
      styles.css               # All CSS (extracted from old index.html)
      components/
        DebugOverlay.jsx       # ?debug=true panel (fixed bottom-right)
        NarrativeCard.jsx      # Parchment "My Success Story" card
        NextChapterCard.jsx    # Parchment "My Next Chapter" + PDF button
        VoiceOverlay.jsx       # Mobile tap-to-start fullscreen screen
    dist/                      # Vite build output (gitignored)
```

---

## Core Pipeline

Conversation flow triggers server-side markers:

| Marker | Trigger | Effect |
|--------|---------|--------|
| `%%SYNTHESIS_READY%%` | Claude detects enough material | Runs extraction + synthesis pipeline |
| `%%STORY_CONFIRMED%%` | User confirms narrative | Sets `storyConfirmed`, runs Next Chapter pipeline |
| `%%CHAPTER_CONFIRMED%%` | User confirms chapter | Sets `chapterConfirmed`, unlocks PDF download |

Pipeline: full transcript → extraction JSON → narrative synthesis → Next Chapter plan.  
PDF served at `GET /getpdf/:sessionId`.

---

## Key Technical Decisions & Gotchas

**Vercel serverless — no shared memory**
All session state lives in Supabase, not in-process Maps. Any state that must
survive across invocations must be stored externally.

**`express.static(__dirname)` is unreliable on Vercel**
Use explicit `app.get('/file.html', res.sendFile(...))` routes for every file
that must be served. Files must also be listed in `vercel.json` `includeFiles`.

**Marker detection — two separate concerns**
"Strip marker from output" and "trigger pipeline once" must be handled
independently. Conflating them causes bugs.

**Narrative classification**
`classifyMsg(msg)` uses `msg.messageType` field (set server-side), not content
pattern matching. Server tags responses as `'synthesis'`, `'next-chapter'`, or
`'chat'`.

**Service worker cache-busting**
`npm run build` injects `Date.now()` timestamp into `sw.js` replacing
`__BUILD_TIMESTAMP__`. Must run before every Vercel deploy.

**Voice — desktop vs mobile**
`voiceStarted` initialises to `!isMobile`. Desktop skips the tap-to-start
overlay. `desktopUnlocked` tracks whether the first mic click has fired (needed
to satisfy Chrome autoplay policy on desktop).

**Git commands — Windows**
Run `git add .` from repo root, not from `prototype/`. Pipe operators fail in
Windows — use separate commands.

**Claude Code prompts**
Use single-change prompts with explicit verification steps. Large multi-change
prompts have caused Claude Code to report changes without executing them.

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `conversation_logs` | All chat turns (session_id, role, content, timestamps, token counts) |
| `users` | Registered user identifiers (user_identifier, display_name, session_id, extraction_json) |
| `user_id_counter` | Single-row atomic counter (`next_value`) |

RLS disabled on all three tables; anon role granted appropriate permissions.

---

## Environment Variables

| Variable | Used by |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API (chat, extraction, synthesis, next chapter) |
| `OPENAI_API_KEY` | OpenAI TTS (`/api/tts` endpoint) |
| `SUPABASE_URL` | Supabase client |
| `SUPABASE_ANON_KEY` | Supabase client |

---

## Active Refactoring — Component Extraction from App.jsx

Extracting React components one at a time. Each extraction: one Claude Code
prompt → verify → commit.

Remaining candidates (in order):

| # | Component | Status |
|---|-----------|--------|
| 1 | `DebugOverlay` | ✅ Done |
| 2 | `NarrativeCard` | ✅ Done |
| 3 | `NextChapterCard` | ✅ Done |
| 4 | `VoiceOverlay` | ✅ Done |
| 5 | `StatusBar` | Pending |
| 6 | `TestModeBar` | Pending |
| 7 | `ChatMessage` | Pending |
| 8 | `InputBar` | Pending — most complex, touches most state |

---

## Changelog

<!-- newest first — one Claude Code prompt per entry -->

### 2026-03-22
- Restructured CLAUDE.md — split into CLAUDE.md (working context) and CLAUDE-history.md (archive)
- Extracted InputBar component into `src/components/InputBar.jsx`
- Extracted ChatMessage component into `src/components/ChatMessage.jsx`
- Extracted StatusBar component into `src/components/StatusBar.jsx`
- Extracted TestModeBar component into `src/components/TestModeBar.jsx`
- Fixed: VoiceOverlay extraction had dropped `startReceiveMode()` call from `initializeSession()`; restored
- Extracted VoiceOverlay component into `src/components/VoiceOverlay.jsx`
- Extracted NextChapterCard component into `src/components/NextChapterCard.jsx`
- Extracted NarrativeCard component into `src/components/NarrativeCard.jsx`
- Extracted DebugOverlay component into `src/components/DebugOverlay.jsx`
- Migrated from CDN React/Babel to Vite build; `index.html` is now a thin shell
- Added explicit `app.get('/admin.html')` route to `server.js` (was relying on `express.static` which is unreliable on Vercel)
- Moved project to new repo: waynemareci/mysuccessstory
- Added Test Chapter Adjustment fixture (`FIXTURE_MESSAGES_CHAPTER`, `injectFixtureChapter`)
- Server-side message type tagging — replaced fragile content-based `classifyMsg()` with explicit `messageType` field from `/chat` endpoint
