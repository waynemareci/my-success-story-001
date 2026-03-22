import React from 'react';

const debugMode =
  new URLSearchParams(window.location.search).get('debug') === 'true';

function DebugOverlay({
  debugOpen,
  setDebugOpen,
  debugLog,
  injectFixture,
  injectFixtureChapter,
}) {
  if (!debugMode) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}
    >
      <button
        onClick={injectFixture}
        style={{
          background: "#f59e0b",
          color: "#1c1c1c",
          border: "none",
          borderRadius: "6px",
          padding: "8px 16px",
          fontSize: "0.85rem",
          cursor: "pointer",
          margin: "8px 0",
        }}
      >
        Inject Test Conversation
      </button>
      <button
        onClick={injectFixtureChapter}
        style={{
          background: "#f59e0b",
          color: "#1c1c1c",
          border: "none",
          borderRadius: "6px",
          padding: "8px 16px",
          fontSize: "0.85rem",
          cursor: "pointer",
          margin: "8px 0",
        }}
      >
        Test Chapter Adjustment
      </button>
      <button
        onClick={() => setDebugOpen((o) => !o)}
        style={{
          background: "#111",
          color: "#0f0",
          border: "none",
          fontFamily: "monospace",
          fontSize: "10px",
          padding: "3px 8px",
          cursor: "pointer",
          opacity: 0.85,
        }}
      >
        {debugOpen ? "▼ DEBUG" : "▲ DEBUG"}
      </button>
      {debugOpen && (
        <div
          style={{
            width: "min(340px, 96vw)",
            maxHeight: "40vh",
            overflowY: "auto",
            background: "rgba(0,0,0,0.9)",
            color: "#0f0",
            fontFamily: "monospace",
            fontSize: "11px",
            padding: "6px 8px",
            lineHeight: 1.5,
          }}
        >
          {debugLog.length === 0 && (
            <div style={{ color: "#666" }}>no events yet</div>
          )}
          {debugLog.map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DebugOverlay;
