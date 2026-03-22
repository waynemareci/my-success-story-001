import React from 'react';

export default function NextChapterCard({ content, showDownload, sessionId, base }) {
  return (
    <div>
      <div className="narrative-card">
        <div className="narrative-card-header">My Next Chapter</div>
        {content}
      </div>
      {showDownload && (
        <button
          className="download-btn"
          onClick={() => window.open(`${base}/getpdf/${sessionId}`, "_blank")}
        >
          Download My Story (PDF)
        </button>
      )}
    </div>
  );
}