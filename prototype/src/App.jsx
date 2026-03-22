import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import DebugOverlay from './components/DebugOverlay';
import NarrativeCard from './components/NarrativeCard';
import NextChapterCard from './components/NextChapterCard';
import VoiceOverlay from './components/VoiceOverlay';
import StatusBar from './components/StatusBar';
import TestModeBar from './components/TestModeBar';
import ChatMessage from './components/ChatMessage';
import InputBar from './components/InputBar';

const BASE = window.location.origin;
const isTestMode =
  new URLSearchParams(window.location.search).get("test") === "true";
const debugMode =
  new URLSearchParams(window.location.search).get("debug") === "true";

const FIXTURE_MESSAGES = [
  { role: "user", content: "I keep thinking I should leave my job." },
  {
    role: "assistant",
    content: "How long have you been thinking about that?",
    messageType: "chat",
  },
  {
    role: "user",
    content: "About seven years. The money is good but I dread Mondays.",
  },
  { role: "assistant", content: "What would leaving feel like?", messageType: "chat" },
  {
    role: "user",
    content:
      "Relief. But also guilt — like throwing away something that took a long time to build.",
  },
  { role: "assistant", content: "What did you build there?", messageType: "chat" },
  {
    role: "user",
    content:
      "Security. And proof. Proof I could stick with something. My father never held a job for more than two years.",
  },
  {
    role: "assistant",
    content: "I think I have enough to tell your story. Ready to see it?",
    messageType: "chat",
  },
  { role: "user", content: "Yes." },
  {
    role: "assistant",
    messageType: "synthesis",
    content:
      "You didn't stay eleven years because you were afraid to leave. You stayed because leaving would have cost you something that took a long time to build — not the salary, not the title, but the proof. Proof that you were someone who sticks.\n\nWhat came through most clearly is that the thing you actually want has been sitting in a drawer for three years, written out twice, shown to no one. That's not procrastination. That's a very specific kind of courage withheld — because inside your current job, failure has a buffer. If something goes wrong, there's a structure to absorb it. What you're really afraid of isn't failure. It's failure with your name on it and nothing else to point to.\n\nThe harder thing to name is this: you built your identity in opposition to your father. Staying became proof. But the consulting practice has been in that drawer partly because if it fails, you can't use staying as the evidence anymore. The escape from one fear quietly became the entrance to another.\n\nI am not my father's story. I have already proved that — eleven years is proof enough. What I haven't proved yet is what I can build when the only thing standing behind it is me. That's what the drawer is about. I'm ready to find out. Not because I'm certain, but because staying certain was never actually the goal.\n\nDoes this feel true? Anything you'd want to change or add?",
  },
  { role: "user", content: "Yes, that feels exactly right." },
  {
    role: "assistant",
    messageType: "next-chapter",
    content:
      "This isn't a plan — plans come later. These are just the first moves.\n\n1. Show the business plan to one person this week.\nNot to get permission — to break the private/public seal that has kept this in a drawer for three years.\n\n2. Write down what failure actually looks like.\nNot the vague fear of it. The specific thing. Most people discover the actual answer is survivable.\n\n3. Set a date — not to launch, but to decide.\nPick a date three months from now by which you will have made a decision. Decisions have a different gravity than intentions.\n\nDo these feel right? You can adjust any of them, swap one out, or tell me one of these won't work and why.",
  },
  { role: "user", content: "These feel right." },
];

const FIXTURE_SESSION_STATE = {
  storyConfirmed: true,
  chapterConfirmed: true,
  hasNarrative: true,
  hasNextChapter: true,
};

// Chapter adjustment fixture — identical to FIXTURE_MESSAGES but ends before
// the user's confirmation so the chapter adjustment flow can be tested.
const FIXTURE_MESSAGES_CHAPTER = FIXTURE_MESSAGES.slice(0, -1);

const FIXTURE_SESSION_STATE_CHAPTER = {
  storyConfirmed: true,
  chapterConfirmed: false,
  hasNarrative: true,
  hasNextChapter: true,
};

const FLOOD_SCRIPT = [
  "My name is TestUser",
  "I want to start my own business but I keep putting it off",
  "I've been thinking about it for about three years now",
  "I guess I'm worried about failing and losing the income I have",
  "My family depends on my salary so the risk feels huge",
  "I've tried a few side projects but nothing stuck",
  "Honestly I think I'm also not sure what kind of business I'd even want",
  "Something in the tech space probably, I have a background in software",
  "I think what I really want is to feel like my work matters and is mine",
  "Yes, that summary feels pretty accurate to what I've been carrying around",
];

// Classify an assistant message as 'synthesis', 'next-chapter', or null.
function classifyMsg(msg) {
  if (msg.role !== "assistant") return null;
  if (msg.messageType === "synthesis") return "synthesis";
  if (msg.messageType === "next-chapter") return "next-chapter";
  return null;
}

// Converts a caught fetch error into a user-facing message.
// "Failed to fetch" (and similar) means the server wasn't reachable — give a
// friendlier prompt than a raw browser error string.
function friendlyError(err) {
  if (err instanceof TypeError || err.message === "Failed to fetch") {
    return "Could not reach the server — please wait a moment and try again.";
  }
  return err.message || "Sorry, something went wrong. Please try again.";
}


function App() {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent,
  );

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [sessionId, setSessionId] = useState(() => {
    let id = localStorage.getItem("goalapp_session_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("goalapp_session_id", id);
    }
    return id;
  });

  // userIdentifier: e.g. "Sarah0001". Null until name is registered.
  const [userIdentifier, setUserIdentifier] = useState(
    () => localStorage.getItem("goalapp_user_identifier") || null,
  );

  // awaitingName: true until the user submits their name for the first time.
  const [awaitingName, setAwaitingName] = useState(
    () => !localStorage.getItem("goalapp_user_identifier"),
  );

  const [isFlooding, setIsFlooding] = useState(false);
  const [floodIndex, setFloodIndex] = useState(0);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [synthSupported, setSynthSupported] = useState(false);
  const [voiceStarted, setVoiceStarted] = useState(!isMobile);
  // desktopUnlocked: false until the first mic click on desktop (used to unlock
  // Chrome's autoplay policy via a user gesture). Always true on mobile because
  // the overlay tap serves as the gesture.
  const [desktopUnlocked, setDesktopUnlocked] = useState(isMobile);
  const voiceModeRef = useRef(false);
  const pendingStopRef = useRef(false);
  const activeSpeechIdRef = useRef(null);

  const [receiveMode, setReceiveMode] = useState(false);
  const receiveModeRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef("");
  const handsFreeRef = useRef(false);
  const recognitionRef = useRef(null);
  const sendMessageRef = useRef(null);
  const currentAudioRef = useRef(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [sessionState, setSessionState] = useState({
    storyConfirmed: false,
    chapterConfirmed: false,
    hasNarrative: false,
    hasNextChapter: false,
  });

  const [debugLog, setDebugLog] = useState([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const dbg = debugMode
    ? (msg) => {
        const ts = new Date().toTimeString().slice(0, 8);
        setDebugLog((prev) => [`${ts} ${msg}`, ...prev].slice(0, 20));
      }
    : () => {};

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    setSpeechSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
  }, []);

  useEffect(() => {
    setSynthSupported(!!window.speechSynthesis);
  }, []);

  // On mount: load welcome text and initialise the conversation.
  useEffect(() => {
    const init = async () => {
      dbg(
        `App mounted, SR:${!!(window.SpeechRecognition || window.webkitSpeechRecognition)} SS:${!!window.speechSynthesis}`,
      );
      let welcomeText = "Welcome! What would you like to work on?";
      try {
        const r = await fetch(`${BASE}/welcome`);
        const d = await r.json();
        welcomeText = d.message;
      } catch (err) {
        console.error("Failed to load welcome message:", err);
      }

      // Read localStorage directly — state may not reflect latest yet.
      const existingId = localStorage.getItem("goalapp_user_identifier");

      if (!existingId) {
        // New user — show welcome message (which asks for their name).
        setMessages([
          { role: "assistant", content: welcomeText, uiOnly: true },
        ]);
      } else {
        // Returning user — greet by name and start the conversation.
        const firstName = existingId.replace(/\d+$/, "");
        setMessages([
          {
            role: "assistant",
            content: `Welcome back, ${firstName}! Let's pick up where we left off.`,
            uiOnly: true,
          },
        ]);
        await startConversation(existingId);
      }

      if (isTestMode) {
        // Small delay to let React render the welcome message before flooding starts
        setTimeout(() => setIsFlooding(true), 600);
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Send __START__ to Claude and append its opening message.
  // Always called with the local `identifier` variable (not state) to avoid
  // stale closure issues immediately after setUserIdentifier().
  const startConversation = async (identifier, shouldSpeak = false) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "__START__", hidden: true },
    ]);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [{ role: "user", content: "__START__" }],
          userIdentifier: identifier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, messageType: data.messageType ?? 'chat' },
      ]);
      if (shouldSpeak && synthSupported) {
        speakWithOpenAI(data.reply);
      }
    } catch (err) {
      console.error("Start conversation error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong. Please refresh and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    dbg(`handleSend called: ${text.slice(0, 30)}`);
    setInput("");

    // Capture voice mode for this turn, then reset it
    const wasVoiceMode = voiceModeRef.current;
    voiceModeRef.current = false;
    setVoiceMode(false);

    if (awaitingName) {
      // ── Name registration flow ──────────────────────────────────────
      setLoading(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text, uiOnly: true },
      ]);

      let identifier;
      try {
        const res = await fetch(`${BASE}/register-name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, rawInput: text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");

        identifier = data.userIdentifier;
        const firstName = identifier.replace(/\d+$/, "");

        localStorage.setItem("goalapp_user_identifier", identifier);
        setUserIdentifier(identifier);
        setAwaitingName(false);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: friendlyError(err),
          },
        ]);
        setLoading(false);
        return;
      }

      // Registration succeeded — trigger Claude's opening question.
      // Pass `identifier` (local var) not `userIdentifier` (state, still null here).
      await startConversation(identifier, wasVoiceMode);
    } else {
      // ── Normal chat turn ────────────────────────────────────────────
      // Build history from current messages snapshot BEFORE adding the new one.
      // Messages flagged uiOnly are shown in the UI but never sent to Claude.
      // Messages flagged hidden are sent to Claude but not shown in the UI.
      const historyToSend = [
        ...messages
          .filter((m) => !m.uiOnly)
          .map(({ role, content }) => ({ role, content })),
        { role: "user", content: text },
      ];

      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setLoading(true);

      try {
        const res = await fetch(`${BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            messages: historyToSend,
            userIdentifier,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        dbg(
          `Response received, voiceMode:${wasVoiceMode} synth:${synthSupported} len:${data.reply.length}`,
        );
        if (wasVoiceMode && synthSupported) {
          speakWithOpenAI(data.reply);
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, messageType: data.messageType ?? 'chat' },
        ]);
        setTimeout(() => fetchSessionState(), 500);
      } catch (err) {
        dbg(`ERROR: ${err.message}`);
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: friendlyError(err),
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
  };
  // Fetch current session state flags from the server (storyConfirmed, chapterConfirmed, etc.)
  const fetchSessionState = async () => {
    try {
      const r = await fetch(`${BASE}/session/${sessionId}`);
      if (r.ok) {
        const data = await r.json();
        setSessionState(data);
      }
    } catch (_) {}
  };

  // Always point to the latest sendMessage so async callbacks (receive mode
  // silence timer) never close over a stale version with outdated state.
  sendMessageRef.current = sendMessage;

  const runFloodTest = async () => {
    if (isFlooding) return;
    setIsFlooding(true);
    setFloodIndex(0);

    // Reset session for a clean test run
    localStorage.removeItem("goalapp_session_id");
    localStorage.removeItem("goalapp_user_identifier");

    // Brief pause then reload to start fresh
    await new Promise((r) => setTimeout(r, 300));
    window.location.href = window.location.pathname + "?test=true";
  };

  const injectFixture = async () => {
    try {
      await fetch("/seed-fixture-session", { method: "POST" });
    } catch (err) {
      console.error("Failed to seed fixture session:", err);
    }
    setMessages(FIXTURE_MESSAGES);
    setSessionId("fixture-test-session");
    setAwaitingName(false);
    setSessionState(FIXTURE_SESSION_STATE);
  };

  const injectFixtureChapter = async () => {
    try {
      await fetch("/seed-fixture-chapter", { method: "POST" });
    } catch (err) {
      console.error("Failed to seed fixture session:", err);
    }
    setMessages(FIXTURE_MESSAGES_CHAPTER);
    setSessionId("fixture-test-session");
    setAwaitingName(false);
    setSessionState(FIXTURE_SESSION_STATE_CHAPTER);
  };

  useEffect(() => {
    if (!isTestMode) return;
    if (!isFlooding) return;
    if (loading) return;
    if (floodIndex >= FLOOD_SCRIPT.length) {
      setIsFlooding(false);
      return;
    }

    const timer = setTimeout(async () => {
      const message = FLOOD_SCRIPT[floodIndex];
      setFloodIndex((prev) => prev + 1);
      await sendMessage(message);
    }, 900);

    return () => clearTimeout(timer);
  }, [isFlooding, loading, floodIndex]);

  const stopReceiveMode = (leaveAccumulated = false) => {
    receiveModeRef.current = false;
    setReceiveMode(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    if (!leaveAccumulated) {
      accumulatedTranscriptRef.current = "";
      setInput("");
    }
  };

  const startReceiveMode = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (receiveModeRef.current) return;

    dbg("startReceiveMode called");
    receiveModeRef.current = true;
    setVoiceMode(true);
    setReceiveMode(true);
    accumulatedTranscriptRef.current = "";
    setInput("");

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript;
      dbg(`Result received: ${transcript.slice(0, 30)}`);
      accumulatedTranscriptRef.current +=
        (accumulatedTranscriptRef.current ? " " : "") + transcript;
      setInput(accumulatedTranscriptRef.current);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (
          receiveModeRef.current &&
          accumulatedTranscriptRef.current.trim()
        ) {
          dbg(
            `Silence timer fired: ${accumulatedTranscriptRef.current.slice(0, 30)}`,
          );
          voiceModeRef.current = true;
          setVoiceMode(true);
          handsFreeRef.current = true;
          const textToSend = accumulatedTranscriptRef.current;
          stopReceiveMode(false);
          sendMessageRef.current(textToSend);
        }
      }, 4000);
    };

    recognition.onend = () => {
      // Auto-restart if still in receive mode (recognition stops after silence)
      if (receiveModeRef.current) {
        try {
          recognition.start();
        } catch (_) {}
      }
    };

    recognition.onerror = (err) => {
      dbg(`SR onerror: ${err.error}`);
      if (
        err.error === "not-allowed" ||
        err.error === "service-not-allowed"
      ) {
        receiveModeRef.current = false;
        setReceiveMode(false);
      }
    };

    dbg("Recognition started");
    recognition.start();
  };

  const speakWithOpenAI = async (fullText) => {
    dbg("TTS request sent");
    try {
      const response = await fetch(`${BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText }),
      });
      if (!response.ok) throw new Error(`TTS HTTP ${response.status}`);
      dbg("TTS audio received");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onplay = () => {
        dbg("TTS playback started");
        setIsSpeaking(true);
      };
      audio.onended = () => {
        dbg("TTS playback ended");
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
        setIsSpeaking(false);
        if (handsFreeRef.current) {
          handsFreeRef.current = false;
          startReceiveMode();
        }
      };
      audio.onerror = () => {
        dbg("TTS audio error, falling back to SS");
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
        setIsSpeaking(false);
        speakResponse(fullText, null);
      };
      audio.play();
    } catch (err) {
      dbg(`TTS failed (falling back to SS): ${err.message}`);
      console.error("OpenAI TTS error:", err);
      speakResponse(fullText, null);
    }
  };

  const speakResponse = (fullText, msgId) => {
    // Clear any stuck utterance from a previous call before queuing new ones.
    // Chrome has a known bug where the synthesis queue can become permanently
    // blocked; cancelling first ensures we always start from a clean state.
    activeSpeechIdRef.current = null;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    const stripMd = (t) =>
      t
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s+/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    const raw = fullText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [
      fullText,
    ];
    const sentences = raw.map((s) => s.trim()).filter(Boolean);

    const speechId = Date.now();
    activeSpeechIdRef.current = speechId;
    let builtText = "";

    sentences.forEach((sentence, i) => {
      const utt = new SpeechSynthesisUtterance(stripMd(sentence));

      utt.onstart = () => {
        if (activeSpeechIdRef.current !== speechId) return;
        dbg(`SS onstart fired [s${i}]`);
        builtText += (builtText ? " " : "") + sentence;
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msgId ? { ...m, content: builtText } : m,
          ),
        );
        setIsSpeaking(true);
      };

      utt.onend = () => {
        if (activeSpeechIdRef.current !== speechId) return;
        if (pendingStopRef.current) {
          pendingStopRef.current = false;
          handsFreeRef.current = false;
          activeSpeechIdRef.current = null;
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
          setMessages((prev) =>
            prev.map((m) =>
              m._id === msgId ? { ...m, content: fullText } : m,
            ),
          );
          return;
        }
        if (i === sentences.length - 1) {
          activeSpeechIdRef.current = null;
          setIsSpeaking(false);
          setMessages((prev) =>
            prev.map((m) =>
              m._id === msgId ? { ...m, content: fullText } : m,
            ),
          );
          if (handsFreeRef.current) {
            dbg(`SS onend last sentence, resuming receive`);
            handsFreeRef.current = false;
            startReceiveMode();
          } else {
            dbg(`SS onend last sentence, handsFree=false`);
          }
        }
      };

      utt.onerror = (e) => {
        dbg(`SS onerror: ${e.error}`);
        if (activeSpeechIdRef.current !== speechId) return;
        activeSpeechIdRef.current = null;
        setIsSpeaking(false);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msgId ? { ...m, content: fullText } : m,
          ),
        );
      };

      dbg(`SS speak() s${i}: ${stripMd(sentence).slice(0, 30)}`);
      window.speechSynthesis.speak(utt);
    });
  };

  // Called by the mobile overlay tap. On desktop this is not called
  // (startReceiveMode is triggered automatically via useEffect instead).
  const initializeSession = () => {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance("a");
      u.volume = 0;
      u.rate = 10;
      window.speechSynthesis.speak(u);
    }
    dbg("initializeSession called");
    setVoiceStarted(true);
    const utterance = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(utterance);
    if (speechSupported) startReceiveMode(); 
  };

  const startListening = () => {
    if (receiveModeRef.current) {
      handsFreeRef.current = false;
      stopReceiveMode(false);
    } else {
      // Cancel any ongoing speech before starting receive mode
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
        handsFreeRef.current = false;
        setIsSpeaking(false);
      }
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        activeSpeechIdRef.current = null;
        pendingStopRef.current = false;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      // Unlock TTS on first use (this click IS a user gesture).
      // On mobile voiceStarted is false until overlay tap; on desktop
      // desktopUnlocked is false until the first mic click.
      if ((!voiceStarted || !desktopUnlocked) && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance("a");
        u.volume = 0;
        u.rate = 10;
        window.speechSynthesis.speak(u);
        setVoiceStarted(true);
        setDesktopUnlocked(true);
      }
      startReceiveMode();
    }
  };

  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        receiveModeRef.current
      ) {
        // Recognition was likely killed by the browser when the tab was hidden;
        // restart it now that we're visible again.
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (_) {}
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () =>
      document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (receiveModeRef.current) {
        voiceModeRef.current = true;
        setVoiceMode(true);
        handsFreeRef.current = true;
        stopReceiveMode(true);
      }
      sendMessage(input);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (receiveModeRef.current) {
      handsFreeRef.current = false;
      stopReceiveMode(true);
    }
    if (voiceModeRef.current) {
      voiceModeRef.current = false;
      setVoiceMode(false);
    }
    if (isSpeaking) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
        setIsSpeaking(false);
      } else {
        pendingStopRef.current = true;
      }
    }
  };

  const handleSendClick = () => {
    if (receiveModeRef.current) {
      voiceModeRef.current = true;
      setVoiceMode(true);
      handsFreeRef.current = true;
      stopReceiveMode(true);
    }
    sendMessage(input);
  };

  return (
    <>
      <TestModeBar
        isTestMode={isTestMode}
        isFlooding={isFlooding}
        floodIndex={floodIndex}
        floodScriptLength={FLOOD_SCRIPT.length}
        runFloodTest={runFloodTest}
      />
      <header>
        <h1>My Success Story</h1>
      </header>

      <div id="messages">
        {(() => {
          const visible = messages.filter((m) => !m.hidden);
          const lastNextChapterIdx = visible.reduce(
            (last, m, i) =>
              classifyMsg(m) === "next-chapter" ? i : last,
            -1,
          );
          return visible.map((msg, i) => {
            const type = classifyMsg(msg);
            if (type === "synthesis") {
              return <NarrativeCard key={i} content={msg.content} />;
            }
            if (type === "next-chapter") {
              return (
                <NextChapterCard
                  key={i}
                  content={msg.content}
                  showDownload={i === lastNextChapterIdx && sessionState.chapterConfirmed}
                  sessionId={sessionId}
                  base={BASE}
                />
              );
            }
            return <ChatMessage key={i} role={msg.role} content={msg.content} />;
          });
        })()}
        {loading && <div className="typing">Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <VoiceOverlay voiceStarted={voiceStarted} onTap={initializeSession} />
      <StatusBar receiveMode={receiveMode} loading={loading} isSpeaking={isSpeaking} />

      {/*!isMobile && !desktopUnlocked && speechSupported && (
        <div style={{
          textAlign: "center",
          padding: "0 20px 8px",
          fontSize: "12px",
          color: "#8b7355",
          letterSpacing: "0.01em",
        }}>
          Click the mic button to interact using your voice; otherwise, type in your side of the conversation
        </div>
      )*/}

      <InputBar
        speechSupported={speechSupported}
        receiveMode={receiveMode}
        isListening={isListening}
        loading={loading}
        input={input}
        awaitingName={awaitingName}
        inputRef={inputRef}
        onMicClick={startListening}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSendClick={handleSendClick}
      />

      <DebugOverlay
        debugOpen={debugOpen}
        setDebugOpen={setDebugOpen}
        debugLog={debugLog}
        injectFixture={injectFixture}
        injectFixtureChapter={injectFixtureChapter}
      />
    </>
  );
}


export default App;
