import React from 'react';

export default function TestModeBar({ isTestMode, isFlooding, floodIndex, floodScriptLength, runFloodTest }) {
  if (!isTestMode) return null;

  return (
    <div style={{
      background: "#1a1a2e", color: "#00ff88", padding: "6px 16px",
      fontSize: "12px", fontFamily: "monospace", display: "flex",
      alignItems: "center", gap: "16px", borderBottom: "2px solid #00ff88",
      flexShrink: 0,
    }}>
      <span>⚡ TEST MODE</span>
      <button
        onClick={runFloodTest}
        disabled={isFlooding}
        style={{
          background: isFlooding ? "#333" : "#00ff88", color: "#1a1a2e",
          border: "none", borderRadius: "4px", padding: "4px 12px",
          fontSize: "11px", fontFamily: "monospace", fontWeight: "bold",
          cursor: isFlooding ? "not-allowed" : "pointer",
        }}
      >
        {isFlooding ? `Flooding… (${floodIndex}/${floodScriptLength})` : "Run Flood Test"}
      </button>
      {!isFlooding && floodIndex > 0 && (
        <span style={{ color: "#aaa" }}>
          ✓ Complete — {floodScriptLength} messages sent
        </span>
      )}
      <span style={{ marginLeft: "auto", color: "#666" }}>
        Never visible in production
      </span>
    </div>
  );
}