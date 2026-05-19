#!/usr/bin/env node
// Dependency-free PDF generator for the placeholder sample guide.
// Produces a clean, multi-page A4-ish PDF using the standard Helvetica fonts.
import { writeFileSync } from "node:fs";

const PAGE_W = 595.28; // A4 @ 72dpi
const PAGE_H = 841.89;
const MARGIN = 64;
const MAXW = PAGE_W - MARGIN * 2;

// Approx Helvetica advance widths (1000-unit em) — coarse but fine for a placeholder.
const W_REG = 0.52, W_BOLD = 0.56;
const charW = (s, size, bold) => s.length * size * (bold ? W_BOLD : W_REG);

function wrap(text, size, bold) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const trial = line ? line + " " + w : w;
    if (charW(trial, size, bold) > MAXW && line) {
      lines.push(line);
      line = w;
    } else line = trial;
  }
  if (line) lines.push(line);
  return lines;
}

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// Document model: a flat list of blocks rendered top-to-bottom with auto pagination.
const RULE = "#5a5247";
const ACCENT = "#c2410c";
const blocks = [
  { t: "cover" },
  { t: "h1", s: "How to use this guide" },
  { t: "p", s: "This is the 12-minute walkaround. Each section is a checkpoint you run through in order, before you ever talk price. You do not need tools. You need this list, a phone flashlight, and the discipline to walk away." },
  { t: "p", s: "Print this page or keep it open on your phone. Mark every checkpoint Pass, Note, or Fail. One Fail in the red-flag list means you stop and leave. Three Notes means you renegotiate, hard." },
  { t: "h2", s: "The order matters" },
  { t: "li", s: "Cold start first — always inspect before the engine is warm." },
  { t: "li", s: "Outside in daylight, never in a garage or after dark." },
  { t: "li", s: "Walkaround, then under the hood, then underneath, then the drive." },
  { t: "li", s: "Paperwork last — VIN, title, and service history before money." },
  { t: "pb" },

  { t: "h1", s: "Checkpoint 3 — Engine bay" },
  { t: "p", s: "Pop the hood with the engine stone cold. A seller who \"just ran it to warm it up\" is hiding a hard cold-start. Note it as a Fail until proven otherwise." },
  { t: "h2", s: "Look for" },
  { t: "li", s: "Oil cap underside — a creamy tan film means coolant in the oil. Walk away." },
  { t: "li", s: "Coolant color and level — rusty or oily coolant is a head-gasket flag." },
  { t: "li", s: "Belts and hoses — cracks, glazing, or soft spongy hoses." },
  { t: "li", s: "Leaks — lay a hand under the block and main seals; wet is a Note, dripping is a Fail." },
  { t: "li", s: "Fluids — brake fluid clarity, transmission fluid that is pink not brown or burnt-smelling." },
  { t: "li", s: "Recent over-cleaning — a spotless engine on a 120k-mile car is often hiding a fresh leak." },
  { t: "h2", s: "Then start it" },
  { t: "p", s: "Stand at the back. Blue smoke on start is burning oil. White smoke that does not clear is coolant. Black smoke is fuel. Listen for ticking that fades (lifters) versus a deep knock that does not (walk away)." },
  { t: "pb" },

  { t: "h1", s: "Red flags — stop and walk away" },
  { t: "p", s: "These are not negotiation points. They are exits. No price makes them worth it." },
  { t: "li", s: "Creamy residue on the oil cap or dipstick." },
  { t: "li", s: "Mismatched paint panels plus uneven panel gaps — prior structural repair." },
  { t: "li", s: "Fresh undercoating on a car the seller calls \"rust-free.\"" },
  { t: "li", s: "A VIN plate that looks disturbed, or a VIN that does not match the title." },
  { t: "li", s: "\"The check-engine light is just a sensor\" with no scan to prove it." },
  { t: "li", s: "Title in a name that is not the seller's, with no clean explanation." },
  { t: "h2", s: "What this guide gets you" },
  { t: "p", s: "The full edition expands every one of the 11 checkpoints with photos, the exact phrases to say to a seller, a printable score sheet, and the scripts for renegotiating once you have found something. You walk in knowing more than the person selling the car." },
  { t: "p", s: "— This is a sample. Replace this file with your final PDF before launch." },
];

// ---- layout / pagination ----
const pages = [];
let page = [];
let y = 0;
const startPage = () => { page = []; y = PAGE_H - MARGIN; };
const flush = () => { if (page.length) pages.push(page); };
const need = (h) => { if (y - h < MARGIN) { flush(); startPage(); } };

function text(str, x, yy, size, bold, color) {
  page.push(
    `BT /F${bold ? 2 : 1} ${size} Tf ${color ? colorOp(color) : "0.13 0.12 0.11 rg"} ` +
    `1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${esc(str)}) Tj ET`
  );
}
function colorOp(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${((n >> 16 & 255) / 255).toFixed(3)} ${((n >> 8 & 255) / 255).toFixed(3)} ${((n & 255) / 255).toFixed(3)} rg`;
}
function rect(x, yy, w, h, hex) {
  const n = parseInt(hex.slice(1), 16);
  page.push(`${((n >> 16 & 255) / 255).toFixed(3)} ${((n >> 8 & 255) / 255).toFixed(3)} ${((n & 255) / 255).toFixed(3)} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
}

startPage();
for (const b of blocks) {
  if (b.t === "cover") {
    rect(0, PAGE_H - 220, PAGE_W, 220, "#1a1714");
    rect(MARGIN, PAGE_H - 150, 46, 5, ACCENT);
    text("USED CAR", MARGIN, PAGE_H - 120, 40, true, "#f4efe7");
    text("INSPECTION GUIDE", MARGIN, PAGE_H - 168, 40, true, "#f4efe7");
    text("THE 12-MINUTE WALKAROUND THAT SAVES YOU THOUSANDS", MARGIN, PAGE_H - 200, 10, false, "#c9a36a");
    y = PAGE_H - 300;
    text("Sample edition", MARGIN, y, 13, true); y -= 22;
    for (const ln of wrap("You are about to spend thousands of dollars on a machine the seller knows better than you do. This guide closes that gap. Run the checkpoints in order. Trust the red flags. Be willing to walk away — that willingness is the whole skill.", 12, false)) {
      text(ln, MARGIN, y, 12, false); y -= 18;
    }
    y -= 8;
    rect(MARGIN, y, MAXW, 0.8, RULE); y -= 24;
    text("11 checkpoints   ·   printable score sheet   ·   seller scripts", MARGIN, y, 11, false, "#5a5247");
    flush(); startPage();
    continue;
  }
  if (b.t === "pb") { flush(); startPage(); continue; }
  if (b.t === "h1") {
    need(54);
    rect(MARGIN, y - 6, 34, 4, ACCENT); y -= 22;
    text(b.s, MARGIN, y, 24, true); y -= 30;
    continue;
  }
  if (b.t === "h2") {
    need(34); y -= 6;
    text(b.s, MARGIN, y, 14, true, "#3a342c"); y -= 22;
    continue;
  }
  if (b.t === "p") {
    const lines = wrap(b.s, 11.5, false);
    for (const ln of lines) { need(17); text(ln, MARGIN, y, 11.5, false); y -= 17; }
    y -= 8;
    continue;
  }
  if (b.t === "li") {
    const lines = wrap(b.s, 11.5, false);
    need(17);
    rect(MARGIN + 2, y + 3.5, 4, 4, ACCENT);
    text(lines[0], MARGIN + 18, y, 11.5, false); y -= 17;
    for (let i = 1; i < lines.length; i++) { need(17); text(lines[i], MARGIN + 18, y, 11.5, false); y -= 17; }
    y -= 3;
    continue;
  }
}
flush();

// ---- assemble PDF ----
const objs = [];
const add = (s) => { objs.push(s); return objs.length; };
const kidsRef = [];
const fontReg = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
let pagesObjNo = objs.length + 1; // reserve
add(""); // placeholder for Pages
for (const pg of pages) {
  const stream = pg.join("\n");
  const contentNo = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  const pageNo = add(
    `<< /Type /Page /Parent ${pagesObjNo} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
    `/Resources << /Font << /F1 ${fontReg} 0 R /F2 ${fontBold} 0 R >> >> ` +
    `/Contents ${contentNo} 0 R >>`
  );
  kidsRef.push(`${pageNo} 0 R`);
}
objs[pagesObjNo - 1] = `<< /Type /Pages /Count ${pages.length} /Kids [${kidsRef.join(" ")}] >>`;
const catalogNo = add(`<< /Type /Catalog /Pages ${pagesObjNo} 0 R >>`);

let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = [];
objs.forEach((body, i) => {
  offsets[i] = pdf.length;
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefPos = pdf.length;
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) pdf += String(off).padStart(10, "0") + " 00000 n \n";
pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogNo} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

const out = "/Users/yuki/Projects/personal/Coding/e-book/assets/used-car-inspection-guide.pdf";
writeFileSync(out, pdf, "latin1");
console.log(`Wrote ${out} — ${pages.length} pages, ${pdf.length} bytes`);
