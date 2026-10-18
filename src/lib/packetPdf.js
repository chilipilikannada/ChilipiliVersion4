// The printable packet as a real PDF (US Letter). Pages are drawn on a canvas, which shapes
// Kannada correctly, then placed into a PDF with pdf-lib.
import { ensureFont, layout, drawGlyph, fitRecord, centreDots, autoPath, PAD_FONT } from "./strokes.js";
import { storyPics } from "./storyPics.js";
import { LETTER_PIC, journeyOf, learnedBefore } from "./journey.js";
import { charsOf, canWrite, firstLetter } from "./writable.js";
import { TRACKS, KAG_GRID_CONS, LETTER_WORD, SOUND, tiles } from "./course.js";
import { voiceKey } from "./audio.js";
import { storyFor } from "./stories.js";

const PW = 1275, PH = 1650, M = 80; // 150 dpi, margins
const RED = "#c8102e", DEEP = "#8a0d1f", YEL = "#ffc72c", INK = "#2a0f0c", MUTE = "#7b5b52", LINE = "#d9c7a0", GHOST = "#d7d0c2";
const EN = (px, w = 700) => `${w} ${px}px Nunito, "${PAD_FONT}", Arial, sans-serif`;
const KN = (px) => `500 ${px}px ${PAD_FONT}, "Noto Sans Kannada", sans-serif`;
const shuffleSeeded = (a, seed) => { const b = [...a]; let s = seed || 1; for (let i = b.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function newPage() {
  const c = document.createElement("canvas"); c.width = PW; c.height = PH;
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, PW, PH);
  return { c, g, y: 0 };
}

function header(p, { child, week, n, title, sub, page, pages, school }) {
  const { g } = p;
  g.fillStyle = RED; g.fillRect(0, 0, PW, 110);
  g.fillStyle = YEL; g.fillRect(0, 110, PW, 10);
  g.fillStyle = "#fff"; g.font = EN(40, 800); g.textBaseline = "middle"; g.fillText(`${school || "Chili Pili"} · Kannada`, M, 56);
  g.textAlign = "right"; g.font = EN(28, 700); g.fillText(`Week ${week} · Packet ${n} · page ${page} of ${pages}`, PW - M, 56); g.textAlign = "left";
  g.fillStyle = INK; g.font = EN(38, 800); g.textBaseline = "alphabetic"; g.fillText(title, M, 188);
  if (sub) { g.fillStyle = MUTE; g.font = EN(24, 600); g.fillText(sub, M, 224); }
  g.fillStyle = INK; g.font = EN(24, 700);
  g.fillText(`Name: ${child.name || "______________________"}`, M, 268);
  g.fillText("Date: ______________", M + 620, 268);

}
function footer(p, text) {
  const { g } = p;
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.moveTo(M, PH - 80); g.lineTo(PW - M, PH - 80); g.stroke();
  g.fillStyle = MUTE; g.font = EN(20, 600); g.textBaseline = "alphabetic"; g.fillText(text, M, PH - 48);
}
function section(p, label) {
  const { g } = p;
  p.y += 12;
  g.fillStyle = "#fff4cf"; roundRect(g, M, p.y, PW - 2 * M, 46, 12); g.fill();
  g.fillStyle = DEEP; g.font = EN(24, 800); g.textBaseline = "middle"; g.fillText(label, M + 16, p.y + 24); g.textBaseline = "alphabetic";
  p.y += 64;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrap(g, text, x, y, maxW, lh) {
  const words = String(text).split(/\s+/); let line = "", yy = y;
  for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
  if (line) g.fillText(line, x, yy);
  return yy + lh;
}
// Handwriting lines: top, dashed middle, baseline.
function lines(p, count, h = 70) {
  const { g } = p;
  for (let i = 0; i < count; i++) {
    const y0 = p.y + i * (h + 16);
    g.strokeStyle = LINE; g.lineWidth = 2; g.setLineDash([]);
    g.beginPath(); g.moveTo(M, y0); g.lineTo(PW - M, y0); g.moveTo(M, y0 + h); g.lineTo(PW - M, y0 + h); g.stroke();
    g.setLineDash([8, 8]); g.strokeStyle = "#eadcb8"; g.beginPath(); g.moveTo(M, y0 + h / 2); g.lineTo(PW - M, y0 + h / 2); g.stroke(); g.setLineDash([]);
  }
  p.y += count * (h + 16) + 6;
}

// One tracing row: model (with the teacher's start dots), ghost letters, dotted outlines, empty boxes.
function traceRow(p, text, rec, easy = false) {
  const { g } = p;
  const L = layout(text);
  const avail = PW - 2 * M, gap = 12;
  const cols = [...text].length <= 3 ? (easy ? 6 : 8) : L.aspect > 2 ? 3 : 4;
  const bw = (avail - gap * (cols - 1)) / cols;
  const bh = cols >= 6 ? bw : Math.min(bw / L.aspect, 140);
  const H = Math.min(bw / L.aspect, bh);
  const kinds = cols === 6 ? ["model", "dots", "dots", "dots", "ghost", "empty"]
    : cols === 8 ? ["model", "ghost", "ghost", "dots", "dots", "empty", "empty", "empty"]
    : cols === 4 ? ["model", "dots", "ghost", "empty"] : ["model", "dots", "empty"];
  const recFit = rec ? fitRecord(rec, L) : null;
  const guide = recFit; // only the teacher's own strokes show a direction
  const dots = centreDots(L, recFit || autoPath(L), 0.06);
  kinds.forEach((k, i) => {
    const x = M + i * (bw + gap), ox = x + (bw - H * L.aspect) / 2, y = p.y, oy = y + (bh - H) / 2;
    g.fillStyle = k === "model" ? "#fff4cf" : "#fff"; roundRect(g, x, y, bw, bh, 12); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 2; roundRect(g, x, y, bw, bh, 12); g.stroke();
    g.setLineDash([6, 7]); g.strokeStyle = "#efe3c6"; g.beginPath(); g.moveTo(x + 6, y + bh / 2); g.lineTo(x + bw - 6, y + bh / 2); g.stroke(); g.setLineDash([]);
    if (k === "model") {
      const m = guide;
      drawGlyph(g, L, H, { fill: m ? "#f6d9de" : DEEP, ox, oy });
      if (m) {
        // the writing path: red line, arrowheads showing the way, numbered green starts
        m.strokes.forEach((s) => {
          g.strokeStyle = RED; g.lineWidth = Math.max(2.5, H * 0.028); g.lineCap = "round"; g.lineJoin = "round";
          g.beginPath(); s.forEach(([x0, y0], i) => (i ? g.lineTo(ox + x0 * H, oy + y0 * H) : g.moveTo(ox + x0 * H, oy + y0 * H))); g.stroke();
          let acc = 0;
          for (let i = 1; i < s.length; i++) {
            acc += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
            const last = i === s.length - 1;
            if (!(acc > 0.22 || (last && s.length > 3))) continue; acc = 0;
            const a = Math.atan2(s[i][1] - s[i - 1][1], s[i][0] - s[i - 1][0]), x = ox + s[i][0] * H, y = oy + s[i][1] * H, hl = Math.max(7, H * 0.075);
            g.fillStyle = RED; g.beginPath(); g.moveTo(x + Math.cos(a) * hl * 0.6, y + Math.sin(a) * hl * 0.6); g.lineTo(x - hl * Math.cos(a - 0.55), y - hl * Math.sin(a - 0.55)); g.lineTo(x - hl * Math.cos(a + 0.55), y - hl * Math.sin(a + 0.55)); g.closePath(); g.fill();
          }
        });
        m.strokes.forEach((s, j) => {
          const [sx, sy] = s[0];
          g.fillStyle = "#1f8a4c"; g.beginPath(); g.arc(ox + sx * H, oy + sy * H, Math.max(11, H * 0.085), 0, Math.PI * 2); g.fill();
          g.fillStyle = "#fff"; g.font = EN(Math.max(12, H * 0.09), 800); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(j + 1), ox + sx * H, oy + sy * H + 1); g.textAlign = "left"; g.textBaseline = "alphabetic";
        });
      }
    }
    if (k === "ghost") drawGlyph(g, L, H, { fill: GHOST, ox, oy });
    if (k === "dots") {
      drawGlyph(g, L, H, { fill: "#f3efe6", ox, oy });
      g.fillStyle = "#8f8676";
      for (const d of dots) { g.beginPath(); g.arc(ox + d.x * H, oy + d.y * H, Math.max(2.4, H * (easy ? 0.028 : 0.022)), 0, Math.PI * 2); g.fill(); }
      const f = dots.find((d) => d.first) || dots[0];
      if (f && recFit) { g.fillStyle = "#1f8a4c"; g.beginPath(); g.arc(ox + f.x * H, oy + f.y * H, Math.max(4, H * 0.04), 0, Math.PI * 2); g.fill(); }
    }
  });
  p.y += bh + 10;
  const word = LETTER_WORD[text];
  if (word || SOUND[text]) {
    let x = M + 4;
    if (LETTER_PIC[text]) { g.font = `30px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; g.fillText(LETTER_PIC[text], x, p.y + 22); x += 44; }
    g.fillStyle = MUTE; g.font = EN(22, 600);
    const s1 = `${SOUND[text] ? `"${SOUND[text]}"` : ""}  as in `;
    g.fillText(word ? s1 : `"${SOUND[text]}"`, x, p.y + 18);
    if (word) { x += g.measureText(s1).width; g.font = KN(26); g.fillStyle = DEEP; g.fillText(word[0], x, p.y + 20); x += g.measureText(word[0]).width + 8; g.font = EN(22, 600); g.fillStyle = MUTE; g.fillText(`(${word[1]}, ${word[2]})`, x, p.y + 18); }
    p.y += 34;
  }
  p.y += 16;
}

function kagGrid(p, signs) {
  const { g } = p;
  const cols = 1 + signs.length, rows = KAG_GRID_CONS.length;
  const cw = Math.min(130, (PW - 2 * M) / cols), ch = 64;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = M + c * cw, y = p.y + r * ch;
    g.strokeStyle = LINE; g.lineWidth = 2; g.strokeRect(x, y, cw, ch);
    const t = c === 0 ? KAG_GRID_CONS[r] : KAG_GRID_CONS[r] + signs[c - 1];
    if (c === 0 || r < 2) { g.fillStyle = c === 0 ? DEEP : INK; g.font = KN(34); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, x + cw / 2, y + ch / 2 + 2); g.textAlign = "left"; g.textBaseline = "alphabetic"; }
  }
  p.y += rows * ch + 20;
}

function wordTiles(p, words) {
  const { g } = p;
  g.font = KN(32);
  let x = M;
  for (const w of words) {
    const tw = g.measureText(w).width + 36;
    if (x + tw > PW - M) { x = M; p.y += 66; }
    g.fillStyle = "#fff4cf"; roundRect(g, x, p.y, tw, 54, 12); g.fill(); g.strokeStyle = "#e0a100"; g.lineWidth = 2; g.setLineDash([6, 5]); roundRect(g, x, p.y, tw, 54, 12); g.stroke(); g.setLineDash([]);
    g.fillStyle = INK; g.textBaseline = "middle"; g.fillText(w, x + 18, p.y + 29); g.textBaseline = "alphabetic";
    x += tw + 14;
  }
  p.y += 70;
}

const room = (p, need) => p.y + need < PH - 110;

// "Find and circle": a grid of letters with this week's letters mixed in.
function findPage(p, targets, pool, seed) {
  const { g } = p;
  const cols = 8, rows = 6, cw = (PW - 2 * M) / cols, ch = 104;
  const colours = ["red", "blue", "green", "orange"];
  g.fillStyle = INK; g.font = EN(24, 700);
  g.fillText(targets.slice(0, 4).map((t, i) => `${t} = ${colours[i]}`).join("     "), M + 4, p.y + 6);
  p.y += 30;
  let s = seed || 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const others = pool.filter((x) => !targets.includes(x));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const t = rnd() < 0.45 ? targets[Math.floor(rnd() * Math.min(4, targets.length))] : others[Math.floor(rnd() * others.length)] || targets[0];
    g.fillStyle = INK; g.font = KN(52); g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(t, M + c * cw + cw / 2, p.y + r * ch + ch / 2); g.textAlign = "left"; g.textBaseline = "alphabetic";
  }
  p.y += rows * ch + 10;
}

export async function packetPdf({ child, pk, strokeLib = {}, school, easy = false }) {
  await ensureFont();
  try { await document.fonts.load(EN(20)); } catch {}
  const { PDFDocument } = await import("pdf-lib");
  const P = pk.pattern, U = pk.unit, track = pk.track, T = TRACKS[track];
  const pages = [];
  const meta = { child, week: pk.week, n: pk.n, school };

  // ---- Page: letters ----
  const items = [...(U.items || [])];
  const perPage = easy ? 5 : 6;
  for (let s = 0; s < Math.max(1, items.length); s += perPage) {
    const p = newPage(); pages.push(p);
    p.meta = { title: `Letters: ${U.en}`, sub: `${T.icon} ${T.en} path · trace the light letters, then write on your own.` };
    p.y = 290;
    section(p, s === 0 ? "1  Trace and write" : "1  Trace and write (continued)");
    for (const t of items.slice(s, s + perPage)) { if (!room(p, easy ? 240 : 190)) break; traceRow(p, t, strokeLib[voiceKey(t)], easy); }
    if (U.tip && room(p, 60)) { p.g.fillStyle = INK; p.g.font = EN(22, 600); p.y = wrap(p.g, `Tip: ${U.tip}`, M, p.y + 10, PW - 2 * M, 30); }
    if (s + perPage >= items.length && U.kind === "signs" && room(p, 300)) { section(p, "2  Fill in the vowel-sign grid"); kagGrid(p, U.signs); }
  }
  if (U.kind === "signs" && pages[pages.length - 1].y > PH - 400) {
    const p = newPage(); pages.push(p); p.meta = { title: "Vowel signs grid", sub: "Fill in every empty box." }; p.y = 290;
    section(p, "2  Fill in the vowel-sign grid"); kagGrid(p, U.signs);
  }
  // Letters this child has been taught so far: only words made of these are given for writing.
  let have; try { const j = journeyOf(child); have = charsOf([...learnedBefore(j.day), ...(j.lesson ? j.lesson.items : []), ...(U.items || [])]); } catch { have = charsOf(U.items || []); }
  const okWords = (U.words || []).filter((w) => canWrite(w, have));
  if (okWords.length) {
    const last = pages[pages.length - 1];
    if (room(last, 260)) { section(last, "Words to write"); for (const w of okWords.slice(0, 2)) traceRow(last, w, strokeLib[voiceKey(w)]); }
  }

  // ---- Page: find the letters, and a second tracing round (more practice for the week) ----
  if (U.kind === "letters" || easy) {
    const p = newPage(); pages.push(p);
    p.meta = { title: "Find and practise", sub: "A little every day: colour the letters you find, then trace them once more." };
    p.y = 290;
    const targets = (U.items || []).filter((t) => [...t].length <= 2);
    if (targets.length) {
      section(p, "Find and circle each letter in its colour");
      const pool = ["ಅ", "ಆ", "ಇ", "ಈ", "ಉ", "ಊ", "ಎ", "ಏ", "ಒ", "ಓ", "ಕ", "ಗ", "ಚ", "ಜ", "ಟ", "ಡ", "ತ", "ದ", "ನ", "ಪ", "ಬ", "ಮ", "ಯ", "ರ", "ಲ", "ವ", "ಸ", "ಹ", "ಳ"];
      findPage(p, targets.slice(0, 4), pool, pk.week * 13 + 5);
    }
    section(p, "Trace again, then write from memory");
    for (const t of (U.items || []).slice(0, 3)) { if (!room(p, 240)) break; traceRow(p, t, strokeLib[voiceKey(t)], true); }
  }

  // ---- Page: words of the week (picture, word, trace, copy) ----
  if (pk.theme) {
    const p = newPage(); pages.push(p);
    const anyWrite = pk.theme.words.slice(0, 6).some(([kn]) => canWrite(kn, have));
    p.meta = { title: `Words of the week: ${pk.theme.en}`, sub: anyWrite ? `${pk.theme.kn} · say each word, trace it, then write it on the line.` : `${pk.theme.kn} · say each word out loud. Trace the letter you know, and circle it in the word.` };
    p.y = 290;
    const g = p.g;
    section(p, "Look, say, trace and write");
    const rowH = 190;
    for (const [kn, rom, en, pic] of pk.theme.words.slice(0, 6)) {
      if (!room(p, rowH)) break;
      const y = p.y;
      g.strokeStyle = LINE; g.lineWidth = 2; roundRect(g, M, y, PW - 2 * M, rowH - 16, 16); g.stroke();
      g.font = `110px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; g.textBaseline = "middle"; g.textAlign = "center";
      g.fillStyle = INK; g.fillText(pic, M + 90, y + (rowH - 16) / 2 + 4); g.textAlign = "left";
      g.font = KN(58); g.fillStyle = DEEP; g.fillText(kn, M + 190, y + 62);
      const writable = canWrite(kn, have);
      let first = firstLetter(kn); if (!canWrite(first, have)) first = [...kn][0];
      const gx = M + 190 + Math.max(260, g.measureText(kn).width + 60);
      if (writable) {
        g.font = KN(58); g.fillStyle = "#e3dccd"; g.fillText(kn, gx, y + 62);
      } else if (canWrite(first, have)) {
        // not all its letters are taught yet: trace just the first one
        g.font = KN(58); g.fillStyle = "#e3dccd"; g.fillText(first, gx, y + 62);
        g.textBaseline = "alphabetic"; g.fillStyle = MUTE; g.font = EN(20, 700); g.fillText(`starts with ${first}`, gx, y + 128); g.textBaseline = "middle";
      }
      g.textBaseline = "alphabetic"; g.fillStyle = MUTE; g.font = EN(22, 700); g.fillText(`${rom} · ${en}`, M + 190, y + 128);
      if (writable) {
        g.strokeStyle = LINE; g.beginPath(); g.moveTo(M + 700, y + 140); g.lineTo(PW - M - 24, y + 140); g.stroke();
        g.setLineDash([6, 6]); g.strokeStyle = "#eadcb8"; g.beginPath(); g.moveTo(M + 700, y + 100); g.lineTo(PW - M - 24, y + 100); g.stroke(); g.setLineDash([]);
      }
      p.y += rowH;
    }
  }

  // ---- Page: sentences ----
  {
    const p = newPage(); pages.push(p);
    p.meta = { title: `Sentences: ${P.en}`, sub: `${P.kn} · ${P.focus}` };
    p.y = 290;
    const g = p.g;
    section(p, "Read these aloud");
    for (const [kn, rom, en] of P.model) {
      g.fillStyle = INK; g.font = KN(30); g.fillText(kn, M + 8, p.y + 26);
      g.fillStyle = MUTE; g.font = EN(19, 600); g.fillText(`${rom}  ·  ${en}`, M + 8, p.y + 52);
      p.y += 66;
    }
    section(p, "Put the words in order, then write the sentence");
    const builds = track === "start" ? P.build.slice(0, 2) : P.build;
    builds.forEach(([kn, en], i) => {
      if (!room(p, 190)) return;
      g.fillStyle = MUTE; g.font = EN(20, 700); g.fillText(`${i + 1}. ${en}`, M, p.y + 4); p.y += 16;
      wordTiles(p, shuffleSeeded(tiles(kn), pk.week * 7 + i + 3));
      p.y -= 6; lines(p, 1, 58);
    });
    if (room(p, 200)) {
      section(p, "Fill the gap");
      const bank = [...new Set(P.blanks.map((b) => b[1]))];
      g.fillStyle = MUTE; g.font = EN(20, 700); g.fillText("Word box:", M, p.y + 8); p.y += 20; wordTiles(p, shuffleSeeded(bank, pk.week));
      for (const [t] of P.blanks) { if (!room(p, 44)) break; g.fillStyle = INK; g.font = KN(30); g.fillText(t.replace("___", "______________"), M + 8, p.y + 28); p.y += 52; }
    }
  }

  // ---- Page: longer sentences, your turn, dictation ----
  {
    const p = newPage(); pages.push(p);
    p.meta = { title: track === "start" ? "Your turn" : "Longer sentences", sub: track === "start" ? "Draw, say it, then copy a sentence." : "Make sentences longer, then write your own." };
    p.y = 290;
    const g = p.g;
    if (track !== "start") {
      section(p, "Make it longer: copy each step, adding the new words");
      P.ladder.forEach(([kn, en], i) => {
        if (i === 0) { g.fillStyle = INK; g.font = KN(32); g.fillText(`${kn}`, M + 8, p.y + 26); g.fillStyle = MUTE; g.font = EN(20, 600); g.fillText(en, M + 8, p.y + 54); p.y += 92; return; }
        if (!room(p, 120)) return;
        const prev = new Set(tiles(P.ladder[i - 1][0])); const add = tiles(kn).filter((w) => !prev.has(w));
        g.fillStyle = MUTE; g.font = EN(20, 700); g.fillText(`Step ${i + 1}: add `, M, p.y + 4);
        g.font = KN(26); g.fillStyle = DEEP; g.fillText(add.join("  "), M + 120, p.y + 4); p.y += 16;
        lines(p, 1, 60);
      });
    } else {
      section(p, "Draw it, say it to a grown-up, then copy the sentence");
      g.strokeStyle = LINE; g.lineWidth = 2; roundRect(g, M, p.y, PW - 2 * M, 360, 18); g.stroke(); p.y += 380;
      g.fillStyle = INK; g.font = KN(34); g.fillText(P.model[0][0], M + 8, p.y + 20); p.y += 44;
      lines(p, 2, 70);
    }
    const prompt = P.prompts[track] || P.prompts.long || P.prompts.write;
    if (room(p, 200)) {
      section(p, "Your turn");
      g.fillStyle = INK; g.font = EN(24, 700); p.y = wrap(g, prompt, M + 4, p.y + 8, PW - 2 * M - 8, 32) + 4;
      const want = track === "long" ? 8 : track === "write" ? 5 : 2;
      const fit = Math.max(1, Math.min(want, Math.floor((PH - 130 - p.y - (track === "start" ? 0 : 260)) / 76)));
      lines(p, fit, 60);
    }
    if (track !== "start" && room(p, 200)) {
      section(p, "Dictation: a grown-up reads, you write");
      lines(p, Math.min(P.dictation.length, 3), 60);
    }
  }

  // ---- Picture story to read together (younger tracks) ----
  if (track !== "long") {
    const st = storyFor(pk.n), pics = storyPics(st);
    const p = newPage(); pages.push(p);
    p.meta = { title: `Story time: ${st.en}`, sub: "A grown-up reads the Kannada, the child points at the pictures and says what's happening." };
    p.y = 290;
    const g = p.g;
    g.font = KN(40); g.fillStyle = DEEP; g.fillText(st.kn, M, p.y + 30); p.y += 60;
    const rowH = Math.min(150, Math.floor((PH - 140 - p.y) / st.lines.length));
    st.lines.forEach((l, i) => {
      const y = p.y;
      g.fillStyle = i % 2 ? "#fffaf0" : "#fff4cf"; roundRect(g, M, y, PW - 2 * M, rowH - 10, 16); g.fill();
      g.font = `${Math.round(rowH * 0.42)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; g.textBaseline = "middle"; g.fillStyle = INK;
      g.fillText(pics[i] || st.pic, M + 16, y + (rowH - 10) / 2 + 2); g.textBaseline = "alphabetic";
      const tx = M + 300;
      g.fillStyle = INK; g.font = KN(28); wrap(g, l, tx, y + 44, PW - M - tx - 12, 36);
      g.fillStyle = "#1d5fa8"; g.font = EN(20, 700); g.fillText(st.en_lines[i], tx, y + rowH - 26);
      p.y += rowH;
    });
  }

  // ---- Big writers: the week's story, questions and your own story ----
  if (track === "long") {
    const st = storyFor(pk.n);
    const p = newPage(); pages.push(p);
    p.meta = { title: `Story: ${st.en}`, sub: `${st.kn} · read it aloud twice, answer, then write your own.` };
    p.y = 290;
    const g = p.g;
    section(p, "Read the story aloud");
    g.fillStyle = INK; g.font = KN(30);
    for (const l of st.lines) { if (!room(p, 50)) break; p.y = wrap(g, l, M + 8, p.y + 30, PW - 2 * M - 16, 44) - 14; }
    p.y += 20;
    section(p, "Answer in full sentences");
    st.q.forEach(([q], i) => {
      if (!room(p, 150)) return;
      g.fillStyle = INK; g.font = KN(28); g.fillText(`${i + 1}. ${q}`, M + 8, p.y + 24); p.y += 36;
      lines(p, 1, 58);
    });
    const p2 = newPage(); pages.push(p2);
    p2.meta = { title: "Write your own story", sub: st.write };
    p2.y = 290;
    section(p2, "Words you can use");
    wordTiles(p2, [...st.bank, ...st.words.map((w) => w[0])]);
    section(p2, "My story");
    p2.g.fillStyle = INK; p2.g.font = EN(22, 700); p2.g.fillText("Title: ________________________________", M + 4, p2.y + 20); p2.y += 44;
    lines(p2, Math.floor((PH - 130 - p2.y) / 76), 60);
  }

  // ---- Grown-ups' page ----
  {
    const p = newPage(); pages.push(p);
    p.meta = { title: "For grown-ups", sub: "Keep this page. It's the answers and how to help this week." };
    p.y = 290;
    const g = p.g;
    section(p, "This week, about 15 minutes a day");
    g.fillStyle = INK; g.font = EN(23, 600);
    for (const k of ["writing", "reading", "speaking"]) {
      const tk = pk.tasks[k];
      g.font = EN(24, 800); g.fillText(`${k[0].toUpperCase() + k.slice(1)}: ${tk.title}`, M, p.y + 6); p.y += 34;
      g.font = EN(22, 600);
      for (const s of tk.steps) p.y = wrap(g, `•  ${s}`, M + 12, p.y + 4, PW - 2 * M - 24, 30);
      p.y += 8;
    }
    if (track !== "start") {
      section(p, "Dictation: read each sentence slowly, twice");
      P.dictation.forEach((d, i) => { g.fillStyle = INK; g.font = KN(30); g.fillText(`${i + 1}.  ${d}`, M + 8, p.y + 26); p.y += 50; });
    }
    section(p, "Answers");
    g.fillStyle = INK;
    P.build.forEach(([kn, en]) => { g.font = KN(28); g.fillText(kn, M + 8, p.y + 24); g.fillStyle = MUTE; g.font = EN(20, 600); g.fillText(en, M + 620, p.y + 24); g.fillStyle = INK; p.y += 44; });
    P.blanks.forEach(([t, a]) => { g.font = KN(28); g.fillText(t.replace("___", a), M + 8, p.y + 24); p.y += 44; });
    if (track !== "start") { g.font = KN(26); p.y = wrap(g, P.ladder[P.ladder.length - 1][0], M + 8, p.y + 26, PW - 2 * M - 16, 40); }
    p.y += 10;
    section(p, "Hand it in");
    g.fillStyle = INK; g.font = EN(22, 600);
    p.y = wrap(g, "Take a photo of each finished page (or scan them to one PDF) and hand it in from the Packets page in the app. Your teacher replies there.", M + 4, p.y + 8, PW - 2 * M - 8, 30);
  }

  const doc = await PDFDocument.create();
  doc.setTitle(`${school || "Chili Pili"} Kannada · Week ${pk.week} · ${child.name}`);
  doc.setAuthor(school || "Chili Pili");
  pages.forEach((p, i) => {
    header(p, { ...meta, ...p.meta, page: i + 1, pages: pages.length });
    footer(p, i === pages.length - 1 ? "Chili Pili · ಚಿಲಿಪಿಲಿ ಕನ್ನಡ" : "Trace slowly and say each sound. Snap a photo in the app whenever a page is done.");
  });
  for (const p of pages) {
    const url = p.c.toDataURL("image/jpeg", 0.86);
    const img = await doc.embedJpg(url);
    const page = doc.addPage([612, 792]);
    page.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
  }
  return await doc.save();
}

export const packetFileName = (child, week) => `ChiliPili-week-${week}-${String(child.name || "packet").trim().split(/\s+/)[0].replace(/[^\w-]/g, "") || "packet"}.pdf`;

// ---------- Grown-ups' workbook: speaking first, letters on paper ----------
// Part 1: every course phrase on fridge-friendly sheets (Kannada, how to say it, English).
// Part 2: the alphabet to trace with a pen, with the writing path, a picture word and the sound.
const VOWELS = ["ಅ", "ಆ", "ಇ", "ಈ", "ಉ", "ಊ", "ಎ", "ಏ", "ಐ", "ಒ", "ಓ", "ಔ"];
const CONSONANTS = ["ಕ", "ಖ", "ಗ", "ಘ", "ಚ", "ಛ", "ಜ", "ಝ", "ಟ", "ಠ", "ಡ", "ಢ", "ಣ", "ತ", "ಥ", "ದ", "ಧ", "ನ", "ಪ", "ಫ", "ಬ", "ಭ", "ಮ", "ಯ", "ರ", "ಲ", "ವ", "ಶ", "ಷ", "ಸ", "ಹ", "ಳ"];

export async function adultWorkbookPdf({ child = {}, units = [], levels = [], strokeLib = {}, school, part = "all", unit = null }) {
  await ensureFont();
  try { await document.fonts.load(EN(20)); } catch {}
  const { PDFDocument } = await import("pdf-lib");
  const pages = [];
  const phraseRow = (p, kn, rom, en, big = false) => {
    const g = p.g;
    g.fillStyle = INK; g.font = KN(big ? 36 : 30); g.fillText(kn, M + 12, p.y + (big ? 32 : 26));
    g.fillStyle = MUTE; g.font = EN(big ? 22 : 19, 600); g.fillText(rom, M + 12, p.y + (big ? 62 : 52));
    g.fillStyle = "#1d5fa8"; g.font = EN(big ? 22 : 20, 700); g.textAlign = "right"; g.fillText(en, PW - M - 8, p.y + (big ? 32 : 26)); g.textAlign = "left";
    g.strokeStyle = "#f0e6cf"; g.lineWidth = 1; g.beginPath(); g.moveTo(M, p.y + (big ? 74 : 62)); g.lineTo(PW - M, p.y + (big ? 74 : 62)); g.stroke();
    p.y += big ? 82 : 68;
  };

  // This week's lesson: phrases, the conversation, and practice lines to write
  if (part === "lesson" && unit) {
    const p = newPage(); pages.push(p);
    p.meta = { title: `Lesson ${units.indexOf(unit) + 1}: ${unit.en}`, sub: `${unit.kn} · ${unit.goal}` }; p.y = 290;
    section(p, "Say these out loud, three times each");
    for (const [kn, rom, en] of unit.phrases) { if (!room(p, 84)) break; phraseRow(p, kn, rom, en, true); }
    const p2 = newPage(); pages.push(p2);
    p2.meta = { title: `Lesson ${units.indexOf(unit) + 1}: the conversation`, sub: "Read it with your partner. Then swap parts." }; p2.y = 290;
    section(p2, "Conversation");
    const g = p2.g;
    for (const [who, kn, rom, en] of unit.dialogue) {
      if (!room(p2, 110)) break;
      const them = who === "them";
      g.fillStyle = them ? "#fde3e3" : "#e8f1fb"; roundRect(g, them ? M : M + 120, p2.y, PW - 2 * M - 120, 96, 16); g.fill();
      const x = (them ? M : M + 120) + 16;
      g.fillStyle = them ? RED : "#1d5fa8"; g.font = EN(18, 800); g.fillText(them ? "THEM" : "YOU", x, p2.y + 24);
      g.fillStyle = INK; g.font = KN(28); g.fillText(kn, x + 70, p2.y + 30);
      g.fillStyle = MUTE; g.font = EN(18, 600); g.fillText(`${rom}  ·  ${en}`, x + 70, p2.y + 70);
      p2.y += 108;
    }
    if (unit.note && room(p2, 120)) { section(p2, "Good to know"); g.fillStyle = INK; g.font = EN(22, 600); p2.y = wrap(g, unit.note, M + 8, p2.y + 10, PW - 2 * M - 16, 30); }
  }

  // Conversation cards: every lesson's dialogue as a two-part script to act out
  if (part === "cards") {
    for (let i = 0; i < units.length; i += 2) {
      const p = newPage(); pages.push(p);
      p.meta = { title: `Conversation cards · lessons ${i + 1}${units[i + 1] ? ` and ${i + 2}` : ""}`, sub: "Your partner reads THEM, you answer as YOU. Then swap. Cut along the lines to make cards." }; p.y = 290;
      const g = p.g;
      for (const u of units.slice(i, i + 2)) {
        const top = p.y;
        g.setLineDash([10, 8]); g.strokeStyle = "#c9b98f"; g.lineWidth = 2; roundRect(g, M - 10, top - 6, PW - 2 * M + 20, 590, 18); g.stroke(); g.setLineDash([]);
        g.fillStyle = DEEP; g.font = EN(26, 800); g.fillText(`${u.icon || ""} ${units.indexOf(u) + 1}. ${u.en}`, M + 8, p.y + 30);
        g.font = KN(24); g.fillText(u.kn, M + 8 + g.measureText(`${u.icon || ""} ${units.indexOf(u) + 1}. ${u.en}`).width + 70, p.y + 30);
        p.y += 50;
        for (const [who, kn, rom, en] of u.dialogue.slice(0, 7)) {
          const them = who === "them";
          g.fillStyle = them ? RED : "#1d5fa8"; g.font = EN(16, 800); g.fillText(them ? "THEM" : "YOU", M + 8, p.y + 24);
          g.fillStyle = INK; g.font = KN(25); g.fillText(kn, M + 80, p.y + 24);
          g.fillStyle = MUTE; g.font = EN(16, 600); g.fillText(`${rom} · ${en}`, M + 80, p.y + 50);
          p.y += 70;
        }
        p.y = top + 610;
      }
    }
  }

  // Fridge sheet: the 40 phrases that get used most, on one page
  if (part === "fridge") {
    const p = newPage(); pages.push(p);
    p.meta = { title: "The fridge sheet", sub: "The phrases you'll use most at home. Stick it where you'll see it every day." }; p.y = 280;
    const g = p.g, picks = units.slice(0, 20).flatMap((u) => u.phrases.slice(0, 2)).slice(0, 40);
    const colW = (PW - 2 * M - 24) / 2, rowH = 64;
    picks.forEach(([kn, rom, en], i) => {
      const col = i < 20 ? 0 : 1, row = i % 20, x = M + col * (colW + 24), y = p.y + row * rowH;
      g.fillStyle = row % 2 ? "#fffaf0" : "#fff4cf"; roundRect(g, x, y, colW, rowH - 6, 10); g.fill();
      g.fillStyle = INK; g.font = KN(24); g.fillText(kn, x + 10, y + 26);
      g.fillStyle = MUTE; g.font = EN(15, 600); g.fillText(`${rom} · ${en}`.slice(0, 64), x + 10, y + 49);
    });
  }

  // Cover: how to use it
  if (part === "all" || part === "phrases" || part === "letters") {
    const p = newPage(); pages.push(p); p.meta = { title: "Your Kannada workbook", sub: "Talk first. Letters when you feel like it." }; p.y = 300;
    const g = p.g;
    section(p, "How to use this");
    g.fillStyle = INK; g.font = EN(26, 600);
    for (const t of [
      "1.  Pick one phrase page a week. Stick it on the fridge or by the coffee machine.",
      "2.  Say each phrase out loud three times. Then use one on your partner or family that day, even if it's wrong. They will love it.",
      "3.  The grey line under each phrase tells you how to say it: aa = long a, ee = long e, T and D = tongue curled back.",
      "4.  Letters are optional. When you're ready, trace one row a day with a pen. Where a letter has a green dot and arrows, follow them.",
      "5.  Hear every phrase in the app (tap the speaker), and record yourself to compare.",
    ]) p.y = wrap(g, t, M + 8, p.y + 10, PW - 2 * M - 16, 38) + 8;
    p.y += 20;
    section(p, "Your first five");
    const first = (units[0] && units[0].phrases.slice(0, 5)) || [];
    for (const [kn, rom, en] of first) {
      g.fillStyle = DEEP; g.font = KN(40); g.fillText(kn, M + 12, p.y + 40);
      g.fillStyle = MUTE; g.font = EN(24, 700); g.fillText(`${rom}  ·  ${en}`, M + 12, p.y + 78);
      p.y += 104;
    }
  }

  // Part 1: phrase sheets, two lessons a page
  if (part === "all" || part === "phrases") {
    for (let i = 0; i < units.length; i += 2) {
      const p = newPage(); pages.push(p);
      const lv = levels.find((l) => l.n === units[i].level);
      p.meta = { title: `Phrases to say · lessons ${i + 1}${units[i + 1] ? ` and ${i + 2}` : ""}`, sub: `${lv ? lv.en + " · " : ""}${units[i].en}${units[i + 1] ? `, ${units[i + 1].en}` : ""} · say them out loud, then use one today` };
      p.y = 290;
      const g = p.g;
      for (const u of units.slice(i, i + 2)) {
        section(p, `${units.indexOf(u) + 1}.  ${u.en}   ${u.kn}`);
        g.textBaseline = "alphabetic";
        for (const [kn, rom, en] of u.phrases) {
          if (!room(p, 64)) break;
          g.fillStyle = INK; g.font = KN(30); g.fillText(kn, M + 12, p.y + 26);
          g.fillStyle = MUTE; g.font = EN(19, 600); g.fillText(rom, M + 12, p.y + 52);
          g.fillStyle = "#1d5fa8"; g.font = EN(20, 700); g.textAlign = "right"; g.fillText(en, PW - M - 8, p.y + 26); g.textAlign = "left";
          g.strokeStyle = "#f0e6cf"; g.lineWidth = 1; g.beginPath(); g.moveTo(M, p.y + 62); g.lineTo(PW - M, p.y + 62); g.stroke();
          p.y += 68;
        }
        p.y += 10;
      }
    }
  }

  // Part 2: letters to trace
  if (part === "all" || part === "letters") {
    for (const [name, list] of [["Vowels  ಸ್ವರಗಳು", VOWELS], ["Consonants  ವ್ಯಂಜನಗಳು", CONSONANTS]]) {
      for (let s = 0; s < list.length; s += 6) {
        const p = newPage(); pages.push(p);
        p.meta = { title: `Letters to trace: ${name.split("  ")[0].toLowerCase()}`, sub: "Trace over the dots and say the sound as you write. Follow the arrows where shown." };
        p.y = 290;
        section(p, s === 0 ? name : `${name} (continued)`);
        for (const t of list.slice(s, s + 6)) { if (!room(p, 190)) break; traceRow(p, t, strokeLib[voiceKey(t)], false); }
      }
    }
  }

  const doc = await PDFDocument.create();
  doc.setTitle(`${school || "Chili Pili"} Kannada · Grown-ups' workbook${child.name ? " · " + child.name : ""}`);
  doc.setAuthor(school || "Chili Pili");
  pages.forEach((p, i) => {
    adultHeader(p, { ...p.meta, page: i + 1, pages: pages.length, school, name: child.name });
    footer(p, "Chili Pili · ಚಿಲಿಪಿಲಿ ಕನ್ನಡ · speak a little every day");
  });
  for (const p of pages) {
    const img = await doc.embedJpg(p.c.toDataURL("image/jpeg", 0.86));
    const page = doc.addPage([612, 792]);
    page.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
  }
  return await doc.save();
}
function adultHeader(p, { title, sub, page, pages, school, name }) {
  const { g } = p;
  g.fillStyle = RED; g.fillRect(0, 0, PW, 110);
  g.fillStyle = YEL; g.fillRect(0, 110, PW, 10);
  g.fillStyle = "#fff"; g.font = EN(40, 800); g.textBaseline = "middle"; g.fillText(`${school || "Chili Pili"} · Kannada`, M, 56);
  g.textAlign = "right"; g.font = EN(26, 700); g.fillText(`page ${page} of ${pages}`, PW - M, 56); g.textAlign = "left";
  g.fillStyle = INK; g.font = EN(38, 800); g.textBaseline = "alphabetic"; g.fillText(title, M, 188);
  if (sub) { g.fillStyle = MUTE; g.font = EN(24, 600); g.fillText(sub, M, 224); }
  if (name) { g.fillStyle = INK; g.font = EN(24, 700); g.fillText(`Name: ${name}`, M, 268); }
}
export const workbookFileName = (child) => `ChiliPili-grown-up-workbook${child && child.name ? "-" + String(child.name).trim().split(/\s+/)[0].replace(/[^\w-]/g, "") : ""}.pdf`;

// ---------- Real-life phrase packs: one pack a page, plus its practice conversation ----------
export async function packsPdf({ packs = [], school }) {
  await ensureFont();
  try { await document.fonts.load(EN(20)); } catch {}
  const { PDFDocument } = await import("pdf-lib");
  const pages = [];
  for (const pk of packs) {
    const p = newPage(); pages.push(p);
    p.meta = { title: `${pk.en}`, sub: `${pk.kn} · ${pk.goal}` }; p.y = 270;
    const g = p.g;
    g.font = `64px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; g.textAlign = "right"; g.fillText(pk.icon, PW - M, 210); g.textAlign = "left";
    section(p, "Phrases to say");
    for (const [kn, rom, en] of pk.phrases) {
      if (!room(p, 72)) break;
      g.fillStyle = INK; g.font = KN(30); g.fillText(kn, M + 12, p.y + 26);
      g.fillStyle = MUTE; g.font = EN(18, 600); g.fillText(rom, M + 12, p.y + 52);
      g.fillStyle = "#1d5fa8"; g.font = EN(19, 700); g.textAlign = "right"; g.fillText(en.length > 52 ? en.slice(0, 50) + "…" : en, PW - M - 8, p.y + 26); g.textAlign = "left";
      g.strokeStyle = "#f0e6cf"; g.lineWidth = 1; g.beginPath(); g.moveTo(M, p.y + 62); g.lineTo(PW - M, p.y + 62); g.stroke();
      p.y += 66;
    }
    if (room(p, 200)) {
      section(p, `Practice: one of you plays ${pk.who}`);
      for (const c of pk.chat.slice(0, 2)) {
        if (!room(p, 90)) break;
        g.fillStyle = RED; g.font = EN(16, 800); g.fillText("THEM", M + 8, p.y + 22);
        g.fillStyle = INK; g.font = KN(24); g.fillText(c.gini[0], M + 80, p.y + 22);
        g.fillStyle = "#1d5fa8"; g.font = EN(16, 800); g.fillText("YOU", M + 8, p.y + 56);
        g.fillStyle = INK; g.font = KN(24); g.fillText(c.answers[0][0], M + 80, p.y + 56);
        g.fillStyle = MUTE; g.font = EN(15, 600); g.fillText(`${c.gini[2]}  →  ${c.answers[0][2]}`, M + 80, p.y + 80);
        p.y += 96;
      }
    }
  }
  const doc = await PDFDocument.create();
  doc.setTitle(`${school || "Chili Pili"} Kannada · Real-life phrases`);
  pages.forEach((p, i) => { adultHeader(p, { ...p.meta, page: i + 1, pages: pages.length, school }); footer(p, "Chili Pili · ಚಿಲಿಪಿಲಿ ಕನ್ನಡ · practise it with Gini in the app"); });
  for (const p of pages) { const img = await doc.embedJpg(p.c.toDataURL("image/jpeg", 0.86)); const page = doc.addPage([612, 792]); page.drawImage(img, { x: 0, y: 0, width: 612, height: 792 }); }
  return await doc.save();
}

// ---------- Welcome kit: printables every new family gets ----------
const EMO = (px) => `${px}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
function kitHeader(p, { title, sub, school }) {
  const { g } = p;
  g.fillStyle = RED; g.fillRect(0, 0, PW, 110); g.fillStyle = YEL; g.fillRect(0, 110, PW, 10);
  g.fillStyle = "#fff"; g.font = EN(40, 800); g.textBaseline = "middle"; g.fillText(`${school || "Chili Pili"} · Welcome kit`, M, 56);
  g.textAlign = "right"; g.font = KN(30); g.fillText("ಚಿಲಿಪಿಲಿ ಕನ್ನಡ ಕಲಿ", PW - M, 58); g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillStyle = INK; g.font = EN(44, 800); g.fillText(title, M, 196);
  if (sub) { g.fillStyle = MUTE; g.font = EN(24, 600); g.fillText(sub, M, 234); }
  p.y = 270;
}
function bullets(p, items, { size = 24, gap = 14, icon = "•" } = {}) {
  const { g } = p;
  for (const it of items) {
    const [head, body] = Array.isArray(it) ? it : [null, it];
    g.fillStyle = RED; g.font = EN(size, 800); g.fillText(icon, M + 8, p.y + size);
    let x = M + 44;
    if (head) { g.fillStyle = INK; g.font = EN(size, 800); g.fillText(head, x, p.y + size); p.y += size + 8; }
    g.fillStyle = INK; g.font = EN(size - 2, 500);
    p.y = wrap(g, body, x, p.y + size - (head ? 0 : 0), PW - M - x, size + 10) + gap - (size - 2);
  }
}
// The welcome letter. Kannada first, English underneath.
const WELCOME_KIDS = [
  ["ಪ್ರೀತಿಯ ಕುಟುಂಬಕ್ಕೆ ನಮಸ್ಕಾರ!", "Dear family, namaskara!"],
  ["ನಿಮ್ಮ ಮಕ್ಕಳಿಗೆ ಕನ್ನಡ ಕಲಿಸಲು ನೀವು ನಿರ್ಧರಿಸಿದ್ದು ನಮಗೆ ತುಂಬಾ ಸಂತೋಷ ತಂದಿದೆ.", "We are so happy that you decided to teach your children Kannada."],
  ["ಕನ್ನಡ ನಮ್ಮ ತಾಯ್ನುಡಿ, ನಮ್ಮ ಮನೆಯ ಮಾತು, ನಮ್ಮ ಅಜ್ಜ ಅಜ್ಜಿಯರ ಪ್ರೀತಿಯ ಭಾಷೆ.", "Kannada is our mother tongue, the language of our home, the loving language of our grandparents."],
  ["ದೂರದ ದೇಶದಲ್ಲಿದ್ದರೂ, ನಮ್ಮ ಮಕ್ಕಳು ಕನ್ನಡದಲ್ಲಿ ನಗಲಿ, ಮಾತಾಡಲಿ, ಓದಲಿ, ಬರೆಯಲಿ.", "Even far from home, may our children laugh, speak, read and write in Kannada."],
  ["ದಿನಕ್ಕೆ ಹತ್ತು ನಿಮಿಷ ಸಾಕು. ಗಿಣಿಯ ಜೊತೆ ಆಟ ಆಡುತ್ತಾ ಕಲಿಯೋಣ!", "Ten minutes a day is enough. Let's learn while playing with Gini!"],
];
const WELCOME_ADULT = [
  ["ನಮಸ್ಕಾರ!", "Namaskara!"],
  ["ಕನ್ನಡ ಕಲಿಯಲು ನೀವು ನಿರ್ಧರಿಸಿದ್ದು ನಮಗೆ ತುಂಬಾ ಸಂತೋಷ ತಂದಿದೆ.", "We are so happy that you decided to learn Kannada."],
  ["ನಿಮ್ಮ ಸಂಗಾತಿ, ಮಕ್ಕಳು ಮತ್ತು ಕುಟುಂಬದ ಜೊತೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತಾಡುವ ಖುಷಿಯೇ ಬೇರೆ.", "There is a special joy in speaking Kannada with your partner, your children and your family."],
  ["ತಪ್ಪುಗಳಿಗೆ ಹೆದರಬೇಡಿ. ಪ್ರತಿಯೊಂದು ಪದವೂ ಒಂದು ಹೆಜ್ಜೆ.", "Don't be afraid of mistakes. Every word is a step forward."],
  ["ದಿನಕ್ಕೆ ಹದಿನೈದು ನಿಮಿಷ, ನಿಧಾನವಾಗಿ, ಖುಷಿಯಾಗಿ ಕಲಿಯೋಣ.", "Fifteen minutes a day, slowly and happily. Let's learn together."],
];
export const WELCOME_LINE = { kids: WELCOME_KIDS[1], adult: WELCOME_ADULT[1] };
const HOME_LABELS = [
  ["ಬಾಗಿಲು", "baagilu", "door", "🚪"], ["ಕಿಟಕಿ", "kiTaki", "window", "🪟"], ["ಕುರ್ಚಿ", "kurchi", "chair", "🪑"], ["ಮೇಜು", "meeju", "table", "🪵"],
  ["ಹಾಸಿಗೆ", "haasige", "bed", "🛏️"], ["ದಿಂಬು", "dimbu", "pillow", "🛌"], ["ದೀಪ", "deepa", "lamp", "💡"], ["ಗಡಿಯಾರ", "gaDiyaara", "clock", "🕰️"],
  ["ಕನ್ನಡಿ", "kannaDi", "mirror", "🪞"], ["ತಟ್ಟೆ", "taTTe", "plate", "🍽️"], ["ಲೋಟ", "looTa", "cup", "🥛"], ["ಚಮಚ", "chamacha", "spoon", "🥄"],
  ["ಬಟ್ಟಲು", "baTTalu", "bowl", "🥣"], ["ನೀರು", "niiru", "water", "💧"], ["ಹಾಲು", "haalu", "milk", "🍼"], ["ಪುಸ್ತಕ", "pustaka", "book", "📖"],
  ["ಚೀಲ", "chiila", "bag", "🎒"], ["ಬಟ್ಟೆ", "baTTe", "clothes", "👕"], ["ಚಪ್ಪಲಿ", "chappali", "slippers", "🩴"], ["ಹೂವು", "huuvu", "flower", "🌼"],
  ["ಆಟಿಕೆ", "aaTike", "toy", "🧸"], ["ಮನೆ", "mane", "home", "🏠"], ["ಅಡುಗೆಮನೆ", "aDugemane", "kitchen", "🍳"], ["ಸ್ನಾನದ ಮನೆ", "snaanada mane", "bathroom", "🛁"],
];

export async function welcomeKitPdf({ part = "guide", adult = false, school, themes = [], alphabet, letterPic = {}, strokeLib = {}, sayList = [], plainWords = [] }) {
  await ensureFont();
  try { await document.fonts.load(EN(20)); } catch {}
  const { PDFDocument } = await import("pdf-lib");
  const pages = [];
  const page = (title, sub) => { const p = newPage(); kitHeader(p, { title, sub, school }); pages.push(p); return p; };

  if (part === "letter") {
    // A warm welcome, in Kannada first. (Please have a Kannada speaker check the wording.)
    const p = page(adult ? "ಸ್ವಾಗತ! Welcome!" : "ಸ್ವಾಗತ! Welcome to the family!", "");
    const g = p.g;
    g.font = EMO(120); g.textAlign = "center"; g.fillText("🦜", PW / 2, p.y + 120); g.textAlign = "left";
    p.y += 170;
    const L = adult ? WELCOME_ADULT : WELCOME_KIDS;
    for (const [kn, en] of L) {
      g.fillStyle = DEEP; g.font = KN(38); p.y = wrap(g, kn, M + 30, p.y + 40, PW - 2 * M - 60, 54) - 14;
      g.fillStyle = MUTE; g.font = EN(24, 600); p.y = wrap(g, en, M + 30, p.y + 10, PW - 2 * M - 60, 34) + 18;
    }
    p.y += 20;
    p.y = Math.min(p.y, PH - 330);
    g.fillStyle = "#fff4cf"; roundRect(g, M, p.y, PW - 2 * M, 200, 24); g.fill();
    g.textAlign = "center"; g.fillStyle = RED; g.font = KN(44); g.fillText("ಕಲಿಯೋಣ · ಮಾತಾಡೋಣ · ಹಂಚೋಣ", PW / 2, p.y + 64);
    g.fillStyle = MUTE; g.font = EN(24, 700); g.fillText("Let's learn it · Let's speak it · Let's pass it on", PW / 2, p.y + 108);
    g.fillStyle = DEEP; g.font = KN(38); g.fillText("ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ!", PW / 2, p.y + 168); g.textAlign = "left";
    footer(p, `With love, ${school || "Chili Pili Kannada Kali"} · ಚಿಲಿಪಿಲಿ ಕನ್ನಡ ಕಲಿ`);
  }

  if (part === "say3") {
    // Repeat practice: say each one three times, colour a circle each time.
    const rowH = adult ? 92 : 104;
    for (let s0 = 0; s0 < sayList.length;) {
      const p = page(adult ? "Say it 3 times: everyday phrases" : "Say it 3 times: picture words", adult ? "Read each phrase out loud three times. Colour a circle each time. Then use one with someone today!" : "Point, say it out loud three times, and colour a circle each time. A grown-up can say it first.");
      const g = p.g;
      while (s0 < sayList.length && room(p, rowH)) {
        const [kn, rom, en, pic] = sayList[s0++];
        const y = p.y;
        g.strokeStyle = "#f0e6cf"; g.lineWidth = 2; roundRect(g, M, y, PW - 2 * M, rowH - 12, 14); g.stroke();
        let x = M + 18;
        if (pic) { g.font = EMO(54); g.fillText(pic, x, y + 62); x += 84; }
        g.fillStyle = DEEP; g.font = KN(adult ? 30 : 40); const kw = g.measureText(kn).width; g.fillText(kn, x, y + (adult ? 40 : 50));
        g.fillStyle = MUTE; g.font = EN(adult ? 18 : 20, 700); g.fillText(`${rom} · ${en}`.slice(0, 70), x, y + (adult ? 70 : 82));
        for (let k = 0; k < 3; k++) { g.strokeStyle = RED; g.lineWidth = 3; g.beginPath(); g.arc(PW - M - 40 - k * 64, y + (rowH - 12) / 2, 22, 0, Math.PI * 2); g.stroke(); }
        p.y += rowH;
      }
      footer(p, adult ? "Tip: record yourself on your phone and listen back. Then try it on your partner!" : "Tip: make it a game. Whisper it, shout it, sing it!");
    }
  }

  if (part === "wordtrace") {
    for (let s0 = 0; s0 < plainWords.length; s0 += 5) {
      const p = page("Trace simple words", "These words use only letters, no signs. Trace them once the letters are learnt, and say each word.");
      for (const [kn, rom, en, pic] of plainWords.slice(s0, s0 + 5)) {
        if (!room(p, 230)) break;
        p.g.fillStyle = MUTE; p.g.font = EN(22, 700); p.g.fillText(`${pic || ""}  ${rom} · ${en}`, M + 6, p.y + 4); p.y += 14;
        traceRow(p, kn, strokeLib[voiceKey(kn)], false);
      }
      footer(p, "Read the word out loud after you write it.");
    }
  }

  if (part === "tracing") {
    const all = [...alphabet.vowels.map((v) => v[0]), ...alphabet.consonants.flat().map((c) => c[0])];
    for (let s0 = 0; s0 < all.length; s0 += 5) {
      const p = page(s0 < alphabet.vowels.length ? "Trace the letters: vowels ಸ್ವರಗಳು" : "Trace the letters: consonants ವ್ಯಂಜನಗಳು", "Trace the dots, then write it on your own in the empty box. Say the sound each time.");
      for (const t of all.slice(s0, s0 + 5)) { if (!room(p, 240)) break; traceRow(p, t, strokeLib[voiceKey(t)], true); }
      footer(p, "Do one row a day. Watch Gini write each letter in the app first.");
    }
  }

  if (part === "guide" && !adult) {
    let p = page("Welcome! A quick start for parents", "Ten minutes a day, mostly talking and playing. Here's how to make it stick.");
    section(p, "How it works");
    bullets(p, [
      ["1. Open Kid's corner", "On any phone, iPad or computer. Your child signs in with their 4-digit number (it's on your Home page and in your welcome email)."],
      ["2. Pick one of three", "Gini offers three picture choices every day: a lesson, drawing letters, or a story, call or game. Any one counts."],
      ["3. Short bites", "Each activity takes 2 to 4 minutes and ends with \"Want another one?\". Stopping while it's still fun is perfect."],
      ["4. Stars move Gini across Karnataka", "Every 15 stars, Gini flies to a new place (Mysuru, Hampi, Jog Falls...) and your child gets a sticker. Look it up together on a map!"],
      ["5. Paper, once a week", "Print the weekly packet from the Parent corner. One page a day, ten minutes, at the kitchen table."],
    ], { size: 29, gap: 24, icon: "★" });
    section(p, "A simple daily rhythm");
    bullets(p, [
      "Same time every day: after the school snack, or before bed. Habits beat long sessions.",
      "Sit with your child for the first week. After that, let them lead and you just listen.",
      "Say the new word of the day at dinner. Ask: \"What's that in Kannada?\"",
    ], { size: 27, gap: 16 });
    footer(p, "Questions? Message the teacher from the Parent corner, or reply to your welcome email.");
    p = page("10 ways to keep Kannada fun at home", "Kids learn a language they hear and use, with people they love.");
    bullets(p, [
      ["Talk first, letters later", "Understanding and speaking come first. Reading and writing follow much more easily."],
      ["One Kannada moment at every meal", "Name the food: ಅನ್ನ (rice), ಹಾಲು (milk), ನೀರು (water). Ask for things in Kannada."],
      ["Label your home", "Print the label sheet in this kit and stick ಬಾಗಿಲು on the door, ಕಿಟಕಿ on the window..."],
      ["Praise the try, not the result", "A big ಶಭಾಷ್! for every attempt. Mistakes mean they're trying."],
      ["Repeat, don't correct", "If they say it wrong, just say it back the right way, warmly. No \"no, that's wrong\"."],
      ["Let them call Ajji and Tata", "One new word on every call. Grandparents' joy is the best reward there is."],
      ["Bedtime in Kannada", "A story, a song or three Kannada words before sleep. Little and often."],
      ["Let them teach you", "Ask your child to teach you today's word. Teaching makes it stick."],
      ["Put the alphabet chart where they eat", "The fridge or the breakfast table. Point to one letter a day."],
      ["Celebrate the journey", "When Gini reaches a new place, show photos of it. Plan a family visit one day!"],
    ], { size: 28, gap: 16, icon: "🌼" });
    section(p, "On days they don't feel like it");
    bullets(p, ["Do just one bite, or the word of the day, and stop. Keeping it light is how it lasts for months."], { size: 24 });
    footer(p, "ಕಲಿಯೋಣ · ಮಾತಾಡೋಣ · ಹಂಚೋಣ  Learn it. Speak it. Pass it on.");
  }

  if (part === "guide" && adult) {
    let p = page("Welcome! Learning Kannada as a grown-up", "Fifteen minutes a day: talk first, then a little writing.");
    section(p, "How it works");
    bullets(p, [
      ["1. One conversation lesson a day", "Learning corner → My lessons. Listen, repeat, then use one phrase with a real person before the next lesson."],
      ["2. Write a little every day", "Trace today's letters on screen (Gini shows the start and the arrows), then once on paper. Ten letters a week gets you reading in a few months."],
      ["3. Print, practise, stick it up", "The fridge sheet (40 everyday phrases), conversation cards to act out with your partner, and tracing sheets. All in Printables."],
      ["4. Real-life packs", "Calling family in India, the temple, weddings, visiting Karnataka: phrases you'll use this month."],
    ], { size: 29, gap: 24, icon: "★" });
    section(p, "Habits that work for busy adults");
    bullets(p, [
      "Attach it to something you already do: morning coffee, the commute, after the kids' bedtime.",
      "Speak with your partner for 5 minutes a day, even if it's just the phrase of the day.",
      "Keep a small notebook: write each new letter three times, and one word you heard.",
      "Label your home with the sheet in this kit. You'll read Kannada every time you open a door.",
      "Don't wait to be perfect. Families love hearing you try.",
    ], { size: 27, gap: 16 });
    footer(p, "ಕಲಿಯೋಣ · ಮಾತಾಡೋಣ · ಹಂಚೋಣ  Learn it. Speak it. Pass it on.");
  }

  if (part === "alphabet") {
    const p = page("Kannada alphabet ಅಕ್ಷರಮಾಲೆ", "Stick it on the fridge. Point to one letter a day and say its sound.");
    const g = p.g;
    const grid = (title, list, cols, cell, top) => {
      g.fillStyle = DEEP; g.font = EN(26, 800); g.fillText(title, M, top - 12);
      const w = (PW - 2 * M) / cols;
      list.forEach(([l, s], i) => {
        const x = M + (i % cols) * w, y = top + Math.floor(i / cols) * cell;
        g.fillStyle = i % 2 ? "#fffaf0" : "#fff4cf"; roundRect(g, x + 4, y + 4, w - 8, cell - 8, 14); g.fill();
        g.strokeStyle = LINE; g.lineWidth = 2; roundRect(g, x + 4, y + 4, w - 8, cell - 8, 14); g.stroke();
        g.textAlign = "center"; g.fillStyle = RED; g.font = KN(cell * 0.42); g.font = KN(cell * 0.38); g.fillText(l, x + w * (letterPic[l] ? 0.42 : 0.5), y + cell * 0.62);
        if (letterPic[l]) { g.font = EMO(cell * 0.2); g.fillText(letterPic[l], x + w - 24, y + cell * 0.3); }
        g.fillStyle = MUTE; g.font = EN(cell * 0.15, 700); g.fillText(s, x + w / 2, y + cell * 0.86); g.textAlign = "left";
      });
      return top + Math.ceil(list.length / cols) * cell;
    };
    let y = grid("Vowels ಸ್ವರಗಳು", alphabet.vowels, 8, 128, p.y + 40);
    grid("Consonants ವ್ಯಂಜನಗಳು", alphabet.consonants.flat(), 7, 128, y + 56);
    footer(p, "Hear every letter in the app: Kid's corner → Draw letters, or the General corner.");
  }

  if (part === "cards") {
    const ws = themes.flatMap((t) => t.words.map((w) => [...w, t.en]));
    for (let s = 0; s < ws.length; s += 12) {
      const p = page("Picture word cards", "Cut along the dashed lines. Play snap, memory, or \"find the ___\" around the house.");
      const g = p.g, cols = 3, cw = (PW - 2 * M) / cols, ch = 300;
      ws.slice(s, s + 12).forEach(([kn, rom, en, pic, th], i) => {
        const x = M + (i % cols) * cw, y = p.y + Math.floor(i / cols) * ch;
        g.setLineDash([10, 8]); g.strokeStyle = "#c9b48a"; g.lineWidth = 2; g.strokeRect(x, y, cw, ch); g.setLineDash([]);
        g.textAlign = "center"; g.font = EMO(110); g.fillText(pic, x + cw / 2, y + 140);
        g.fillStyle = DEEP; g.font = KN(52); g.fillText(kn, x + cw / 2, y + 214);
        g.fillStyle = MUTE; g.font = EN(22, 700); g.fillText(`${rom} · ${en}`, x + cw / 2, y + 256);
        g.font = EN(16, 700); g.fillStyle = "#b8a37a"; g.fillText(th, x + cw / 2, y + 284); g.textAlign = "left"; g.fillStyle = INK;
      });
      footer(p, "Tip: hold up a card and ask \"ಇದು ಏನು?\" (What is this?)");
    }
  }

  if (part === "labels") {
    const p = page("Label your home", "Cut out and stick each label on the real thing. Read it every time you pass!");
    const g = p.g, cols = 3, cw = (PW - 2 * M) / cols, ch = 150;
    HOME_LABELS.forEach(([kn, rom, en, pic], i) => {
      const x = M + (i % cols) * cw, y = p.y + Math.floor(i / cols) * ch;
      g.setLineDash([10, 8]); g.strokeStyle = "#c9b48a"; g.lineWidth = 2; g.strokeRect(x, y, cw, ch); g.setLineDash([]);
      g.font = EMO(56); g.fillText(pic, x + 18, y + 92);
      g.fillStyle = DEEP; g.font = KN(44); g.fillText(kn, x + 104, y + 70);
      g.fillStyle = MUTE; g.font = EN(20, 700); g.fillText(`${rom} · ${en}`, x + 106, y + 112); g.fillStyle = INK;
    });
    footer(p, "Ask your child to find the ಬಾಗಿಲು or the ಕಿಟಕಿ. Then swap roles!");
  }

  const doc = await PDFDocument.create();
  doc.setTitle(`${school || "Chili Pili"} Kannada · Welcome kit`);
  for (const p of pages) { const img = await doc.embedJpg(p.c.toDataURL("image/jpeg", 0.88)); const pg = doc.addPage([612, 792]); pg.drawImage(img, { x: 0, y: 0, width: 612, height: 792 }); }
  return await doc.save();
}

// Several PDFs into one, for "download everything".
export async function mergePdfs(list, title) {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create(); out.setTitle(title || "Chili Pili Kannada");
  for (const bytes of list) { const d = await PDFDocument.load(bytes); const pages = await out.copyPages(d, d.getPageIndices()); pages.forEach((pg) => out.addPage(pg)); }
  return await out.save();
}
