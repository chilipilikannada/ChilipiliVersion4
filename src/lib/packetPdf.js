// The printable packet as a real PDF (US Letter). Pages are drawn on a canvas, which shapes
// Kannada correctly, then placed into a PDF with pdf-lib.
import { ensureFont, layout, drawGlyph, fitRecord, centreDots, autoPath, PAD_FONT } from "./strokes.js";
import { storyPics } from "./storyPics.js";
import { LETTER_PIC } from "./journey.js";
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
  const guide = recFit || autoPath(L); // the teacher's strokes, or a path worked out from the shape
  const dots = centreDots(L, guide, 0.06);
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
      if (f) { g.fillStyle = "#1f8a4c"; g.beginPath(); g.arc(ox + f.x * H, oy + f.y * H, Math.max(4, H * 0.04), 0, Math.PI * 2); g.fill(); }
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
    p.meta = { title: `Letters: ${U.en}`, sub: `${T.icon} ${T.en} path · trace the light letters, then write on your own. Start at the green dot.` };
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
  if (U.words && U.words.length) {
    const last = pages[pages.length - 1];
    if (room(last, 260)) { section(last, "Words to write"); for (const w of U.words.slice(0, 2)) traceRow(last, w, strokeLib[voiceKey(w)]); }
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
    p.meta = { title: `Words of the week: ${pk.theme.en}`, sub: `${pk.theme.kn} · say each word, trace it, then write it on the line.` };
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
      g.font = KN(58); g.fillStyle = "#e3dccd"; g.fillText(kn, M + 190 + Math.max(260, g.measureText(kn).width + 60), y + 62);
      g.textBaseline = "alphabetic"; g.fillStyle = MUTE; g.font = EN(22, 700); g.fillText(`${rom} · ${en}`, M + 190, y + 128);
      g.strokeStyle = LINE; g.beginPath(); g.moveTo(M + 700, y + 140); g.lineTo(PW - M - 24, y + 140); g.stroke();
      g.setLineDash([6, 6]); g.strokeStyle = "#eadcb8"; g.beginPath(); g.moveTo(M + 700, y + 100); g.lineTo(PW - M - 24, y + 100); g.stroke(); g.setLineDash([]);
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
      "4.  Letters are optional. When you're ready, trace one row a day with a pen. Start at the green dot and follow the red arrows.",
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
        p.meta = { title: `Letters to trace: ${name.split("  ")[0].toLowerCase()}`, sub: "Start at the green dot, follow the red arrows, say the sound as you write." };
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
