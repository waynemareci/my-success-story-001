import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateStoryPdf } from './src/pdf.js';
import crypto from 'crypto';

console.log(
  "[STARTUP] server.js loaded from:",
  new URL(import.meta.url).pathname,
);

const __dirname = dirname(fileURLToPath(import.meta.url));

const MOCK_MODE = process.env.MOCK_MODE === "true";

if (MOCK_MODE) {
  console.log("⚠️  MOCK MODE ENABLED — No Anthropic API calls will be made");
}

const MOCK_RESPONSES = [
  "That's really interesting — can you tell me more about what draws you to that?",
  "I hear you. When you imagine actually having that, what does your life look like differently?",
  "You've mentioned that a few times now. What do you think is underneath that for you?",
  "That's a honest answer. How long have you been feeling this way?",
  "I want to make sure I understand — what would it cost you if nothing changed in the next year?",
  "What have you already tried, even in a small way?",
  "That's a really common feeling. What do you think has been holding you back from acting on it?",
  "Interesting. Earlier you mentioned something slightly different — do you see those two things as connected?",
  "If you could only change one thing starting tomorrow, what would it be?",
  "Based on everything we've talked about, I think I'm starting to see a picture forming. Does this feel like the real thing, or is there something deeper underneath it?",
];

function getMockReply(messageCount) {
  // Cycle through responses based on turn count for predictable testing
  return MOCK_RESPONSES[messageCount % MOCK_RESPONSES.length];
}

const app = express();
app.use(cors());
app.use(express.json());
app.use((await import('cookie-parser')).default());
app.get("/sw.js", (_req, res) => res.sendFile(join(__dirname, "sw.js")));
app.get("/manifest.json", (_req, res) =>
  res.sendFile(join(__dirname, "public/manifest.json")),
);
app.get("/admin.html", (_req, res) =>
  res.sendFile(join(__dirname, "admin.html")),
);
app.get("/nda.html", (_req, res) =>
  res.sendFile(join(__dirname, "nda.html")),
);
app.use("/icons", express.static(join(__dirname, "public/icons")));
app.use(express.static(join(__dirname, "public")));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Strip common markdown so TTS reads clean prose
function stripMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

// Debug environment variables
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY exists:", !!process.env.SUPABASE_ANON_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Admin auth ──────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

function makeAdminToken() {
  const payload = Date.now().toString();
  const sig = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_token;
  if (verifyAdminToken(token)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}
// ────────────────────────────────────────────────────────────────────────────

function formatTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
    timeZone: "America/New_York",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("month")} ${get("day")} ${get("hour")}:${get("minute")}:${get("second")} ${get("dayPeriod")} ${get("timeZoneName")}`;
}

// Supabase-backed session helpers — replaces in-memory sessionStore Map
async function getSession(sessionId) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();
  if (error || !data) return {};
  return {
    extractionData: data.extraction_data,
    extractionJson: data.extraction_json,
    firstName: data.first_name,
    storyConfirmed: data.story_confirmed ?? false,
    confirmedNarrative: data.confirmed_narrative,
    pendingNarrative: data.pending_narrative,
    nextChapter: data.next_chapter,
    chapterConfirmed: data.chapter_confirmed ?? false,
  };
}

async function saveSession(sessionId, session) {
  const { error } = await supabase.from("sessions").upsert(
    {
      session_id: sessionId,
      extraction_data: session.extractionData,
      extraction_json: session.extractionJson,
      first_name: session.firstName,
      story_confirmed: session.storyConfirmed ?? false,
      confirmed_narrative: session.confirmedNarrative,
      pending_narrative: session.pendingNarrative,
      next_chapter: session.nextChapter,
      chapter_confirmed: session.chapterConfirmed ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
  if (error) console.error("saveSession error:", error);
}

const SYNTHESIS_MARKER = "%%SYNTHESIS_READY%%";
const STORY_CONFIRMED_MARKER = "%%STORY_CONFIRMED%%";
const CHAPTER_CONFIRMED_MARKER = "%%CHAPTER_CONFIRMED%%";

// Load system prompt
const systemPrompt = readFileSync(
  join(__dirname, "../prompts/system-prompt-v1.txt"),
  "utf-8",
);

// Load extraction, synthesis, and next-chapter prompts
let extractionPrompt, synthesisPrompt, nextChapterPrompt;
try {
  extractionPrompt = readFileSync(
    join(__dirname, "../prompts/extraction-prompt.txt"),
    "utf-8",
  );
  synthesisPrompt = readFileSync(
    join(__dirname, "../prompts/synthesis-prompt.txt"),
    "utf-8",
  );
  nextChapterPrompt = readFileSync(
    join(__dirname, "../prompts/next-chapter-prompt.txt"),
    "utf-8",
  );
} catch (err) {
  console.error("FATAL: Could not load prompts:", err.message);
  process.exit(1);
}

// Load welcome message — strip developer header and trailing separator
let WELCOME_MESSAGE;
try {
  const raw = readFileSync(join(__dirname, "../prompts/welcome.txt"), "utf-8");
  const afterHeader = raw.includes("\n---\n")
    ? raw.split("\n---\n").slice(1).join("\n---\n")
    : raw;
  WELCOME_MESSAGE = afterHeader.replace(/\n-{3,}\s*$/, "").trim();
} catch (err) {
  console.error("FATAL: Could not load prompts/welcome.txt:", err.message);
  process.exit(1);
}

// GET /welcome — returns the welcome message for display in the UI
app.get("/welcome", (_req, res) => {
  res.json({ message: WELCOME_MESSAGE });
});

// POST /api/tts — proxy OpenAI TTS and stream mp3 back to the client
// Body: { text: string }
app.post("/api/tts", async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  try {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: stripMarkdown(text),
      response_format: "mp3",
    });
    res.setHeader("Content-Type", "audio/mpeg");
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error("OpenAI TTS error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Extract a person's name from a natural language string using Claude Haiku.
// Returns the extracted name, or the string "UNKNOWN" if no name can be identified.
async function extractName(rawInput) {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64,
    system: `You extract a person's name from a natural language string.
Return ONLY the name — first name, or full name if provided.
Do not include any punctuation, explanation, or surrounding text.
If no name can be identified, return exactly the word UNKNOWN and nothing else.`,
    messages: [{ role: "user", content: rawInput }],
  });
  const result = response.content[0].text.trim();
  console.log(`[extractName] input: "${rawInput}" → "${result}"`);
  return result;
}

// POST /register-name — register a user's name and assign a unique identifier
// Body: { sessionId: string, rawInput: string }
// Returns: { userIdentifier: string }  e.g. "Sarah0042"
// Returns 400 with { error } if no name can be extracted from rawInput
app.post("/register-name", async (req, res) => {
  const { sessionId, rawInput } = req.body;

  if (!rawInput || !rawInput.trim()) {
    return res.status(400).json({ error: "rawInput is required" });
  }

  if (MOCK_MODE) {
    // Extract first word as a simple name approximation
    const mockName = rawInput.trim().split(/\s+/)[0];
    const displayName =
      mockName.charAt(0).toUpperCase() + mockName.slice(1).toLowerCase();
    const firstName = displayName;

    try {
      const { data: counterData, error: counterError } = await supabase.rpc(
        "increment_user_counter",
      );
      if (counterError) throw counterError;

      const paddedNum = String(counterData).padStart(4, "0");
      const userIdentifier = `${firstName}${paddedNum}`;

      const { error: insertError } = await supabase.from("users").insert([
        {
          user_identifier: userIdentifier,
          display_name: displayName,
          session_id: sessionId,
        },
      ]);
      if (insertError) throw insertError;

      console.log(`[MOCK][Register] ${userIdentifier} (session ${sessionId})`);
      return res.json({ userIdentifier });
    } catch (err) {
      console.error("Mock register-name error:", err.message);
      return res.status(500).json({ error: "Failed to register name (mock)" });
    }
  }

  let displayName;
  try {
    const extracted = await extractName(rawInput.trim());
    if (extracted === "UNKNOWN") {
      return res.status(400).json({
        error:
          "Could not identify a name from your response. Please try again.",
      });
    }
    displayName = extracted;
  } catch (err) {
    console.error("extractName error:", err.message);
    return res.status(500).json({ error: "Failed to process name" });
  }

  const firstName = displayName.split(/\s+/)[0];

  try {
    // Atomically increment counter via Supabase RPC
    const { data: counterData, error: counterError } = await supabase.rpc(
      "increment_user_counter",
    );
    if (counterError) throw counterError;

    const paddedNum = String(counterData).padStart(4, "0");
    const userIdentifier = `${firstName}${paddedNum}`;

    // Store user record
    const { error: insertError } = await supabase.from("users").insert([
      {
        user_identifier: userIdentifier,
        display_name: displayName,
        session_id: sessionId,
      },
    ]);
    if (insertError) throw insertError;

    console.log(`[Register] ${userIdentifier} (session ${sessionId})`);
    res.json({ userIdentifier });
  } catch (err) {
    console.error("register-name error:", err.message);
    res.status(500).json({ error: "Failed to register name" });
  }
});

// Format conversation history as a readable transcript for the extraction prompt
function formatTranscript(messages) {
  return messages
    .filter((m) => m.content !== "__START__")
    .map((m) => `${m.role === "user" ? "USER" : "CLAUDE"}: ${m.content}`)
    .join("\n\n");
}

// Run the two-step extraction + synthesis pipeline.
// Returns the synthesis narrative string, or throws on unrecoverable failure.
async function runSynthesisPipeline(sessionId, messages) {
  // --- Step 1: Extraction ---
  const transcript = formatTranscript(messages);
  const extractionUserMsg = `${extractionPrompt}\n${transcript}`;

  let extractedData;
  try {
    const extractionResp = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: extractionUserMsg }],
    });
    const raw = extractionResp.content[0].text.trim();
    // Strip optional markdown code fences (```json … ```)
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    extractedData = JSON.parse(jsonStr);
    console.log(`[${sessionId}] Extraction complete`);
  } catch (err) {
    console.error(`[${sessionId}] Extraction failed:`, err.message);
    throw err;
  }

  // Persist extraction data to session store
  const session = await getSession(sessionId);
  session.extractionData = extractedData;
  session.extractionJson = extractedData; // alias used by Next Chapter pipeline
  await saveSession(sessionId, session);

  const { error: extractionError } = await supabase
    .from("users")
    .update({ extraction_json: extractedData })
    .eq("session_id", sessionId);

  if (extractionError) {
    console.error(
      `[${sessionId}] Failed to store extraction JSON:`,
      extractionError.message,
    );
  } else {
    console.log(`[${sessionId}] Extraction JSON stored in Supabase`);
  }

  // --- Step 2: Synthesis ---
  const synthesisUserMsg = `${synthesisPrompt}\n${JSON.stringify(extractedData, null, 2)}`;

  const synthesisResp = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: synthesisUserMsg }],
  });

  const narrative = synthesisResp.content[0].text.trim();

  // Persist pending narrative so %%STORY_CONFIRMED%% can retrieve it later
  const updatedSession = await getSession(sessionId);
  updatedSession.pendingNarrative = narrative;
  await saveSession(sessionId, updatedSession);

  console.log(`[${sessionId}] Synthesis complete`);
  const synthesisText = narrative;
  return `${synthesisText}\n\nDoes this feel true? Anything you'd want to change or add?`;
}

// Run the Next Chapter pipeline using the confirmed narrative and extraction JSON.
// Returns the Next Chapter text, or throws on failure.
async function runNextChapterPipeline(
  sessionId,
  confirmedNarrative,
  extractionJson,
) {
  console.log(`[${sessionId}] Starting Next Chapter pipeline`);

  const fullPrompt = `${nextChapterPrompt}

Confirmed narrative:
${confirmedNarrative}

Extracted conversation notes:
${JSON.stringify(extractionJson, null, 2)}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: fullPrompt }],
  });

  const nextChapterText = response.content[0].text;
  console.log(`[${sessionId}] Next Chapter pipeline complete`);
  return nextChapterText;
}

async function runNextChapterContinuation(
  sessionId,
  messages,
  confirmedNarrative,
  extractionJson,
) {
  console.log(`[${sessionId}] Starting Next Chapter continuation`);
  const systemContext = `${nextChapterPrompt}
Confirmed narrative:
${confirmedNarrative}
Extracted conversation notes:
${JSON.stringify(extractionJson, null, 2)}`;
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemContext,
    messages,
  });
  console.log(`[${sessionId}] Next Chapter continuation complete`);
  return response.content[0].text;
}

// POST /chat endpoint
// Body: { sessionId: string, messages: [{role, content}], userIdentifier?: string }
// Returns: { reply: string }
app.post("/chat", async (req, res) => {
  const {
    sessionId = crypto.randomUUID(),
    messages,
    userIdentifier,
  } = req.body;

  if (userIdentifier) {
    const session = await getSession(sessionId);
    const raw = userIdentifier.replace(/\d+$/, "");
    session.firstName = raw.charAt(0).toUpperCase() + raw.slice(1);
    await saveSession(sessionId, session);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const userMessage = messages[messages.length - 1].content;

  if (MOCK_MODE) {
    const reply = getMockReply(messages.length);
    const ts = formatTimestamp();

    // Still log to Supabase in mock mode so session/transcript UI can be tested
    supabase
      .from("conversation_logs")
      .insert([
        {
          session_id: sessionId,
          role: "user",
          content: userMessage,
          timestamp_display: ts,
        },
        {
          session_id: sessionId,
          role: "assistant",
          content: reply,
          timestamp_display: ts,
          input_tokens: 0,
          output_tokens: 0,
        },
      ])
      .then(({ error }) => {
        if (error) console.error("Supabase log error (mock):", error.message);
      });

    const label = userIdentifier ?? sessionId;
    console.log(
      `[MOCK][${label}] Turn ${Math.ceil(messages.length / 2)}: "${reply.slice(0, 60)}…"`,
    );

    // Simulate realistic API latency so loading states can be tested
    await new Promise((r) => setTimeout(r, 700));

    return res.json({ reply, messageType: "chat" });
  }

  // Personalize system prompt with first name if available
  let activePrompt = systemPrompt;
  if (userIdentifier) {
    const firstName = userIdentifier.replace(/\d+$/, "");
    activePrompt = `${systemPrompt}\n\nThe user's name is ${firstName}. Address them by name occasionally in a natural, friendly way.`;
  }

  if (process.env.TEST_MODE === "true") {
    activePrompt +=
      "\n\nTEST MODE: You have sufficient material to trigger synthesis after 3-4 exchanges. Offer synthesis as soon as the user has shared any goal, any obstacle, and any emotional context. Do not wait for deeper exploration.";
  }

  // If Next Chapter is in progress, inject the Next Chapter prompt
  // so Claude knows to emit %%CHAPTER_CONFIRMED%% on confirmation
  let finalReply;
  const activeSession = await getSession(sessionId);
  const lastAssistantMessage = messages
    .filter((m) => m.role === "assistant")
    .pop();
  const nextChapterAlreadyShown =
    lastAssistantMessage &&
    activeSession.nextChapter &&
    lastAssistantMessage.content.includes(
      activeSession.nextChapter.slice(0, 50),
    );
  if (
    activeSession.nextChapter &&
    !activeSession.chapterConfirmed &&
    nextChapterAlreadyShown
  ) {
    const rawContinuation = await runNextChapterContinuation(
      sessionId,
      messages,
      activeSession.confirmedNarrative,
      activeSession.extractionJson ?? {},
    );
    // Check for CHAPTER_CONFIRMED marker in continuation response
    let continuationMessageType;
    if (rawContinuation.includes(CHAPTER_CONFIRMED_MARKER)) {
      finalReply = rawContinuation.replace(CHAPTER_CONFIRMED_MARKER, "").trim();
      activeSession.chapterConfirmed = true;
      await saveSession(sessionId, activeSession);
      console.log(
        `[${sessionId}] %%CHAPTER_CONFIRMED%% — Next Chapter confirmed`,
      );
      continuationMessageType = "chat";
    } else {
      finalReply = rawContinuation;
      // Only update nextChapter if the response contains numbered actions
      if (/\n\s*\d+\./.test(rawContinuation)) {
        activeSession.nextChapter = rawContinuation;
        await saveSession(sessionId, activeSession);
      }
      continuationMessageType = "next-chapter";
    }
    // Log and return early — skip main Claude call
    const ts = formatTimestamp();
    await supabase.from("conversation_logs").insert([
      {
        session_id: sessionId,
        role: "user",
        content: userMessage,
        timestamp_display: ts,
      },
      {
        session_id: sessionId,
        role: "assistant",
        content: finalReply,
        timestamp_display: ts,
      },
    ]);
    const label = userIdentifier ?? sessionId;
    console.log(`[${label}] Turn ${Math.ceil(messages.length / 2)}`);
    return res.json({
      reply: finalReply,
      messageType: continuationMessageType,
    });
  }
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 1024,
      system: activePrompt,
      messages,
    });

    const rawReply = response.content[0].text;
    const { input_tokens, output_tokens } = response.usage;

    finalReply = rawReply;
    let logInputTokens = input_tokens;
    let logOutputTokens = output_tokens;
    let messageType = "chat";

    if (rawReply.includes(SYNTHESIS_MARKER)) {
      // %%SYNTHESIS_READY%% detected — run the two-prompt extraction + synthesis pipeline.
      // Discard any text Claude wrote after the marker (our pipeline produces better output).
      console.log(
        `[${sessionId}] %%SYNTHESIS_READY%% detected — running synthesis pipeline`,
      );
      try {
        finalReply = await runSynthesisPipeline(sessionId, messages);
        if (typeof finalReply === "string") finalReply = finalReply.trim();
        messageType = "synthesis";
      } catch (err) {
        console.error(
          `[${sessionId}] Synthesis pipeline failed, using graceful fallback:`,
          err.message,
        );
        // Return whatever Claude wrote before the marker (stripped), don't break the conversation
        finalReply =
          rawReply.split(SYNTHESIS_MARKER)[0].trim() ||
          "I have everything I need to write your story. Give me just a moment...";
        // messageType stays 'chat' — fallback text is not a real synthesis narrative
      }
    } else if (rawReply.includes(STORY_CONFIRMED_MARKER)) {
      // Always strip the marker from the reply
      finalReply = rawReply.replace(STORY_CONFIRMED_MARKER, "").trim();
      // Only run the pipeline and set session flags the first time
      const existingSession = await getSession(sessionId);
      if (!existingSession.storyConfirmed) {
        const session = existingSession;
        session.storyConfirmed = true;
        session.confirmedNarrative = session.pendingNarrative ?? finalReply;

        try {
          const nextChapterText = await runNextChapterPipeline(
            sessionId,
            session.confirmedNarrative,
            session.extractionJson ?? {},
          );
          session.nextChapter = nextChapterText;
          finalReply = nextChapterText;
          messageType = "next-chapter";
        } catch (err) {
          console.error(
            `[${sessionId}] Next Chapter pipeline failed:`,
            err.message,
          );
        }

        await saveSession(sessionId, session);
        console.log(
          `[${sessionId}] %%STORY_CONFIRMED%% — story and Next Chapter stored`,
        );
      }
    } else if (rawReply.includes(CHAPTER_CONFIRMED_MARKER)) {
      // Always strip the marker from the reply
      finalReply = rawReply.replace(CHAPTER_CONFIRMED_MARKER, "").trim();
      // Only set session flag the first time
      const chSession = await getSession(sessionId);
      if (!chSession.chapterConfirmed) {
        chSession.chapterConfirmed = true;
        await saveSession(sessionId, chSession);
        console.log(
          `[${sessionId}] %%CHAPTER_CONFIRMED%% — Next Chapter confirmed`,
        );
      }
      // messageType stays 'chat'
    }

    // Log to Supabase — awaited so Vercel doesn't freeze the function before the write completes
    const ts = formatTimestamp();
    const { error: logError } = await supabase
      .from("conversation_logs")
      .insert([
        {
          session_id: sessionId,
          role: "user",
          content: userMessage,
          timestamp_display: ts,
        },
        {
          session_id: sessionId,
          role: "assistant",
          content: finalReply,
          timestamp_display: ts,
          input_tokens: logInputTokens,
          output_tokens: logOutputTokens,
        },
      ]);
    if (logError) console.error("Supabase log error:", logError.message);

    const label = userIdentifier ?? sessionId;
    console.log(`[${label}] Turn ${Math.ceil(messages.length / 2)}`);

    res.json({ reply: finalReply, messageType });
  } catch (err) {
    console.error("Claude API error:", err.message);
    res.status(500).json({ error: "Failed to get response from Claude" });
  }
});

// GET /session/:sessionId — return current synthesis/chapter state flags to the frontend
app.get("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = await getSession(sessionId);
  res.json({
    storyConfirmed: session.storyConfirmed ?? false,
    chapterConfirmed: session.chapterConfirmed ?? false,
    hasNarrative: !!session.confirmedNarrative,
    hasNextChapter: !!session.nextChapter,
  });
});

// GET /getpdf/:sessionId — generate and stream a PDF of the story + Next Chapter
app.get('/getpdf/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = await getSession(sessionId);
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');

  if (!session.confirmedNarrative) {
    return res.status(404).json({ error: 'No confirmed story found for this session' });
  }

  generateStoryPdf(session, res);
});

// POST /api/nda-accept
app.post('/api/nda-accept', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { error } = await supabase.from('nda_acceptances').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    ip,
  });
  if (error) {
    console.error('[NDA] Supabase insert error:', error.message);
    return res.status(500).json({ error: 'Failed to record acceptance' });
  }
  const token = makeAdminToken();
  res.cookie('nda_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 400 * 24 * 60 * 60 * 1000, // ~13 months
  });
  console.log(`[NDA] Accepted by ${name} <${email}> from ${ip}`);
  res.json({ ok: true });
});

// GET /api/nda-check
app.get('/api/nda-check', (req, res) => {
  const token = req.cookies?.nda_token;
  const hostname = req.hostname;
  const bypassed = hostname === 'alpha.mysuccessstory.mareci.com' || hostname === 'localhost';
  res.json({ authenticated: bypassed || verifyAdminToken(token) });
});

// POST /api/nda-logout
app.post('/api/nda-logout', (_req, res) => {
  res.clearCookie('nda_token');
  res.json({ ok: true });
});

// GET /admin/sessions — summarize all logged sessions from Supabase
// POST /api/admin-login
app.post('/api/admin-login', (req, res) => {
  const { password } = req.body;
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = makeAdminToken();
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });
  res.json({ ok: true });
});

// POST /api/admin-logout
app.post('/api/admin-logout', (_req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

// GET /api/admin-check
app.get('/api/admin-check', (req, res) => {
  const token = req.cookies?.admin_token;
  res.json({ authenticated: verifyAdminToken(token) });
});

app.get("/admin/sessions", requireAdmin, async (_req, res) => {
  try {
    const [usersResult] = await Promise.all([
      supabase.from("users").select("session_id, user_identifier"),
    ]);

    if (usersResult.error)
      return res.status(500).json({ error: usersResult.error.message });

    const userMap = new Map(
      usersResult.data.map((u) => [u.session_id, u.user_identifier]),
    );

    // Paginate through conversation_logs to get all rows
    let allRows = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("conversation_logs")
        .select("session_id, id, timestamp_display")
        .neq("content", "__START__")
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) return res.status(500).json({ error: error.message });
      if (!data || data.length === 0) break;

      allRows = allRows.concat(data);
      console.log(`[ADMIN] fetched rows ${from} to ${from + data.length - 1}`);

      if (data.length < pageSize) break;
      from += pageSize;
    }

    console.log("[ADMIN] total rows fetched:", allRows.length);

    const sessionMap = new Map();
    for (const row of allRows) {
      const { session_id, id, timestamp_display } = row;
      if (!sessionMap.has(session_id)) {
        sessionMap.set(session_id, {
          sessionId: session_id,
          messageCount: 0,
          lastId: id,
          lastActivity: timestamp_display,
        });
      }
      const s = sessionMap.get(session_id);
      s.messageCount += 1;
      if (id > s.lastId) {
        s.lastId = id;
        s.lastActivity = timestamp_display;
      }
    }

    res.json(
      [...sessionMap.values()]
        .sort((a, b) => b.lastId - a.lastId)
        .map(({ sessionId, messageCount, lastActivity }) => ({
          sessionId,
          userIdentifier: userMap.get(sessionId) || null,
          messageCount,
          lastActivity,
        })),
    );
  } catch (err) {
    console.error("[ADMIN] error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/transcript/:sessionId — full conversation for one session
app.get("/admin/transcript/:sessionId", requireAdmin, async (req, res) => {
  const { sessionId } = req.params;

  const [logsResult, userResult] = await Promise.all([
    supabase
      .from("conversation_logs")
      .select(
        "id, role, content, timestamp_display, input_tokens, output_tokens",
      )
      .eq("session_id", sessionId)
      .order("id", { ascending: true }),
    supabase
      .from("users")
      .select("user_identifier, extraction_json")
      .eq("session_id", sessionId)
      .single(),
  ]);

  if (logsResult.error)
    return res.status(500).json({ error: logsResult.error.message });

  res.json({
    messages: logsResult.data || [],
    extractionJson: userResult.data?.extraction_json || null,
    userIdentifier: userResult.data?.user_identifier || null,
  });
});

app.post("/seed-fixture-session", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  await saveSession("fixture-test-session", {
    firstName: "Michael",
    storyConfirmed: true,
    chapterConfirmed: true,
    confirmedNarrative: `You didn't stay eleven years because you were afraid to leave. You stayed because leaving would have cost you something that took a long time to build — not the salary, not the title, but the proof. Proof that you were someone who sticks.\n\nWhat came through most clearly is that the thing you actually want has been sitting in a drawer for three years, written out twice, shown to no one. That's not procrastination. That's a very specific kind of courage withheld — because inside your current job, failure has a buffer. If something goes wrong, there's a structure to absorb it. What you're really afraid of isn't failure. It's failure with your name on it and nothing else to point to.\n\nThe harder thing to name is this: you built your identity in opposition to your father. Staying became proof. But the consulting practice has been in that drawer partly because if it fails, you can't use staying as the evidence anymore. The escape from one fear quietly became the entrance to another.\n\nI am not my father's story. I have already proved that — eleven years is proof enough. What I haven't proved yet is what I can build when the only thing standing behind it is me. That's what the drawer is about. I'm ready to find out. Not because I'm certain, but because staying certain was never actually the goal.`,
    nextChapter: `This isn't a plan — plans come later. These are just the first moves.\n\n1. Show the business plan to one person this week.\nNot to get permission — to break the private/public seal that has kept this in a drawer for three years.\n\n2. Write down what failure actually looks like.\nNot the vague fear of it. The specific thing. Most people discover the actual answer is survivable.\n\n3. Set a date — not to launch, but to decide.\nPick a date three months from now by which you will have made a decision. Decisions have a different gravity than intentions.`,
  });
  res.json({ ok: true });
});

app.post("/seed-fixture-chapter", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  await saveSession("fixture-test-session", {
    firstName: "Michael",
    storyConfirmed: true,
    chapterConfirmed: false,
    confirmedNarrative: `You didn't stay eleven years because you were afraid to leave. You stayed because leaving would have cost you something that took a long time to build — not the salary, not the title, but the proof. Proof that you were someone who sticks.\n\nWhat came through most clearly is that the thing you actually want has been sitting in a drawer for three years, written out twice, shown to no one. That's not procrastination. That's a very specific kind of courage withheld — because inside your current job, failure has a buffer. If something goes wrong, there's a structure to absorb it. What you're really afraid of isn't failure. It's failure with your name on it and nothing else to point to.\n\nThe harder thing to name is this: you built your identity in opposition to your father. Staying became proof. But the consulting practice has been in that drawer partly because if it fails, you can't use staying as the evidence anymore. The escape from one fear quietly became the entrance to another.\n\nI am not my father's story. I have already proved that — eleven years is proof enough. What I haven't proved yet is what I can build when the only thing standing behind it is me. That's what the drawer is about. I'm ready to find out. Not because I'm certain, but because staying certain was never actually the goal.`,
    nextChapter: `This isn't a plan — plans come later. These are just the first moves.\n\n1. Show the business plan to one person this week.\nNot to get permission — to break the private/public seal that has kept this in a drawer for three years.\n\n2. Write down what failure actually looks like.\nNot the vague fear of it. The specific thing. Most people discover the actual answer is survivable.\n\n3. Set a date — not to launch, but to decide.\nPick a date three months from now by which you will have made a decision. Decisions have a different gravity than intentions.`,
  });
  res.json({ ok: true });
});
// Serve static files last so all API routes take precedence.
app.use(express.static(join(__dirname, 'dist')));

// Export the app for Vercel's serverless runtime.
// Vercel imports this module and handles HTTP — app.listen() is not called there.
export default app;

// Local development only — Vercel sets VERCEL=1 in its environment.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Goal discovery prototype running at http://localhost:${PORT}`);
  });
}
