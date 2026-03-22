import React from 'react';

export default function VoiceOverlay({ voiceStarted, onTap }) {
  if (voiceStarted) return null;

  return (
    <div
      onClick={onTap}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0d1a",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ textAlign: "center", padding: "0 32px" }}>
        <h1
          style={{
            fontSize: "clamp(26px, 6vw, 38px)",
            fontWeight: 700,
            color: "white",
            marginBottom: "20px",
            letterSpacing: "-0.5px",
          }}
        >
          My Success Story
        </h1>
        <p
          className="overlay-hint"
          style={{
            fontSize: "16px",
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            margin: 0,
          }}
        >
          Tap to begin your session
        </p>
      </div>
    </div>
  );
}
