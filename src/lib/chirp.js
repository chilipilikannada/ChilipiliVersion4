// Gini's voice: a short parrot chirp made with the Web Audio API (no sound files).
// Quiet mode is remembered on this device.
let ctx = null;
const KEY = "gini-quiet";
export const isQuiet = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
export const setQuiet = (q) => { try { q ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY); } catch {} };

function ac() {
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
// One whistle: a quick upward (or wavy) pitch sweep with a soft envelope.
function note(c, t, f0, f1, dur, vol = 0.12, wobble = 0) {
  const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  if (wobble) { lfo.frequency.value = 38; lg.gain.value = wobble; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SONGS = {
  hello: [[1900, 3100, 0.09], [2300, 3600, 0.08, 0.06], [2600, 2000, 0.16, 0.1, 120]],
  happy: [[2200, 3400, 0.07], [2400, 3800, 0.07, 0.05], [2600, 4000, 0.07, 0.1], [3000, 4200, 0.18, 0.15, 160]],
  tweet: [[2600, 3800, 0.06], [2600, 3900, 0.06, 0.09]],
  oops: [[2400, 1500, 0.18, 0, 60]],
};
// kind: "hello" | "happy" | "tweet" | "oops"
export function chirp(kind = "hello") {
  if (isQuiet()) return;
  const c = ac(); if (!c) return;
  const song = SONGS[kind] || SONGS.hello, k = 0.9 + Math.random() * 0.2;
  let t = c.currentTime + 0.01;
  for (const [f0, f1, dur, gap = 0, wob = 0] of song) { t += gap; note(c, t, f0 * k, f1 * k, dur, 0.11, wob); t += dur * 0.85; }
}
