import React from 'react';

export default function InputBar({
  speechSupported, receiveMode, isListening, loading,
  input, awaitingName, inputRef,
  onMicClick, onInputChange, onKeyDown, onSendClick,
}) {
  return (
    <footer>
      {speechSupported && (
        <button
          onClick={onMicClick}
          disabled={loading}
          className={receiveMode ? "mic-receiving" : isListening ? "mic-listening" : ""}
          style={{
            background: receiveMode ? "#16a34a" : isListening ? "#dc3545" : "#e9ecef",
            color: receiveMode || isListening ? "white" : "#495057",
            flexShrink: 0,
            padding: "10px 12px",
          }}
          aria-label={receiveMode ? "Stop listening" : "Start voice conversation"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
            <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 11z" />
          </svg>
        </button>
      )}
      <textarea
        ref={inputRef}
        rows="2"
        value={input}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        placeholder={awaitingName ? "Enter your name..." : "Type your message..."}
        disabled={loading}
      />
      <button
        onClick={onSendClick}
        disabled={loading || !input.trim()}
      >
        Send
      </button>
    </footer>
  );
}