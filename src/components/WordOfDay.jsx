import { useEffect, useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { THEMES } from "../lib/course.js";
import { UNITS } from "../lib/adult.js";
import { playWord } from "../lib/audio.js";
import { chirp } from "../lib/chirp.js";
import { isoLocal } from "../lib/time.js";

// Word of the day: the same word for the whole family each day, picked from every picture-word theme.
const ALL = THEMES.flatMap((t) => t.words.map(([kn, rom, en, pic]) => ({ kn, rom, en, pic, theme: t.en })));
const dayNo = (d = new Date()) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);
export function wordOfDay(d) { const n = dayNo(d); return ALL[(n * 37) % ALL.length]; }
export function phraseOfDay(d) { const all = UNITS.flatMap((u) => u.phrases.map(([kn, rom, en]) => ({ kn, rom, en, unit: u.en, icon: u.icon }))); return all[(dayNo(d) * 29) % all.length]; }

const CHALLENGES = [
  (w) => `Find something at home that goes with "${w.en}" and say ${w.kn} out loud!`,
  (w) => `Teach ${w.kn} to someone at dinner tonight.`,
  (w) => `Say ${w.kn} three times like Gini: fast, slow, then in a whisper!`,
  (w) => `Call Ajji or Tata and ask them how they say "${w.en}".`,
  (w) => `Draw a picture of ${w.kn} and show a grown-up.`,
];
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

export default function WordOfDay({ child, voiceLib = {}, earn, variant = "kid" }) {
  const today = isoLocal();
  const w = useMemo(() => wordOfDay(), [today]);
  const key = `wod-${child && child.id}-${today}`;
  const [done, setDone] = useState(() => store(key) === "1");
  const [wrong, setWrong] = useState("");
  const options = useMemo(() => {
    const others = ALL.filter((x) => x.pic !== w.pic && x.en !== w.en);
    const n = dayNo();
    const a = others[(n * 13) % others.length], b = others[(n * 7 + 5) % others.length];
    const opts = [w, a, b.pic === a.pic ? others[(n * 3 + 1) % others.length] : b];
    const at = n % 3; const rest = opts.slice(1); rest.splice(at, 0, w); return rest; // the right one moves around day to day
  }, [w]);
  const challenge = CHALLENGES[dayNo() % CHALLENGES.length](w);
  const hear = () => playWord(w.kn, voiceLib);

  if (variant === "adult") {
    const p = phraseOfDay();
    return (
      <div className="wod wod-adult">
        <div className="wod-top"><span className="wod-label">💬 Phrase of the day</span><span className="wod-theme">{p.icon} {p.unit}</span></div>
        <div className="wod-main">
          <button className="wod-hear" onClick={() => playWord(p.kn, voiceLib)} aria-label="Hear it"><Volume2 /></button>
          <div><b className="kn wod-kn" style={{ fontSize: 28 }}>{p.kn}</b><div className="wod-rom">{p.rom}</div><div className="wod-en">{p.en}</div></div>
        </div>
        <p className="wod-challenge">🎯 Use it on your partner or family today, even if it comes out wrong. That's how it sticks.</p>
      </div>
    );
  }
  if (variant === "general") {
    return (
      <div className="wod">
        <div className="wod-top"><span className="wod-label">🌟 Word of the day</span><span className="wod-theme">{w.theme}</span></div>
        <div className="wod-main">
          <span className="wod-pic" aria-hidden="true">{w.pic}</span>
          <div><b className="kn wod-kn">{w.kn}</b><div className="wod-rom">{w.rom} · {w.en}</div></div>
          <button className="wod-hear" onClick={hear} aria-label="Hear it"><Volume2 /></button>
        </div>
        <p className="wod-challenge">🎯 {challenge}</p>
      </div>
    );
  }
  if (variant === "parent") {
    const nm = String((child && child.name) || "your child").split(" ")[0];
    return (
      <div className="wod">
        <div className="wod-top"><span className="wod-label">🌟 Today's word in {nm}'s space</span><span className="wod-theme">{w.theme}</span></div>
        <div className="wod-main">
          <span className="wod-pic" aria-hidden="true">{w.pic}</span>
          <div><b className="kn wod-kn">{w.kn}</b><div className="wod-rom">{w.rom} · {w.en}</div></div>
          <button className="wod-hear" onClick={hear} aria-label="Hear it"><Volume2 /></button>
        </div>
        <p className="wod-challenge">At dinner, ask {nm}: "What's <span className="kn">{w.kn}</span> in English?" Then use it in a sentence together.</p>
      </div>
    );
  }
  function pick(o) {
    if (done) return;
    if (o.kn === w.kn) {
      chirp("happy"); setDone(true); store(key, "1"); setWrong("");
      earn && earn("word", 1, {}, { item: w.kn });
      setTimeout(hear, 350);
    } else { chirp("oops"); setWrong(o.kn); setTimeout(() => setWrong(""), 600); }
  }
  return (
    <div className={`wod wod-kid ${done ? "wod-won" : ""}`}>
      <div className="wod-top"><span className="wod-label">🌟 Word of the day</span><span className="wod-theme">{done ? "+1 ⭐" : w.theme}</span></div>
      <div className="wod-main">
        <button className="wod-hear big" onClick={hear} aria-label="Hear the word"><Volume2 /></button>
        <div><b className="kn wod-kn">{w.kn}</b><div className="wod-rom">{w.rom}{done ? ` · ${w.en}` : ""}</div></div>
      </div>
      {!done ? (
        <>
          <p className="wod-q">Which picture is <b className="kn">{w.kn}</b>? Tap 🔊 to hear it.</p>
          <div className="wod-opts">{options.map((o) => <button key={o.kn} className={`wod-opt ${wrong === o.kn ? "shake" : ""}`} onClick={() => pick(o)} aria-label={o.en}>{o.pic}</button>)}</div>
        </>
      ) : (
        <div className="wod-yay"><span className="wod-pic pop" aria-hidden="true">{w.pic}</span><p className="wod-challenge">🎯 {challenge}</p></div>
      )}
    </div>
  );
}
