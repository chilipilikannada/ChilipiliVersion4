import { useEffect, useMemo, useState } from "react";
import { Lock, Delete } from "lucide-react";
import { Modal } from "./ui.jsx";

// A one-tap way out of a child's space. Grown-ups type three numbers that are written as words
// (easy for an adult, hard for a 5-year-old), then pick where to go.
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const pickDigits = () => Array.from({ length: 3 }, () => 1 + Math.floor(Math.random() * 9));

export default function GrownupGate({ title = "Grown-ups only", note, options, onClose }) {
  const [digits, setDigits] = useState(pickDigits);
  const [typed, setTyped] = useState("");
  const [ok, setOk] = useState(false);
  const [shake, setShake] = useState(false);
  const want = useMemo(() => digits.join(""), [digits]);

  function press(d) {
    if (ok) return;
    const t = (typed + d).slice(0, 3);
    setTyped(t);
    if (t.length === 3) {
      if (t === want) setTimeout(() => setOk(true), 150);
      else { setShake(true); setTimeout(() => { setShake(false); setTyped(""); setDigits(pickDigits()); }, 500); }
    }
  }
  useEffect(() => {
    const k = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") setTyped((x) => x.slice(0, -1)); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  return (
    <Modal title={ok ? "Where to?" : title} onClose={onClose}>
      {!ok ? (
        <div className="gate">
          <p className="gate-q"><Lock size={18} /> Type these numbers:</p>
          <p className="gate-words">{digits.map((d) => WORDS[d]).join(" · ")}</p>
          <div className={`gate-boxes ${shake ? "shake" : ""}`} aria-live="polite">
            {[0, 1, 2].map((i) => <span key={i} className={i === typed.length ? "on" : ""}>{typed[i] || ""}</span>)}
          </div>
          <div className="gate-pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} type="button" onClick={() => press(String(n))}>{n}</button>)}
            <span />
            <button type="button" onClick={() => press("0")}>0</button>
            <button type="button" aria-label="Delete" onClick={() => setTyped((x) => x.slice(0, -1))}><Delete size={22} /></button>
          </div>
          <button type="button" className="btn ghost block" onClick={onClose}>🦜 Back to Gini</button>
        </div>
      ) : (
        <div className="gate-menu">
          {note && <p className="small muted" style={{ margin: 0 }}>{note}</p>}
          {options.map((o) => (
            <button key={o.key} type="button" className={`gate-opt ${o.kind || ""}`} onClick={() => { onClose(); o.onClick(); }}>
              <span className="go-ic" aria-hidden="true">{o.icon}</span>
              <span><b>{o.label}</b>{o.sub && <small>{o.sub}</small>}</span>
            </button>
          ))}
          <button type="button" className="btn ghost block" onClick={onClose}>🦜 Stay with Gini</button>
        </div>
      )}
    </Modal>
  );
}
