import React from 'react';

export default function NarrativeCard({ content }) {
  const paragraphs = content.split("\n\n");
  const closeIdx = paragraphs.findIndex((p) => /^I[' \w]/.test(p.trimStart()));
  const beforeParas = closeIdx >= 0 ? paragraphs.slice(0, closeIdx) : paragraphs;
  const closePara = closeIdx >= 0 ? paragraphs[closeIdx] : null;
  const afterParas = closeIdx >= 0 ? paragraphs.slice(closeIdx + 1) : [];

  return (
    <div className="narrative-card">
      <div className="narrative-card-header">My Success Story</div>
      {beforeParas.map((p, pi) => (
        <p key={pi} style={{ margin: "0 0 14px 0" }}>
          {p}
        </p>
      ))}
      {closePara && (
        <div
          style={{
            borderTop: "1px solid #d4c5a9",
            marginTop: "20px",
            paddingTop: "20px",
            fontStyle: "italic",
          }}
        >
          {"\u201c"}
          {closePara}
          {"\u201d"}
        </div>
      )}
      {afterParas.map((p, pi) => (
        <p key={`after-${pi}`} style={{ margin: "14px 0 0 0" }}>
          {p}
        </p>
      ))}
    </div>
  );
}