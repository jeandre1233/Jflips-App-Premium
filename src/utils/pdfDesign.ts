import { jsPDF } from 'jspdf';
import { LOGO_PNG, LOGO_SIZE, MONOGRAM_PNG, MONOGRAM_SIZE } from './pdfAssets';

/**
 * THE JFLIPS PDF LOOK (src/assets/pdf/STYLE.md).
 * Letterhead, footer, headings, paragraphs and the three kinds of table the signed
 * registration PDFs use. Layout only: nothing here decides what the documents say.
 * All text stays real, selectable text. Tick boxes are drawn shapes.
 */

export const COLORS = {
  navy: '#0A296D',
  blue: '#1E63D6',
  ink: '#222222',
  sky: '#EAF1FB',
  rule: '#C3D2EC',
  border: '#9FB4D6',
  grey: '#595959',
  warn: '#B91C1C'
};

const rgb = (hex: string): [number, number, number] =>
  [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

const PAGE_W = 210;
const MX = 22;                       // left and right margin
const CW = PAGE_W - MX * 2;          // content width: 166 mm
const LH = 4.9;                      // line height for 10.5 pt body text
const BOTTOM = 267;                  // about 30 mm left under the content for the footer
const TOP_FIRST = 46;                // below the first-page letterhead
const TOP_NEXT = 32;                 // below the small header on later pages
const PT = 0.3528;                   // one point in millimetres
const FOOTER_LINE = 'Krugersdorp, Gauteng  |  WhatsApp 069 040 3387  |  jflipsinc@gmail.com  |  jflips.co.za';

type Style = 'normal' | 'bold' | 'italic' | 'bolditalic';

export class PdfDoc {
  readonly doc: jsPDF;
  y = TOP_FIRST;

  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
  }

  // ── low level ──────────────────────────────────────────────────────────
  private font(size: number, style: Style = 'normal', color = COLORS.ink) {
    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...rgb(color));
  }

  private wrap(text: string, width: number, size = 10.5, style: Style = 'normal'): string[] {
    this.font(size, style);
    return this.doc.splitTextToSize(text, width) as string[];
  }

  newPage() {
    this.doc.addPage();
    this.y = TOP_NEXT;
  }

  /** Start a new page unless this one is still empty. */
  startPage() {
    if (this.y !== TOP_FIRST && this.y !== TOP_NEXT) this.newPage();
  }

  private atTop() { return this.y === TOP_FIRST || this.y === TOP_NEXT; }

  ensure(height: number) {
    if (this.y + height > BOTTOM) this.newPage();
  }

  /** Space for something that must not be left alone at the bottom of a page. */
  keepWithNext(height: number) {
    this.ensure(height + LH * 1.1);
  }

  // ── text ───────────────────────────────────────────────────────────────
  title(text: string) {
    this.keepWithNext(10);
    const lines = this.wrap(text, CW, 15, 'bold');
    this.font(15, 'bold', COLORS.navy);
    lines.forEach(l => { this.ensure(7); this.doc.text(l, MX, this.y + 5); this.y += 7; });
    this.y += 2;
  }

  /** A section heading: 13 pt navy with a thin rule under it, 8 mm of air above. */
  section(text: string) {
    if (!this.atTop()) this.y += 8;
    this.keepWithNext(9);
    this.font(13, 'bold', COLORS.navy);
    const lines = this.doc.splitTextToSize(text, CW) as string[];
    lines.forEach(l => { this.doc.text(l, MX, this.y + 4.3); this.y += 5.6; });
    this.doc.setDrawColor(...rgb(COLORS.rule));
    this.doc.setLineWidth(0.3);
    this.doc.line(MX, this.y + 0.6, MX + CW, this.y + 0.6);
    this.y += 3.4;
  }

  /** A smaller bold navy line inside a section. */
  subheading(text: string) {
    this.keepWithNext(7);
    this.font(10.5, 'bold', COLORS.navy);
    const lines = this.doc.splitTextToSize(text, CW) as string[];
    lines.forEach(l => { this.ensure(LH); this.doc.text(l, MX, this.y + 3.6); this.y += LH; });
    this.y += 1;
  }

  paragraph(text: string, o: { bold?: boolean; italic?: boolean; size?: number; color?: string; indent?: number; gap?: number } = {}) {
    const size = o.size ?? 10.5;
    const style: Style = o.bold && o.italic ? 'bolditalic' : o.bold ? 'bold' : o.italic ? 'italic' : 'normal';
    const lh = size <= 9 ? 4 : LH;
    const lines = this.wrap(text, CW - (o.indent || 0), size, style);
    this.font(size, style, o.color || COLORS.ink);
    lines.forEach(l => {
      this.ensure(lh);
      this.doc.text(l, MX + (o.indent || 0), this.y + lh * 0.75);
      this.y += lh;
    });
    this.y += o.gap ?? 4;
  }

  bullet(text: string, o: { gap?: number } = {}) {
    const indent = 5;
    const lines = this.wrap(text, CW - indent, 10.5);
    this.font(10.5);
    lines.forEach((l, i) => {
      this.ensure(LH);
      if (i === 0) {
        this.doc.setFillColor(...rgb(COLORS.ink));
        this.doc.circle(MX + 1.6, this.y + 3.1, 0.5, 'F');
      }
      this.doc.text(l, MX + indent, this.y + LH * 0.75);
      this.y += LH;
    });
    this.y += o.gap ?? 1.4;
  }

  gap(mm: number) { this.y += mm; }

  // ── tables ─────────────────────────────────────────────────────────────
  private box(x: number, y: number, w: number, h: number, fill?: string) {
    this.doc.setDrawColor(...rgb(COLORS.border));
    this.doc.setLineWidth(0.18);
    if (fill) {
      this.doc.setFillColor(...rgb(fill));
      this.doc.rect(x, y, w, h, 'FD');
    } else {
      this.doc.rect(x, y, w, h, 'S');
    }
  }

  /** Keep a short table on one page when it fits on one. */
  private keepTable(total: number) {
    if (this.y + total > BOTTOM && total <= BOTTOM - TOP_NEXT) this.newPage();
  }

  /** Two columns: a Sky label cell and a white value cell. */
  details(rows: [string, string][]) {
    const labelW = 62;
    const valueW = CW - labelW;
    const prepared = rows.map(([label, value]) => {
      const ll = this.wrap(label, labelW - 5, 10, 'bold');
      const vl = this.wrap(value || '—', valueW - 5, 10.5);
      return { ll, vl, h: Math.max(7.6, Math.max(ll.length, vl.length) * LH + 3) };
    });
    this.keepTable(prepared.reduce((a, r) => a + r.h, 0));
    prepared.forEach(r => {
      this.ensure(r.h);
      this.box(MX, this.y, labelW, r.h, COLORS.sky);
      this.box(MX + labelW, this.y, valueW, r.h);
      this.font(10, 'bold', COLORS.navy);
      this.doc.text(r.ll, MX + 2.5, this.y + 4.9, { lineHeightFactor: LH / (10 * PT) });
      this.font(10.5);
      this.doc.text(r.vl, MX + labelW + 2.5, this.y + 4.9, { lineHeightFactor: LH / (10.5 * PT) });
      this.y += r.h;
    });
    this.y += 3;
  }

  private tickBox(cx: number, cy: number, ticked: boolean) {
    const s = 4.4;
    this.doc.setDrawColor(...rgb(ticked ? COLORS.navy : COLORS.border));
    this.doc.setLineWidth(ticked ? 0.35 : 0.3);
    this.doc.rect(cx - s / 2, cy - s / 2, s, s, 'S');
    if (ticked) {
      this.doc.setDrawColor(...rgb(COLORS.navy));
      this.doc.setLineWidth(0.55);
      this.doc.line(cx - 1.6, cy + 0.1, cx - 0.5, cy + 1.4);
      this.doc.line(cx - 0.5, cy + 1.4, cx + 1.8, cy - 1.6);
    }
  }

  /** Header row in navy; one row per use; the answer given is a ticked square, the other an empty one. */
  choices(headers: [string, string, string], rows: { label: string; answer: boolean | undefined }[]) {
    const yesW = 24, noW = 24, useW = CW - yesW - noW;
    const prepared = rows.map(r => {
      const lines = this.wrap(r.label, useW - 5, 10.5);
      return { ...r, lines, h: Math.max(9.5, lines.length * LH + 4.4) };
    });
    this.keepTable(8 + prepared.reduce((a, r) => a + r.h, 0));
    this.ensure(8 + (prepared[0]?.h || 9.5));
    this.doc.setFillColor(...rgb(COLORS.navy));
    this.doc.rect(MX, this.y, CW, 8, 'F');
    this.font(10, 'bold', '#FFFFFF');
    this.doc.text(headers[0], MX + 2.5, this.y + 5.4);
    this.doc.text(headers[1], MX + useW + yesW / 2, this.y + 5.4, { align: 'center' });
    this.doc.text(headers[2], MX + useW + yesW + noW / 2, this.y + 5.4, { align: 'center' });
    this.y += 8;
    prepared.forEach(r => {
      this.ensure(r.h);
      this.box(MX, this.y, useW, r.h);
      this.box(MX + useW, this.y, yesW, r.h);
      this.box(MX + useW + yesW, this.y, noW, r.h);
      this.font(10.5);
      this.doc.text(r.lines, MX + 2.5, this.y + 5.4, { lineHeightFactor: LH / (10.5 * PT) });
      const cy = this.y + r.h / 2;
      this.tickBox(MX + useW + yesW / 2, cy, r.answer === true);
      this.tickBox(MX + useW + yesW + noW / 2, cy, r.answer === false);
      this.y += r.h;
    });
    this.y += 4;
  }

  /** The signature box, then a Sky label row with the full name and the date and time. Kept on one page. */
  signature(opts: { image?: string | null; name: string; when: string; nameLabel?: string; whenLabel?: string }) {
    const boxH = 30, rowH = 9.5;
    this.ensure(boxH + rowH + 2);
    this.box(MX, this.y, CW, boxH);
    if (opts.image) {
      try {
        const p = this.doc.getImageProperties(opts.image);
        const maxW = 90, maxH = boxH - 6;
        let w = maxW, h = (p.height * w) / p.width;
        if (h > maxH) { h = maxH; w = (p.width * h) / p.height; }
        this.doc.addImage(opts.image, 'PNG', MX + 4, this.y + (boxH - h) / 2, w, h);
      } catch {
        this.font(9, 'italic', COLORS.grey);
        this.doc.text('[Signature image could not be shown]', MX + 4, this.y + 8);
      }
    } else {
      this.font(9.5, 'italic', COLORS.warn);
      this.doc.text('No digital signature on record.', MX + 4, this.y + 8);
    }
    this.y += boxH;
    const half = CW / 2;
    this.box(MX, this.y, half, rowH, COLORS.sky);
    this.box(MX + half, this.y, half, rowH, COLORS.sky);
    const l1 = (opts.nameLabel || 'Full name') + ':';
    const l2 = (opts.whenLabel || 'Date and time') + ':';
    this.font(10, 'bold', COLORS.navy);   // measure the labels in bold, then draw them
    const w1 = this.doc.getTextWidth(l1);
    const w2 = this.doc.getTextWidth(l2);
    this.doc.text(l1, MX + 2.5, this.y + 6);
    this.doc.text(l2, MX + half + 2.5, this.y + 6);
    this.font(10, 'normal', COLORS.ink);
    this.doc.text(opts.name || '—', MX + 2.5 + w1 + 2, this.y + 6, { maxWidth: half - 7 - w1 });
    this.doc.text(opts.when || '—', MX + half + 2.5 + w2 + 2, this.y + 6);
    this.y += rowH + 4;
  }

  /** A small table: Sky header cells with bold navy text. */
  simpleTable(headers: string[], rows: string[][], widths: number[]) {
    const prepared = rows.map(r => {
      const cells = r.map((c, i) => this.wrap(c || '—', widths[i] - 5, 10.5));
      return { cells, h: Math.max(8.5, Math.max(...cells.map(c => c.length)) * LH + 3.8) };
    });
    this.keepTable(8.5 + prepared.reduce((a, r) => a + r.h, 0));
    this.ensure(8.5 + (prepared[0]?.h || 8.5));
    let x = MX;
    headers.forEach((h, i) => {
      this.box(x, this.y, widths[i], 8.5, COLORS.sky);
      this.font(10, 'bold', COLORS.navy);
      this.doc.text(h, x + 2.5, this.y + 5.6);
      x += widths[i];
    });
    this.y += 8.5;
    prepared.forEach(r => {
      this.ensure(r.h);
      let cx = MX;
      r.cells.forEach((lines, i) => {
        this.box(cx, this.y, widths[i], r.h);
        this.font(10.5);
        this.doc.text(lines, cx + 2.5, this.y + 5.4, { lineHeightFactor: LH / (10.5 * PT) });
        cx += widths[i];
      });
      this.y += r.h;
    });
    this.y += 4;
  }

  // ── letterhead and footer on every page ───────────────────────────────
  finish(versionLine: string): jsPDF {
    const doc = this.doc;
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);

      if (p === 1) {
        const lw = 29, lh = (lw * LOGO_SIZE.h) / LOGO_SIZE.w;
        doc.addImage(LOGO_PNG, 'PNG', MX, 9, lw, lh);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(...rgb(COLORS.blue));
        const tagline = ['WHERE PASSION', 'MEETS PERFORMANCE'];
        const space = 0.9;
        tagline.forEach((line, i) => {
          const w = doc.getTextWidth(line) + space * (line.length - 1);
          doc.text(line, MX + CW - w, 21 + i * 7.2, { charSpace: space });
        });
        doc.setDrawColor(...rgb(COLORS.navy));
        doc.setLineWidth(1.5 * PT);
        doc.line(MX, 40, MX + CW, 40);
      } else {
        const lw = 13, lh = (lw * LOGO_SIZE.h) / LOGO_SIZE.w;
        doc.addImage(LOGO_PNG, 'PNG', MX, 8, lw, lh);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...rgb(COLORS.grey));
        doc.text('jflips.co.za', MX + CW, 15, { align: 'right' });
        doc.setDrawColor(...rgb(COLORS.rule));
        doc.setLineWidth(0.3);
        doc.line(MX, 24, MX + CW, 24);
      }

      // footer: rule, monogram, one centred line, then the versions and the page number
      doc.setDrawColor(...rgb(COLORS.rule));
      doc.setLineWidth(0.3);
      doc.line(MX, 270, MX + CW, 270);
      const mw = 14, mh = (mw * MONOGRAM_SIZE.h) / MONOGRAM_SIZE.w;
      doc.addImage(MONOGRAM_PNG, 'PNG', 40, 272.5, mw, mh);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...rgb(COLORS.grey));
      doc.text(FOOTER_LINE, 58, 272.5 + mh / 2 + 1);
      doc.setFontSize(7.5);
      doc.text(versionLine, MX, 288);
      doc.text(`Page ${p} of ${pages}`, MX + CW, 288, { align: 'right' });
    }
    return doc;
  }
}
