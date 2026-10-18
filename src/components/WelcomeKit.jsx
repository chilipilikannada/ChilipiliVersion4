import { useState } from "react";
import { Download, X, Package } from "lucide-react";
import { useApp, firstName } from "../lib/hooks.js";
import { saveFile } from "../lib/files.js";
import { friendlyError } from "../App.jsx";

// Everything a new family needs on day one, ready to print, and the whole lot in one PDF for offline practice.
const KID_ITEMS = [
  ["letter", "💌", "A welcome letter, in Kannada", "ನಮಸ್ಕಾರ! A note from us to your family, Kannada with English. 1 page."],
  ["guide", "🌼", "Start here: a guide for parents", "How the app works, a 10-minute daily rhythm, and 10 ways to keep Kannada fun at home. 2 pages."],
  ["alphabet", "🔤", "Alphabet chart for the fridge", "All the letters with pictures and sounds. 1 page."],
  ["tracing", "✏️", "Letter tracing book", "Every vowel and consonant: dots to trace, then write alone. 10 pages."],
  ["say3", "🗣️", "Say it 3 times", "Picture words to say out loud, colouring a circle each time. 3 pages."],
  ["wordtrace", "🔡", "Trace simple words", "ಮರ, ಕಮಲ, ಗಜ... words with letters only. 3 pages."],
  ["cards", "🃏", "Picture word cards", "108 everyday words in 18 themes: family, food, colours, fruits, vegetables, animals and more. Cut out and play. 9 pages."],
  ["labels", "🏷️", "Label your home", "24 stickers for the door, window, chair, plate... 1 page."],
  ["packets", "📦", "Month 1 packets", "Weeks 1 to 3 of your child's paper packets: letters, words, a story and sentences."],
];
const ADULT_ITEMS = [
  ["letter", "💌", "A welcome letter, in Kannada", "ನಮಸ್ಕಾರ! A note from us, Kannada with English. 1 page."],
  ["guide", "🌼", "Start here: learning as a grown-up", "How to use the Learning corner and build a 15-minute habit. 1 page."],
  ["alphabet", "🔤", "Alphabet chart", "Every letter with its sound. Keep it by your desk. 1 page."],
  ["tracing", "✏️", "Letter tracing book", "Every vowel and consonant with start dots. Write a few every day. 10 pages."],
  ["say3", "🗣️", "Say it 3 times", "40 everyday phrases to read out loud, colouring a circle each time."],
  ["fridge", "🧲", "The fridge sheet", "The 40 phrases you'll use most, on one page."],
  ["phrases", "🗣️", "All phrase sheets", "Every lesson's phrases, how to say each one."],
  ["acards", "🎭", "Conversation cards", "Every lesson as a short script to act out with your partner."],
  ["cards", "🃏", "Picture word cards", "108 everyday words to learn with your family."],
  ["labels", "🏷️", "Label your home", "24 labels to stick around the house."],
];
const KID_ALL = ["letter", "guide", "alphabet", "tracing", "say3", "wordtrace", "cards", "labels", "packets"];
const ADULT_ALL = ["letter", "guide", "alphabet", "tracing", "say3", "fridge", "phrases", "acards", "cards", "labels"];

async function makePart(part, { child, adult, strokeLib, school }) {
  const M = await import("../lib/packetPdf.js");
  if (adult && ["fridge", "phrases", "acards"].includes(part)) {
    const A = await import("../lib/adult.js");
    return M.adultWorkbookPdf({ child, units: A.UNITS, levels: A.ADULT_LEVELS, strokeLib, school, part: part === "acards" ? "cards" : part });
  }
  if (part === "packets") {
    const { packetFor, isMeetWeek } = await import("../lib/plan.js");
    const { journeyUnit } = await import("../lib/journey.js");
    const { easyOf } = await import("../lib/course.js");
    const out = [];
    for (let w = 1, j = 1; w <= 4; w++) {
      if (isMeetWeek(w)) continue;
      const c = { ...child, journey: { ...(child.journey || {}), day: j } };
      const pk0 = packetFor(child, w);
      out.push(await M.packetPdf({ child, pk: { ...pk0, unit: journeyUnit(c) }, strokeLib, school, easy: easyOf(child) }));
      j += 5;
    }
    return M.mergePdfs(out, "Month 1 packets");
  }
  const { THEMES } = await import("../lib/course.js");
  const { ALPHABET } = await import("../lib/content.js");
  const { LETTER_PIC, PLAIN_WORDS } = await import("../lib/journey.js");
  const A = await import("../lib/adult.js");
  const sayList = adult ? A.UNITS.flatMap((u) => u.phrases).slice(0, 40).map(([kn, rom, en]) => [kn, rom, en, ""]) : THEMES.slice(0, 6).flatMap((t) => t.words);
  return M.welcomeKitPdf({ part, adult, school, themes: THEMES, alphabet: ALPHABET, letterPic: LETTER_PIC, strokeLib, sayList, plainWords: PLAIN_WORDS.slice(0, 15) });
}

export default function WelcomeKit({ child, adult = false, onClose, strokeLib = {} }) {
  const { say, school } = useApp();
  const [busy, setBusy] = useState("");
  const items = adult ? ADULT_ITEMS : KID_ITEMS;
  const opts = { child, adult, strokeLib, school: school && school.schoolName };
  const nm = firstName(child && child.name);
  async function save(name, bytes) {
    const r = await saveFile(name, bytes, "application/pdf");
    if (r === "saved") say("Saved. Print it, or keep it on a tablet for offline practice.");
    else if (r === "declined") say("Not saved.", true);
  }
  async function get(part) {
    setBusy(part);
    try { await save(`chilipili-${part}.pdf`, await makePart(part, opts)); } catch (e) { say(friendlyError(e), true); }
    setBusy("");
  }
  async function getAll() {
    setBusy("all");
    try {
      const { mergePdfs } = await import("../lib/packetPdf.js");
      const parts = [];
      for (const k of adult ? ADULT_ALL : KID_ALL) parts.push(await makePart(k, opts));
      await save(`chilipili-welcome-kit-${(nm || "family").toLowerCase()}.pdf`, await mergePdfs(parts, "Chili Pili welcome kit"));
    } catch (e) { say(friendlyError(e), true); }
    setBusy("");
  }
  return (
    <div className="card welcome-kit">
      <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <span aria-hidden="true" style={{ fontSize: 34 }}>🎁</span>
        <div className="grow"><b style={{ fontSize: 19 }}>Your welcome kit{nm && !adult ? ` for ${nm}` : ""}</b><div className="small muted">Print it on day one, or keep it on a tablet. Everything works offline too.</div></div>
        {onClose && <button className="icon-btn" onClick={onClose} aria-label="Hide the welcome kit"><X size={18} /></button>}
      </div>
      <div className="wk-hello">
        <b className="kn">{adult ? "ಕನ್ನಡ ಕಲಿಯಲು ನೀವು ನಿರ್ಧರಿಸಿದ್ದು ನಮಗೆ ತುಂಬಾ ಸಂತೋಷ ತಂದಿದೆ!" : "ನಿಮ್ಮ ಮಕ್ಕಳಿಗೆ ಕನ್ನಡ ಕಲಿಸಲು ನೀವು ನಿರ್ಧರಿಸಿದ್ದು ನಮಗೆ ತುಂಬಾ ಸಂತೋಷ ತಂದಿದೆ!"}</b>
        <span className="small">{adult ? "We are so happy that you decided to learn Kannada!" : "We are so happy that you decided to teach your children Kannada!"} 🦜💛❤️</span>
      </div>
      <div className="wk-packs">
        <a className="btn primary" href={adult ? "/kit/chilipili-grownups-practice-pack.pdf" : "/kit/chilipili-kids-practice-pack.pdf"} download target="_blank" rel="noopener"><Package size={18} /> Printable practice pack</a>
        {!adult && <a className="btn yellow" href="/kit/chilipili-kids-month-1-packets.pdf" download target="_blank" rel="noopener">📦 Month 1 packets</a>}
      </div>
      <p className="tiny muted" style={{ margin: 0 }}>{adult ? "Tracing, \"say it 3 times\" phrase sheets, the fridge sheet and conversation cards." : "Tracing every letter, \"say it 3 times\" picture words, simple words to trace, picture cards and home labels."} Print and practise offline. Or make one with {nm ? `${nm}'s` : "your"} name on it:</p>
      <button className="btn ghost block" disabled={!!busy} onClick={getAll}>{busy === "all" ? "Making your kit… (about a minute)" : `Personalised kit${nm && !adult ? ` for ${nm}` : ""} (one PDF)`}</button>
      <ul className="print-list">
        {items.map(([k, icon, title, sub]) => (
          <li key={k}>
            <span aria-hidden="true" className="pl-icon">{icon}</span>
            <div className="grow"><b>{title}</b><div className="small muted">{sub}</div></div>
            <button className="btn ghost small" disabled={!!busy} onClick={() => get(k)} aria-label={`Download ${title}`}><Download size={16} /> {busy === k ? "…" : "PDF"}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
