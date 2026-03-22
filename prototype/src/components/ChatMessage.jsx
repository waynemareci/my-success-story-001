import React from 'react';

export default function ChatMessage({ role, content }) {
  return (
    <div className={`message ${role}`}>
      {content}
    </div>
  );
}