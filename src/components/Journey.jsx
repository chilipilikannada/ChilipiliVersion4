import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { PLACES, STEP, unlockedCount, nextPlace } from "../lib/places.js";
import { playWord } from "../lib/audio.js";
import { chirp } from "../lib/chirp.js";
import { Gini } from "./Art.jsx";
import { Confetti } from "./Fun.jsx";

// Gini's journey across Karnataka: a winding trail of real places. Stars move Gini along; each place is a sticker.
const GAP = 112, H = 190;
const ys = (i) => (i % 2 ? 128 : 70) + (i % 3 === 2 ? 10 : 0);

export function KarnatakaTrail({ child, onOpen, onBook }) {
  const stars = child.stars || 0;
  const open = unlockedCount(stars);
  const nx = nextPlace(stars);
  const box = useRef(null);
  const W = PLACES.length * GAP + 60;
  const pts = PLACES.map((_, i) => [40 + i * GAP + 20, ys(i)]);
  const path = useMemo(() => pts.reduce((d, [x, y], i) => {
    if (!i) return `M ${x} ${y}`;
    const [px, py] = pts[i - 1], mx = (px + x) / 2;
    return `${d} C ${mx} ${py}, ${mx} ${y}, ${x} ${y}`;
  }, ""), []);
  useEffect(() => { const el = box.current; if (el) el.scrollLeft = Math.max(0, pts[open - 1][0] - el.clientWidth / 2); }, [open]);
  const cur = pts[open - 1];
  return (
    <div className="trail-card">
      <div className="trail-head">
        <div><b>Gini's Karnataka journey</b><small>{nx ? <>Next stop <b>{nx.place.en}</b> in {nx.need} ⭐</> : "You visited every place! 🏆"}</small></div>
        <button className="btn ghost small" onClick={onBook}>📒 My stickers {open}/{PLACES.length}</button>
      </div>
      <div className="trail" ref={box}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d={path} fill="none" stroke="#e7d3a6" strokeWidth="14" strokeLinecap="round" />
          <path d={path} fill="none" stroke="#c9a978" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
        </svg>
        {PLACES.map((p, i) => {
          const on = i < open;
          return (
            <button key={p.id} className={`stop ${on ? "on" : ""} ${i === open - 1 ? "here" : ""}`} style={{ left: pts[i][0] - 34, top: pts[i][1] - 34, "--c": p.color }}
              onClick={() => (on ? onOpen(p) : chirp("oops"))} aria-label={on ? p.en : `Locked: ${p.en}`}>
              <span className="stop-pic">{on ? p.pic : "🔒"}</span>
              <span className="stop-name kn">{on ? p.kn : "?"}</span>
            </button>
          );
        })}
        <div className="trail-gini" style={{ left: cur[0] - 26, top: cur[1] - 86 }}><Gini className="gini" /></div>
      </div>
    </div>
  );
}

export function PlaceCard({ place, voiceLib, onClose }) {
  useEffect(() => { chirp("happy"); }, []);
  return (
    <div className="badge-pop" role="dialog" aria-label={place.en} onClick={onClose}>
      <div className="bp-card place-card" style={{ "--c": place.color }} onClick={(e) => e.stopPropagation()}>
        <span className="pc-pic" aria-hidden="true">{place.pic}</span>
        <div className="row" style={{ justifyContent: "center" }}>
          <h2 className="kn" style={{ margin: 0 }}>{place.kn}</h2>
          <button className="icon-btn hear" onClick={() => playWord(place.kn, voiceLib)} aria-label="Hear it"><Volume2 /></button>
        </div>
        <b>{place.en}</b>
        <p style={{ margin: 0 }}>{place.fact}</p>
        <button className="btn primary" onClick={onClose}>ಸೂಪರ್! Back to Gini</button>
      </div>
    </div>
  );
}

// Shows once when Gini reaches a new place.
export function NewPlacePop({ child, voiceLib }) {
  const key = `places-${child.id}`;
  const n = unlockedCount(child.stars || 0);
  const [fresh, setFresh] = useState(null);
  useEffect(() => {
    let seen = null; try { seen = Number(localStorage.getItem(key)); } catch {}
    try { localStorage.setItem(key, String(n)); } catch {}
    if (seen && n > seen) setFresh(PLACES[n - 1]);
  }, [n]);
  if (!fresh) return null;
  return (
    <>
      <Confetti n={60} />
      <div className="badge-pop" role="dialog" aria-label="New place" onClick={() => setFresh(null)}>
        <div className="bp-card place-card" style={{ "--c": fresh.color }} onClick={(e) => e.stopPropagation()}>
          <span className="bp-label">Gini flew to a new place!</span>
          <span className="pc-pic" aria-hidden="true">{fresh.pic}</span>
          <div className="row" style={{ justifyContent: "center" }}><h2 className="kn" style={{ margin: 0 }}>{fresh.kn}</h2>
            <button className="icon-btn hear" onClick={() => playWord(fresh.kn, voiceLib)} aria-label="Hear it"><Volume2 /></button></div>
          <b>{fresh.en}</b>
          <p style={{ margin: 0 }}>{fresh.fact}</p>
          <p className="small" style={{ margin: 0 }}>A new sticker for your book! 📒</p>
          <button className="btn primary" onClick={() => setFresh(null)}>ಶಭಾಷ್! Yay!</button>
        </div>
      </div>
    </>
  );
}

export function StickerBook({ child, voiceLib }) {
  const stars = child.stars || 0, open = unlockedCount(stars);
  const [sel, setSel] = useState(null);
  return (
    <div className="kid-card">
      <div className="card-head"><h3 style={{ margin: 0 }}>📒 My Karnataka stickers</h3><span className="pill yellow">{open} of {PLACES.length}</span></div>
      <p className="small muted" style={{ margin: 0 }}>Every {STEP} stars, Gini flies somewhere new. Tap a sticker to visit again.</p>
      <div className="sticker-grid">
        {PLACES.map((p, i) => i < open ? (
          <button key={p.id} className="sticker" style={{ "--c": p.color }} onClick={() => setSel(p)}><span>{p.pic}</span><b className="kn">{p.kn}</b><small>{p.en}</small></button>
        ) : (
          <div key={p.id} className="sticker locked"><span>❔</span><small>{i * STEP} ⭐</small></div>
        ))}
      </div>
      {sel && <PlaceCard place={sel} voiceLib={voiceLib} onClose={() => setSel(null)} />}
    </div>
  );
}
