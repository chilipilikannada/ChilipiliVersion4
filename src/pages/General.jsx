import { useState } from "react";
import { ArrowLeft, ArrowRight, Volume2, Download } from "lucide-react";
import { useApp } from "../lib/hooks.js";
import { Logo, LetterSky } from "../components/Art.jsx";
import BrandName from "../components/BrandName.jsx";
import WordOfDay from "../components/WordOfDay.jsx";
import { PackList, PackView } from "../components/Packs.jsx";
import { StoryBook } from "./kid/KidSpace.jsx";
import { STORIES } from "../lib/stories.js";
import { storyPics } from "../lib/storyPics.js";
import { THEMES } from "../lib/course.js";
import { UNITS, ADULT_LEVELS } from "../lib/adult.js";
import { PACKS } from "../lib/packs.js";
import { playWord } from "../lib/audio.js";
import { saveFile } from "../lib/files.js";

// General corner: open to everyone, signed in or not. Real-life phrases, picture words,
// picture stories, the word of the day and free printables.
const SECTIONS = [
  ["", "🌟", "Today"],
  ["packs", "📱", "Real-life phrases"],
  ["words", "🎨", "Picture words"],
  ["stories", "📖", "Stories"],
  ["print", "🖨️", "Printables"],
];

export default function GeneralCorner({ standalone = false, voiceLib = {} }) {
  const { route, go } = useApp();
  // route: ["general", section, id]
  const sec = route[1] || "", id = route[2];
  const to = (s, x) => go("general", ...(s ? [s] : []), ...(x ? [x] : []));
  const body = (
    <div className="stack general">
      <div className="corner-head general">
        <span className="ch-icon" aria-hidden="true">🌐</span>
        <div><h1 style={{ margin: 0 }}>General corner</h1><p className="muted" style={{ margin: 0 }}>Kannada for everyone: phrases for real life, picture words, stories and things to print. Free, no sign-in needed.</p></div>
      </div>
      <div className="corner-tabs" role="tablist">
        {SECTIONS.map(([k, icon, label]) => <button key={k} role="tab" aria-selected={sec === k} onClick={() => to(k)}><span aria-hidden="true">{icon}</span> {label}</button>)}
      </div>
      {sec === "" && <Today to={to} voiceLib={voiceLib} />}
      {sec === "packs" && (PACKS.find((p) => p.id === id) ? <PackView key={id} pack={PACKS.find((p) => p.id === id)} voiceLib={voiceLib} onBack={() => to("packs")} /> : <PackList onOpen={(p) => to("packs", p.id)} />)}
      {sec === "words" && <Words themeId={id} to={to} voiceLib={voiceLib} />}
      {sec === "stories" && <Stories id={id} to={to} voiceLib={voiceLib} />}
      {sec === "print" && <Printables />}
    </div>
  );
  if (!standalone) return body;
  return (
    <div className="general-page">
      <LetterSky opacity={0.11} count={30} />
      <header className="appbar"><div className="appbar-in">
        <button className="brand" onClick={() => go()}><Logo /><BrandName light /></button>
        <span className="spacer" />
        <button className="btn yellow small" onClick={() => go("signin")}>Sign in</button>
      </div><div className="kasuti on-red" /></header>
      <main className="main" style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>{body}</main>
    </div>
  );
}

function Today({ to, voiceLib }) {
  const cards = [
    ["packs", "📱", "Real-life phrases", "Calling India, Ajji visiting, the temple, festivals, weddings, a trip to Karnataka"],
    ["words", "🎨", "Picture words", `${THEMES.length} themes: colours, family, food, animals and more`],
    ["stories", "📖", "Picture stories", `${STORIES.length} stories with pictures and English`],
    ["print", "🖨️", "Printables", "Phrase sheets, letter tracing, the fridge sheet"],
  ];
  return (
    <>
      <WordOfDay variant="general" voiceLib={voiceLib} />
      <div className="corner-grid">
        {cards.map(([k, icon, t, sub]) => (
          <button key={k} className="corner-tile" onClick={() => to(k)}><span className="ct-icon" aria-hidden="true">{icon}</span><b>{t}</b><small>{sub}</small></button>
        ))}
      </div>
    </>
  );
}

function Words({ themeId, to, voiceLib }) {
  const t = THEMES.find((x) => x.id === themeId);
  if (!t) return (
    <div className="theme-grid">
      {THEMES.map((x) => (
        <button key={x.id} className="theme-card" onClick={() => to("words", x.id)}>
          <span className="tc-pics" aria-hidden="true">{x.words.slice(0, 3).map((w) => w[3]).join("")}</span>
          <b>{x.en}</b><small className="kn">{x.kn}</small>
        </button>
      ))}
    </div>
  );
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ margin: 0 }}>{t.en} <span className="kn" style={{ fontWeight: 500 }}>{t.kn}</span></h2><button className="btn quiet small" onClick={() => to("words")}><ArrowLeft size={16} /> All themes</button></div>
      <div className="word-grid">
        {t.words.map(([kn, rom, en, pic]) => (
          <button key={kn} className="word-tile" onClick={() => playWord(kn, voiceLib)} aria-label={`${en}, ${rom}`}>
            <span className="wt-pic" aria-hidden="true">{pic}</span><b className="kn">{kn}</b><small>{rom} · {en}</small>
          </button>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0, textAlign: "center" }}>Tap a picture to hear it, then say it out loud.</p>
    </div>
  );
}

function Stories({ id, to, voiceLib }) {
  const st = STORIES.find((x) => x.id === id);
  if (st) return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ margin: 0 }}>{st.pic} {st.en}</h2><button className="btn quiet small" onClick={() => to("stories")}><ArrowLeft size={16} /> All stories</button></div>
      <StoryBook key={st.id} story={st} voiceLib={voiceLib} onFinish={() => to("stories")} />
    </div>
  );
  return (
    <div className="story-list">
      {STORIES.map((x) => (
        <button key={x.id} className="story-item" onClick={() => to("stories", x.id)}>
          <span className="pic" aria-hidden="true">{storyPics(x)[0] ? x.pic : x.pic}</span>
          <span><b style={{ fontSize: 18 }}>{x.en}</b><span className="kn small muted" style={{ display: "block" }}>{x.kn}</span></span>
          <ArrowRight />
        </button>
      ))}
    </div>
  );
}

function Printables() {
  const { say, school } = useApp();
  const [busy, setBusy] = useState("");
  const items = [
    ["packs", "📱", "Real-life phrase packs", "All 12 packs, one a page"],
    ["fridge", "🧲", "The fridge sheet", "The 40 most useful phrases on one page"],
    ["letters", "✏️", "Letter tracing", "The alphabet with arrows and start dots"],
  ];
  async function get(part) {
    setBusy(part);
    try {
      const P = await import("../lib/packetPdf.js");
      const bytes = part === "packs" ? await P.packsPdf({ packs: PACKS, school: school && school.schoolName }) : await P.adultWorkbookPdf({ units: UNITS, levels: ADULT_LEVELS, school: school && school.schoolName, part });
      const r = await saveFile(`ChiliPili-${part}.pdf`, bytes, "application/pdf");
      if (r === "saved") say("Saved. Print it, or open it on a tablet.");
    } catch (e) { say(String(e.message || e), true); }
    setBusy("");
  }
  return (
    <div className="card">
      <ul className="print-list">
        {items.map(([k, icon, t, sub]) => (
          <li key={k}><span className="pl-icon" aria-hidden="true">{icon}</span><div className="grow"><b>{t}</b><div className="small muted">{sub}</div></div>
            <button className="btn ghost small" disabled={!!busy} onClick={() => get(k)}><Download size={16} /> {busy === k ? "…" : "PDF"}</button></li>
        ))}
      </ul>
      <p className="small muted" style={{ margin: 0 }}>Weekly packets for children and lesson sheets for grown-ups are in the Parent and Learning corners after you sign in.</p>
    </div>
  );
}
