import { useEffect, useRef, useState } from "react";
import { FEATURES } from "../lib/config.js";
import ComingSoon, { SoonPill } from "./ComingSoon.jsx";
import { ArrowLeft, ArrowRight, Volume2, Mic, Send, Download, RotateCcw, Keyboard, MessageCircle } from "lucide-react";
import { Gini } from "./Art.jsx";
import { Confetti } from "./Fun.jsx";
import { PACKS, packsFor } from "../lib/packs.js";
import { playWord } from "../lib/audio.js";
import { giniTurn, useListen, canListen } from "../lib/voice.js";
import { chirp } from "../lib/chirp.js";
import { useApp } from "../lib/hooks.js";
import { saveFile } from "../lib/files.js";

// ---------- The list of real-life packs ----------
export function PackList({ kid = false, onOpen }) {
  return (
    <div className="pack-grid">
      {packsFor(kid).map((p) => (
        <button key={p.id} className="pack-card" onClick={() => onOpen(p)}>
          <span className="pc-icon" aria-hidden="true">{p.icon}</span>
          <b>{p.en}</b><small className="kn">{p.kn}</small>
          {!kid && <span className="pc-goal">{p.goal}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- One pack: hear every phrase, flashcards, chat, print ----------
export function PackView({ pack, voiceLib = {}, kid = false, earn, onBack }) {
  const [mode, setMode] = useState("list");
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const { say, school } = useApp();
  const [busy, setBusy] = useState(false);
  const P = pack.phrases;
  async function print() {
    setBusy(true);
    try {
      const { packsPdf } = await import("../lib/packetPdf.js");
      const bytes = await packsPdf({ packs: [pack], school: school && school.schoolName });
      const r = await saveFile(`ChiliPili-phrases-${pack.id}.pdf`, bytes, "application/pdf");
      if (r === "saved") say("Saved. Stick it on the fridge!");
    } catch (e) { say(String(e.message || e), true); }
    setBusy(false);
  }
  if (mode === "chat" && !FEATURES.gini) return <div className="stack"><ComingSoon feature="gini" compact onBack={() => setMode("list")} /></div>;
  if (mode === "chat") return <GiniChat pack={pack} voiceLib={voiceLib} kid={kid} earn={earn} onBack={() => setMode("list")} />;
  return (
    <div className="stack">
      <div className="pack-head">
        <span className="pc-icon big" aria-hidden="true">{pack.icon}</span>
        <div><h2 style={{ margin: 0 }}>{pack.en}</h2><div className="kn muted">{pack.kn}</div><p className="small muted" style={{ margin: "4px 0 0" }}>{pack.goal}</p></div>
      </div>
      <button className="gini-chat-cta" onClick={() => { chirp("hello"); setMode("chat"); }}>
        <Gini className="gini" mood="cheer" />
        <span><b>Practise it with Gini{!FEATURES.gini && <SoonPill />}</b><small>Gini plays {pack.who}. You answer in Kannada: tap, speak or type.</small></span>
        <ArrowRight />
      </button>
      <div className="seg" style={{ justifySelf: "center" }}>
        <button aria-pressed={mode === "list"} onClick={() => setMode("list")}>All phrases</button>
        <button aria-pressed={mode === "cards"} onClick={() => { setMode("cards"); setI(0); setFlip(false); }}>Flashcards</button>
      </div>
      {mode === "list" ? (
        <ul className="phrase-list big">
          {P.map(([kn, rom, en]) => (
            <li key={kn}>
              <button className="icon-btn hear" onClick={() => playWord(kn, voiceLib)} aria-label={`Hear: ${en}`}><Volume2 size={18} /></button>
              <div><b className="kn">{kn}</b><span className="small muted">{rom} · {en}</span></div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flash-card" onClick={() => setFlip(!flip)} role="button" aria-label="Flip the card">
          <span className="tiny muted">{i + 1} of {P.length} · tap to flip</span>
          {flip ? <><b className="kn" style={{ fontSize: 30 }}>{P[i][0]}</b><span className="muted">{P[i][1]}</span></> : <b style={{ fontSize: 24 }}>{P[i][2]}</b>}
          <div className="row" style={{ justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" style={{ background: "#fff" }} disabled={i === 0} onClick={() => { setI(i - 1); setFlip(false); }} aria-label="Previous"><ArrowLeft /></button>
            <button className="icon-btn hear" onClick={() => playWord(P[i][0], voiceLib)} aria-label="Hear it"><Volume2 /></button>
            <button className="icon-btn yellow" onClick={() => { if (i + 1 < P.length) { setI(i + 1); setFlip(false); } else { earn && earn("pack", 1, {}, { item: pack.id }); chirp("happy"); setMode("list"); } }} aria-label="Next"><ArrowRight /></button>
          </div>
        </div>
      )}
      <button className="btn ghost small" style={{ justifySelf: "start" }} disabled={busy} onClick={print}><Download size={16} /> {busy ? "Making it…" : "Print this pack"}</button>
      {onBack && <button className="btn quiet small" style={{ justifySelf: "start" }} onClick={onBack}><ArrowLeft size={16} /> All packs</button>}
    </div>
  );
}

// ---------- Talk with Gini ----------
// Works two ways: with the Claude key, Gini answers anything and corrects gently;
// without it (or offline), Gini follows the pack's script and the learner picks or says the answers.
export function GiniChat({ pack, voiceLib = {}, kid = false, earn, onBack }) {
  const first = pack.chat[0];
  const [turns, setTurns] = useState([{ from: "gini", kn: first.gini[0], rom: first.gini[1], en: first.gini[2] }]);
  const [sugs, setSugs] = useState(first.answers.map(([kn, rom, en]) => ({ kn, rom, en })));
  const [step, setStep] = useState(0);
  const [ai, setAi] = useState(null); // null unknown, true working, false script only
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [showEn, setShowEn] = useState(kid);
  const listen = useListen("kn-IN");
  const end = useRef(null);
  useEffect(() => { playWord(first.gini[0], voiceLib); }, []); // Gini speaks first
  useEffect(() => { end.current && end.current.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, done]);
  useEffect(() => { if (listen.final && listen.text && !listen.listening) { send(listen.text); listen.reset(); } }, [listen.final, listen.listening]);

  function giniSays(line, next, isDone) {
    setTurns((t) => [...t, { from: "gini", ...line }]);
    setSugs(next || []);
    chirp("tweet"); setTimeout(() => playWord(line.kn, voiceLib), 250);
    if (isDone) finish();
  }
  function finish() { setDone(true); chirp("happy"); earn && earn("gini", 3, {}, { item: pack.id }); }
  function scripted(nextStep) {
    const c = pack.chat[nextStep];
    if (!c) { giniSays({ kn: "ಶಭಾಷ್! ತುಂಬಾ ಚೆನ್ನಾಗಿ ಮಾತಾಡಿದೆ!", rom: "shabhaash! tumbaa chennaagi maataaDide!", en: "Well done! You spoke really well!" }, [], true); return; }
    giniSays({ kn: c.gini[0], rom: c.gini[1], en: c.gini[2] }, c.answers.map(([kn, rom, en]) => ({ kn, rom, en })));
  }
  async function send(said, picked) {
    said = String(said || "").trim(); if (!said || busy || done) return;
    const me = picked || { kn: /[ಀ-೿]/.test(said) ? said : "", en: /[ಀ-೿]/.test(said) ? "" : said };
    const history = [...turns];
    setTurns((t) => [...t, { from: "me", ...me, raw: said }]); setText(""); setTyping(false);
    const nextStep = step + 1; setStep(nextStep);
    if (ai !== false) {
      setBusy(true);
      try {
        const r = await giniTurn({ scene: { id: pack.id, en: pack.en, who: pack.who, goal: pack.goal }, history, said, audience: kid ? "kid" : "adult", turn: nextStep });
        setAi(true); setBusy(false);
        if (r.feedback && (r.feedback.better_kn || r.feedback.tip)) setTurns((t) => { const c = [...t]; c[c.length - 1] = { ...c[c.length - 1], fb: r.feedback }; return c; });
        if (r.feedback && r.feedback.ok === false) chirp("oops");
        giniSays(r.reply, r.suggestions, r.done || nextStep >= 6);
        return;
      } catch (e) { setAi(false); setBusy(false); }
    }
    scripted(nextStep);
  }
  return (
    <div className="stack">
      <div className="chat-head">
        <button className="icon-btn" style={{ background: "#fff" }} onClick={onBack} aria-label="Back"><ArrowLeft /></button>
        <div><b>{pack.icon} {pack.en}</b><div className="tiny muted">Gini is playing {pack.who}{ai === false ? " · practice script" : ai ? " · free chat" : ""}</div></div>
        <button className="btn quiet small" onClick={() => setShowEn(!showEn)}>{showEn ? "Hide English" : "English"}</button>
      </div>
      <div className="chat">
        {turns.map((t, k) => (
          <div key={k} className={`bubble-row from-${t.from}`}>
            {t.from === "gini" && <Gini className="gini mini" />}
            <div className={`chat-bubble ${t.from}`}>
              {t.kn && <b className="kn">{t.kn}</b>}
              {t.rom && <span className="cb-rom">{t.rom}</span>}
              {(showEn || !t.kn) && t.en && <span className="cb-en">{t.en}</span>}
              {t.from === "gini" && <button className="cb-hear" onClick={() => playWord(t.kn, voiceLib)} aria-label="Hear it again"><Volume2 size={16} /></button>}
              {t.fb && (t.fb.better_kn || t.fb.tip) && (
                <div className={`cb-fb ${t.fb.ok ? "ok" : "fix"}`}>
                  {t.fb.tip && <span>{t.fb.ok ? "👍 " : "💡 "}{t.fb.tip}</span>}
                  {t.fb.better_kn && <span>Say: <b className="kn">{t.fb.better_kn}</b> <button className="cb-hear" onClick={() => playWord(t.fb.better_kn, voiceLib)} aria-label="Hear the better way"><Volume2 size={14} /></button><br /><small>{t.fb.better_rom}</small></span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="bubble-row from-gini"><Gini className="gini mini" /><div className="chat-bubble gini typing"><i /><i /><i /></div></div>}
        <div ref={end} />
      </div>
      {done ? (
        <div className="kid-card celebrate" style={{ textAlign: "center", justifyItems: "center" }}>
          <Confetti />
          <div className="stars-burst">⭐⭐⭐</div>
          <h3 style={{ margin: 0 }}><span className="kn">ಶಭಾಷ್!</span> You had a whole conversation in Kannada!</h3>
          <p className="small muted" style={{ margin: 0 }}>Now try it for real with {pack.who === "a friend" || pack.who === "a new friend" ? "a friend" : pack.who}.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn ghost" onClick={() => { setTurns([{ from: "gini", kn: first.gini[0], rom: first.gini[1], en: first.gini[2] }]); setSugs(first.answers.map(([kn, rom, en]) => ({ kn, rom, en }))); setStep(0); setDone(false); playWord(first.gini[0], voiceLib); }}><RotateCcw size={18} /> Again</button>
            <button className="btn primary" onClick={onBack}>Done</button>
          </div>
        </div>
      ) : (
        <div className="chat-input">
          {sugs.length > 0 && <div className="sugs">{sugs.map((s) => (
            <button key={s.kn} className="sug" disabled={busy} onClick={() => { playWord(s.kn, voiceLib); send(s.kn, s); }}>
              <b className="kn">{s.kn}</b><small>{s.rom}{showEn ? ` · ${s.en}` : ""}</small>
            </button>
          ))}</div>}
          <div className="row" style={{ flexWrap: "nowrap", justifyContent: "center" }}>
            {canListen() && <button className={`big-round ${listen.listening ? "rec" : "green"}`} disabled={busy} onClick={() => (listen.listening ? listen.stop() : listen.start())} aria-label={listen.listening ? "Stop" : "Speak Kannada"}><Mic /></button>}
            <button className="icon-btn big" style={{ background: "#fff" }} onClick={() => setTyping(!typing)} aria-label="Type instead"><Keyboard /></button>
          </div>
          {listen.listening && <p className="small muted" style={{ textAlign: "center", margin: 0 }}>Listening… say your answer in Kannada{listen.text ? `: ${listen.text}` : ""}</p>}
          {listen.error && listen.error !== "nospeech" && <p className="small muted" style={{ textAlign: "center", margin: 0 }}>The microphone isn't working here. Tap an answer or type instead.</p>}
          {typing && (
            <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); send(text); }}>
              <input className="input" style={{ flex: 1, minWidth: 0 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Kannada, or English if you're stuck" aria-label="Your answer" autoFocus />
              <button className="btn primary small" disabled={!text.trim() || busy} aria-label="Send"><Send size={16} /></button>
            </form>
          )}
          <p className="tiny muted" style={{ textAlign: "center", margin: 0 }}>Tap an answer to say it, or press the mic and say your own.</p>
        </div>
      )}
    </div>
  );
}

// A quick "Talk with Gini" picker: choose who Gini plays.
export function ChatPicker({ kid = false, onPick }) {
  return (
    <div className="chat-pick">
      {packsFor(kid).map((p) => (
        <button key={p.id} className="cp-item" onClick={() => onPick(p)}>
          <span aria-hidden="true">{p.icon}</span><b>{p.who[0].toUpperCase() + p.who.slice(1)}</b><small>{p.en}</small>
        </button>
      ))}
    </div>
  );
}

export { PACKS };
