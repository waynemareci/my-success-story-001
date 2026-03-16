// test-synthesis.js
// Layer 2 test for marker detection and two-prompt backend sequence
//
// Usage:
//   1. Start your dev server in one terminal: npm run dev
//   2. In a second terminal: node test-synthesis.js
//
// What to look for in your DEV SERVER terminal:
//   [SYNTHESIS] Marker detected — starting extraction
//   [SYNTHESIS] Extraction complete — JSON received
//   [SYNTHESIS] Starting synthesis call
//   [SYNTHESIS] Synthesis complete
//   [SYNTHESIS] Story confirmed — session updated

const BASE_URL = 'http://127.0.0.1:3000';

const TEST_TRANSCRIPT = `
USER: I want to build something meaningful before I run out of time.
CLAUDE: What does meaningful mean to you specifically?
USER: Something people actually use. Something that helps them.
CLAUDE: How long have you been sitting on this idea?
USER: Years. I keep starting and stopping.
CLAUDE: What stops you?
USER: Fear that it won't be good enough. That I won't be good enough.
CLAUDE: And if it is good enough — what changes for you?
USER: Everything. I'd finally know I could do it.
`;

async function post(messages, sessionId) {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      messages,
      userIdentifier: 'test-user'
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Server returned ${response.status}: ${text}`);
  }

  return response.json();
}

async function runTest() {
  console.log('=== LAYER 2 TEST: Marker Detection + Two-Prompt Sequence ===\n');

  // ── TEST 1: SYNTHESIS_READY marker ─────────────────────────────────────

  console.log('TEST 1: Triggering %%SYNTHESIS_READY%% marker...');
  console.log('Watch your dev server terminal for [SYNTHESIS] log lines.\n');

  try {
    // We send a conversation where the last assistant message contains
    // the marker, simulating Claude having just emitted it
    const data = await post([
      {
        role: 'user',
        content: 'I want to build something meaningful.'
      },
      {
        role: 'assistant',
        content: 'I think I have enough to tell your story. Ready to see it?'
      },
      {
        role: 'user',
        content: 'Yes, I am ready.'
      },
      {
        role: 'assistant',
        content: '%%SYNTHESIS_READY%%'
      }
    ], 'test-session-001');

    // Marker should never appear in the reply
    if (data.reply && data.reply.includes('%%SYNTHESIS_READY%%')) {
      console.log('❌ FAIL: Marker was NOT stripped — visible in reply');
    } else {
      console.log('✅ PASS: Marker stripped from reply');
    }

    // Reply should contain the synthesis narrative
    if (data.reply && data.reply.length > 100) {
      console.log('✅ PASS: Reply contains content (likely synthesis narrative)');
      console.log('\n--- SYNTHESIS OUTPUT PREVIEW ---');
      console.log(data.reply.slice(0, 400) + '...');
      console.log('--------------------------------\n');
    } else {
      console.log('❌ FAIL: Reply too short — synthesis may not have fired');
      console.log('Full reply:', data.reply);
    }

  } catch (err) {
    console.log('❌ ERROR:', err.message);
    console.log('Is your dev server running? Is the endpoint /chat?');
  }

  console.log('\n');

  // ── TEST 2: STORY_CONFIRMED marker ─────────────────────────────────────

  console.log('TEST 2: Triggering %%STORY_CONFIRMED%% marker...');
  console.log('Watch your dev server terminal for Story confirmed log line.\n');

  try {
    const data = await post([
      {
        role: 'assistant',
        content: "Does this feel true? Anything you'd want to change or add?"
      },
      {
        role: 'user',
        content: 'Yes, that feels exactly right.'
      },
      {
        role: 'assistant',
        content: '%%STORY_CONFIRMED%%'
      }
    ], 'test-session-001');

    if (data.reply && data.reply.includes('%%STORY_CONFIRMED%%')) {
      console.log('❌ FAIL: Marker was NOT stripped — visible in reply');
    } else {
      console.log('✅ PASS: %%STORY_CONFIRMED%% stripped from reply');
    }

    console.log('\nNow check your dev server terminal for:');
    console.log('  [SYNTHESIS] Story confirmed — session updated');
    console.log('  [SYNTHESIS] Session test-session-001 storyConfirmed: true');

  } catch (err) {
    console.log('❌ ERROR:', err.message);
  }

  console.log('\n');

  // ── TEST 3: Normal message — markers should NOT fire ───────────────────

  console.log('TEST 3: Sending normal message — no markers should fire...');

  try {
    const data = await post([
      {
        role: 'user',
        content: 'Hello, I would like to talk about my goals.'
      }
    ], 'test-session-002');

    if (data.reply) {
      console.log('✅ PASS: Normal message handled without error');
      console.log('Confirm dev server terminal shows NO [SYNTHESIS] lines for this request');
    } else {
      console.log('❌ FAIL: No reply returned');
    }

  } catch (err) {
    console.log('❌ ERROR:', err.message);
  }

  console.log('\n=== TEST COMPLETE ===');
  console.log('The most important output is in your dev server terminal.');
  console.log('Look for [SYNTHESIS] log lines confirming each step fired in sequence.');
}

runTest();