import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MOCK_MODE = process.env.MOCK_MODE === 'true';

if (MOCK_MODE) {
  console.log('⚠️  MOCK MODE ENABLED — No Anthropic API calls will be made');
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
app.get('/sw.js', (_req, res) => res.sendFile(join(__dirname, 'sw.js')));
app.get('/manifest.json', (_req, res) => 
  res.sendFile(join(__dirname, 'public/manifest.json')));

app.use('/icons', express.static(join(__dirname, 'public/icons')));
app.use(express.static(join(__dirname, 'public')));
app.use(express.static(__dirname));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Strip common markdown so TTS reads clean prose
function stripMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// Debug environment variables
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function formatTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true, timeZoneName: 'short',
    timeZone: 'America/New_York',
  }).formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('weekday')} ${get('month')} ${get('day')} ${get('hour')}:${get('minute')}:${get('second')} ${get('dayPeriod')} ${get('timeZoneName')}`;
}

// Load system prompt
const systemPrompt = readFileSync(
  join(__dirname, '../prompts/system-prompt-v1.txt'),
  'utf-8'
);

// Load welcome message — strip developer header and trailing separator
let WELCOME_MESSAGE;
try {
  const raw = readFileSync(join(__dirname, '../prompts/welcome.txt'), 'utf-8');
  const afterHeader = raw.includes('\n---\n') ? raw.split('\n---\n').slice(1).join('\n---\n') : raw;
  WELCOME_MESSAGE = afterHeader.replace(/\n-{3,}\s*$/, '').trim();
} catch (err) {
  console.error('FATAL: Could not load prompts/welcome.txt:', err.message);
  process.exit(1);
}

// GET /welcome — returns the welcome message for display in the UI
app.get('/welcome', (_req, res) => {
  res.json({ message: WELCOME_MESSAGE });
});

// POST /api/tts — proxy OpenAI TTS and stream mp3 back to the client
// Body: { text: string }
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: stripMarkdown(text),
      response_format: 'mp3',
    });
    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('OpenAI TTS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Extract a person's name from a natural language string using Claude Haiku.
// Returns the extracted name, or the string "UNKNOWN" if no name can be identified.
async function extractName(rawInput) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    system: `You extract a person's name from a natural language string.
Return ONLY the name — first name, or full name if provided.
Do not include any punctuation, explanation, or surrounding text.
If no name can be identified, return exactly the word UNKNOWN and nothing else.`,
    messages: [{ role: 'user', content: rawInput }],
  });
  const result = response.content[0].text.trim();
  console.log(`[extractName] input: "${rawInput}" → "${result}"`);
  return result;
}

// POST /register-name — register a user's name and assign a unique identifier
// Body: { sessionId: string, rawInput: string }
// Returns: { userIdentifier: string }  e.g. "Sarah0042"
// Returns 400 with { error } if no name can be extracted from rawInput
app.post('/register-name', async (req, res) => {
  const { sessionId, rawInput } = req.body;

  if (!rawInput || !rawInput.trim()) {
    return res.status(400).json({ error: 'rawInput is required' });
  }

  if (MOCK_MODE) {
    // Extract first word as a simple name approximation
    const mockName = rawInput.trim().split(/\s+/)[0];
    const displayName = mockName.charAt(0).toUpperCase() + mockName.slice(1).toLowerCase();
    const firstName = displayName;

    try {
      const { data: counterData, error: counterError } = await supabase.rpc('increment_user_counter');
      if (counterError) throw counterError;

      const paddedNum = String(counterData).padStart(4, '0');
      const userIdentifier = `${firstName}${paddedNum}`;

      const { error: insertError } = await supabase.from('users').insert([{
        user_identifier: userIdentifier,
        display_name: displayName,
        session_id: sessionId,
      }]);
      if (insertError) throw insertError;

      console.log(`[MOCK][Register] ${userIdentifier} (session ${sessionId})`);
      return res.json({ userIdentifier });
    } catch (err) {
      console.error('Mock register-name error:', err.message);
      return res.status(500).json({ error: 'Failed to register name (mock)' });
    }
  }

  let displayName;
  try {
    const extracted = await extractName(rawInput.trim());
    if (extracted === 'UNKNOWN') {
      return res.status(400).json({
        error: "Could not identify a name from your response. Please try again.",
      });
    }
    displayName = extracted;
  } catch (err) {
    console.error('extractName error:', err.message);
    return res.status(500).json({ error: 'Failed to process name' });
  }

  const firstName = displayName.split(/\s+/)[0];

  try {
    // Atomically increment counter via Supabase RPC
    const { data: counterData, error: counterError } = await supabase.rpc('increment_user_counter');
    if (counterError) throw counterError;

    const paddedNum = String(counterData).padStart(4, '0');
    const userIdentifier = `${firstName}${paddedNum}`;

    // Store user record
    const { error: insertError } = await supabase.from('users').insert([{
      user_identifier: userIdentifier,
      display_name: displayName,
      session_id: sessionId,
    }]);
    if (insertError) throw insertError;

    console.log(`[Register] ${userIdentifier} (session ${sessionId})`);
    res.json({ userIdentifier });
  } catch (err) {
    console.error('register-name error:', err.message);
    res.status(500).json({ error: 'Failed to register name' });
  }
});

// POST /chat endpoint
// Body: { sessionId: string, messages: [{role, content}], userIdentifier?: string }
// Returns: { reply: string }
app.post('/chat', async (req, res) => {
  const { sessionId = crypto.randomUUID(), messages, userIdentifier } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const userMessage = messages[messages.length - 1].content;

  if (MOCK_MODE) {
    const reply = getMockReply(messages.length);
    const ts = formatTimestamp();

    // Still log to Supabase in mock mode so session/transcript UI can be tested
    supabase.from('conversation_logs').insert([
      { session_id: sessionId, role: 'user',      content: userMessage, timestamp_display: ts },
      { session_id: sessionId, role: 'assistant', content: reply,       timestamp_display: ts, input_tokens: 0, output_tokens: 0 },
    ]).then(({ error }) => {
      if (error) console.error('Supabase log error (mock):', error.message);
    });

    const label = userIdentifier ?? sessionId;
    console.log(`[MOCK][${label}] Turn ${Math.ceil(messages.length / 2)}: "${reply.slice(0, 60)}…"`);

    // Simulate realistic API latency so loading states can be tested
    await new Promise(r => setTimeout(r, 700));

    return res.json({ reply });
  }

  // Personalize system prompt with first name if available
  let activePrompt = systemPrompt;
  if (userIdentifier) {
    const firstName = userIdentifier.replace(/\d+$/, '');
    activePrompt = `${systemPrompt}\n\nThe user's name is ${firstName}. Address them by name occasionally in a natural, friendly way.`;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 1024,
      system: activePrompt,
      messages,
    });

    const reply = response.content[0].text;
    const { input_tokens, output_tokens } = response.usage;

    // Log to Supabase — awaited so Vercel doesn't freeze the function before the write completes
    const ts = formatTimestamp();
    const { error: logError } = await supabase.from('conversation_logs').insert([
      { session_id: sessionId, role: 'user',      content: userMessage, timestamp_display: ts },
      { session_id: sessionId, role: 'assistant', content: reply,       timestamp_display: ts, input_tokens, output_tokens },
    ]);
    if (logError) console.error('Supabase log error:', logError.message);

    const label = userIdentifier ?? sessionId;
    console.log(`[${label}] Turn ${Math.ceil(messages.length / 2)}`);

    res.json({ reply });
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ error: 'Failed to get response from Claude' });
  }
});

// GET /admin/sessions — summarize all logged sessions from Supabase
app.get('/admin/sessions', async (_req, res) => {
  const [logsResult, usersResult] = await Promise.all([
    supabase.from('conversation_logs').select('session_id, id, timestamp_display').neq('content', '__START__').order('id', { ascending: true }),
    supabase.from('users').select('session_id, user_identifier'),
  ]);

  if (logsResult.error) return res.status(500).json({ error: logsResult.error.message });
  if (usersResult.error) return res.status(500).json({ error: usersResult.error.message });

  // Map session_id → user_identifier for quick lookup
  const userMap = new Map(usersResult.data.map(u => [u.session_id, u.user_identifier]));

  const sessionMap = new Map();
  for (const row of logsResult.data) {
    const { session_id, id, timestamp_display } = row;
    if (!sessionMap.has(session_id)) {
      sessionMap.set(session_id, { sessionId: session_id, messageCount: 0, lastId: id, lastActivity: timestamp_display });
    }
    const s = sessionMap.get(session_id);
    s.messageCount += 1;
    if (id > s.lastId) {
      s.lastId = id;
      s.lastActivity = timestamp_display;
    }
  }

  res.json([...sessionMap.values()]
    .sort((a, b) => b.lastId - a.lastId)
    .map(({ sessionId, messageCount, lastActivity }) => ({
      sessionId,
      userIdentifier: userMap.get(sessionId) || null,
      messageCount,
      lastActivity,
    })));
});

// GET /admin/transcript/:sessionId — full conversation for one session
app.get('/admin/transcript/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const { data, error } = await supabase
    .from('conversation_logs')
    .select('id, role, content, timestamp_display, input_tokens, output_tokens')
    .eq('session_id', sessionId)
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

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