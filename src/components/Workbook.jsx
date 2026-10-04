import { useState } from "react";
import { Download } from "lucide-react";
import { useApp } from "../lib/hooks.js";
import { saveFile } from "../lib/files.js";
import { friendlyError } from "../App.jsx";
import { UNITS, ADULT_LEVELS, nextUnit, doneUnits } from "../lib/adult.js";

// Grown-ups' printables. Talking first: phrase sheets and conversation cards, letters optional.
export default function WorkbookCard({ child, strokeLib = {}, compact = false, full = false }) {
  const { say, school } = useApp();
  const [busy, setBusy] = useState("");
  const done = doneUnits(child || {});
  const cur = nextUnit(child || {}) || UNITS.filter((u) => done[u.id]).slice(-1)[0] || UNITS[0];
  const items = [
    ["lesson", "📄", `This week's lesson: ${cur.en}`, "Phrases, the conversation and a tip. Two pages."],
    ["fridge", "🧲", "The fridge sheet", "The 40 phrases you'll use most, on one page."],
    ["cards", "🎭", "Conversation cards", "Every lesson as a short script to act out with your partner."],
    ["packs", "📱", "Real-life phrase packs", "Calls to India, the temple, weddings, visiting Karnataka and more. One pack a page."],
    ["phrases", "🗣️", "All phrase sheets", `All ${UNITS.length} lessons, how to say each phrase.`],
    ["letters", "✏️", "Letter tracing", "The alphabet with arrows, for when you're curious about the script."],
  ];
  const shown = full ? items : items.slice(0, 3);
  async function get(part) {
    setBusy(part);
    try {
      const { adultWorkbookPdf, workbookFileName, packsPdf } = await import("../lib/packetPdf.js");
      const { PACKS } = await import("../lib/packs.js");
      const bytes = part === "packs" ? await packsPdf({ packs: PACKS, school: school && school.schoolName }) : await adultWorkbookPdf({ child, units: UNITS, levels: ADULT_LEVELS, strokeLib, school: school && school.schoolName, part, unit: cur });
      const r = await saveFile(workbookFileName(child).replace(".pdf", `-${part === "lesson" ? "lesson-" + (UNITS.indexOf(cur) + 1) : part}.pdf`), bytes, "application/pdf");
      if (r === "saved") say("Saved. Print it, or open it on a tablet.");
      else if (r === "declined") say("Not saved.", true);
    } catch (e) { say(friendlyError(e), true); }
    setBusy("");
  }
  return (
    <div className={compact ? "stack-s" : "kid-card"} style={compact ? undefined : { gap: 10 }}>
      <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <span aria-hidden="true" style={{ fontSize: 30 }}>🖨️</span>
        <div><b style={{ fontSize: 18 }}>Printables</b><div className="small muted">Paper helps it stick. Talk first: the letters can wait.</div></div>
      </div>
      <ul className="print-list">
        {shown.map(([k, icon, title, sub]) => (
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
