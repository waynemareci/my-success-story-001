import PDFDocument from 'pdfkit';

/**
 * Generates a two-page PDF for a completed session.
 * Pipes directly to the Express response object.
 * @param {object} session - session object from getSession()
 * @param {object} res - Express response object
 */
export function generateStoryPdf(session, res) {
  const doc = new PDFDocument({ margin: 72, size: "LETTER" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="my-success-story.pdf"',
  );
  doc.pipe(res);

  // ── Page 1: My Story ─────────────────────────────────────────────────

  if (session.firstName) {
    doc
      .fontSize(28)
      .fillColor("#2c2416")
      .font("Times-Roman")
      .text(`${session.firstName}'s Success Story`, {
        align: "center",
      })
      .moveDown(0.5);

    doc
      .moveTo(72, doc.y)
      .lineTo(540, doc.y)
      .strokeColor("#d4c5a9")
      .stroke()
      .moveDown(1.5);
  }

  doc
    .fontSize(9)
    .fillColor("#8b7355")
    .font("Helvetica")
    .text("MY SUCCESS STORY", { characterSpacing: 3 })
    .moveDown(0.5);

  doc
    .moveTo(72, doc.y)
    .lineTo(540, doc.y)
    .strokeColor("#d4c5a9")
    .stroke()
    .moveDown(1.5);

  const normalized = session.confirmedNarrative.replace(/\\n/g, "\n");
  const paragraphs = normalized.split("\n\n");
  const closeIdx = paragraphs.findIndex((p) => /^I[' \w]/.test(p.trimStart()));
  const beforeParas =
    closeIdx >= 0 ? paragraphs.slice(0, closeIdx) : paragraphs;
  const closePara = closeIdx >= 0 ? paragraphs[closeIdx] : null;
  const afterParas = closeIdx >= 0 ? paragraphs.slice(closeIdx + 1) : [];

  beforeParas.forEach((p) => {
    doc
      .fontSize(12)
      .fillColor("#2c2416")
      .font("Times-Roman")
      .text(p, { lineGap: 6, paragraphGap: 12 });
  });

  if (closePara) {
    doc
      .moveDown(0.5)
      .moveTo(72, doc.y)
      .lineTo(540, doc.y)
      .strokeColor("#d4c5a9")
      .stroke()
      .moveDown(0.5);
    doc
      .fontSize(12)
      .fillColor("#2c2416")
      .font("Times-Italic")
      .text(`\u201c${closePara}\u201d`, { lineGap: 6, paragraphGap: 12 });
  }

  afterParas.forEach((p) => {
    doc
      .fontSize(12)
      .fillColor("#2c2416")
      .font("Times-Roman")
      .text(p, { lineGap: 6, paragraphGap: 12 });
  });

  doc.moveDown(2);

  // ── Page 2: My Next Chapter ──────────────────────────────────────────

  if (session.nextChapter) {
    doc.addPage();

    doc
      .fontSize(9)
      .fillColor("#8b7355")
      .font("Helvetica")
      .text("MY NEXT CHAPTER", { characterSpacing: 3 })
      .moveDown(0.5);

    doc
      .moveTo(72, doc.y)
      .lineTo(540, doc.y)
      .strokeColor("#d4c5a9")
      .stroke()
      .moveDown(1.5);

    doc
      .fontSize(12)
      .fillColor("#2c2416")
      .font("Times-Roman")
      .text(session.nextChapter, { lineGap: 6, paragraphGap: 12 })
      .moveDown(3);

    doc
      .fontSize(9)
      .fillColor("#8b7355")
      .font("Helvetica-Oblique")
      .text("Return when you're ready for Chapter Two.", { align: "center" });
  }

  doc.end();
}