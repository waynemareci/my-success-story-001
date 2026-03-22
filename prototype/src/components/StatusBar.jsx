import React from 'react';

export default function StatusBar({ receiveMode, loading, isSpeaking }) {
  return (
    <>
      {receiveMode && !loading && !isSpeaking && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 20px 8px", fontSize: "12px", color: "#6c757d" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#22c55e", borderRadius: "50%", flexShrink: 0 }} />
          <span>Listening…</span>
        </div>
      )}
      {isSpeaking && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 20px 8px", fontSize: "12px", color: "#6c757d" }}>
          <span className="speaking-dot" />
          <span>Speaking…</span>
        </div>
      )}
    </>
  );
}