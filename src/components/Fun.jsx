import { useEffect, useMemo, useState } from "react";
import { badgeState, nextBadge, earnedIds } from "../lib/badges.js";
import { chirp } from "../lib/chirp.js";
import { isoLocal } from "../lib/time.js";

// Confetti in the Karnataka colours (and friends). Pure CSS, removes itself.
const COLORS = ["#c8102e", "#ffc72c", "#1f8a4c", "#2563a8", "#ff7a00", "#e83e8c"];
export function Confetti({ n = 44, ms = 2600 }) {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOn(false), ms); return () => clearTimeout(t); }, [ms]);
  const bits = useMemo(() => Array.from({ length: n }, (_, i) => ({
    x: Math.random() * 100, d: Math.random() * 0.5, t: 1.6 + Math.random() * 1.2, r: Math.random() * 360, c: COLORS[i % COLORS.length], w: 6 + Math.random() * 7, s: Math.random() < 0.3,
  })), [n]);
  if (!on) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => <i key={i} style={{ left: `${b.x}%`, background: b.c, width: b.w, height: b.s ? b.w : b.w * 1.6, borderRadius: b.s ? "50%" : 2, animationDelay: `${b.d}s`, animationDuration: `${b.t}s`, "--r": `${b.r}deg` }} />)}
    </div>
  );
}

// Today: a ring for the daily goal (3 activities) and the next badge to win.
export function TodayStrip({ child, activity = [], goal = 3 }) {
  const today = isoLocal();
  const n = activity.filter((a) => a.childId === child.id && isoLocal(a.at) === today).length;
  const nb = nextBadge(child);
  const pct = Math.min(1, n / goal), R = 22, C = 2 * Math.PI * R;
  const key = `goal-${child.id}-${today}`;
  const [party, setParty] = useState(false);
  useEffect(() => {
    if (n >= goal) { let seen = null; try { seen = localStorage.getItem(key); } catch {} if (!seen) { try { localStorage.setItem(key, "1"); } catch {} setParty(true); chirp("happy"); } }
  }, [n >= goal]);
  return (
    <div className="today-strip">
      {party && <Confetti />}
      <div className="ts-goal">
        <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
          <circle cx="28" cy="28" r={R} fill="none" stroke="#f3e6c4" strokeWidth="7" />
          <circle cx="28" cy="28" r={R} fill="none" stroke={n >= goal ? "#1f8a4c" : "#ff7a00"} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 28 28)" style={{ transition: "stroke-dasharray .6s ease" }} />
          <text x="28" y="33" textAnchor="middle" fontSize="16" fontWeight="800" fill="#2a0f0c">{n >= goal ? "✓" : `${n}/${goal}`}</text>
        </svg>
        <div><b>{n >= goal ? "Today's goal done!" : "Today's goal"}</b><small>{n >= goal ? "Super! Anything more is a bonus ⭐" : `${goal - n} more ${goal - n === 1 ? "activity" : "activities"} today`}</small></div>
      </div>
      {nb && (
        <div className="ts-badge" title={`Next badge: ${nb.en}`}>
          <span className="ts-icon locked" aria-hidden="true">{nb.icon}</span>
          <div style={{ minWidth: 0 }}><b>Next: {nb.en}</b>
            <div className="ts-bar"><i style={{ width: `${Math.round((nb.v / nb.target) * 100)}%` }} /></div>
            <small>{nb.v} of {nb.target}</small></div>
        </div>
      )}
    </div>
  );
}

// All the badges: won ones in colour, the rest waiting.
export function BadgeGrid({ child }) {
  const all = badgeState(child);
  const won = all.filter((b) => b.earned).length;
  return (
    <div className="kid-card">
      <div className="card-head"><h3 style={{ margin: 0 }}>🏅 My badges</h3><span className="pill yellow">{won} of {all.length}</span></div>
      <div className="badge-grid">
        {all.map((b) => (
          <div key={b.id} className={`bdg ${b.earned ? "won" : ""}`} title={b.en}>
            <span className="b-icon" aria-hidden="true">{b.icon}</span>
            <b>{b.en}</b><small className="kn">{b.kn}</small>
            {!b.earned && <span className="b-prog">{b.v}/{b.target}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Pops up when a new badge has been won since this device last looked.
export function NewBadgePop({ child }) {
  const key = `badges-${child.id}`;
  const ids = earnedIds(child);
  const [fresh, setFresh] = useState(null);
  useEffect(() => {
    let seen = null; try { seen = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
    if (!seen) { try { localStorage.setItem(key, JSON.stringify(ids)); } catch {} return; } // first visit: no pop for old badges
    const nw = ids.filter((x) => !seen.includes(x));
    if (nw.length) { setFresh(badgeState(child).find((b) => b.id === nw[nw.length - 1])); chirp("happy"); try { localStorage.setItem(key, JSON.stringify(ids)); } catch {} }
  }, [ids.join(",")]);
  if (!fresh) return null;
  return (
    <div className="badge-pop" role="dialog" aria-label="New badge" onClick={() => setFresh(null)}>
      <Confetti n={60} />
      <div className="bp-card">
        <span className="bp-label">New badge!</span>
        <span className="bp-icon" aria-hidden="true">{fresh.icon}</span>
        <h2 style={{ margin: 0 }}>{fresh.en}</h2>
        <span className="kn muted">{fresh.kn}</span>
        <button className="btn primary" onClick={() => setFresh(null)}>ಶಭಾಷ್! Yay!</button>
      </div>
    </div>
  );
}
