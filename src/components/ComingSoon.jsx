import { Gini } from "./Art.jsx";

// A friendly "coming soon" card for features that open with the subscription.
const INFO = {
  gini: { icon: "🦜", en: "Talk with Gini", kn: "ಗಿಣಿ ಜೊತೆ ಮಾತು", what: "Have real conversations in Kannada with Gini. She plays Ajji on a call, Amma at the temple or a friend at a playdate, listens to what you say and gently helps you say it better." },
  translator: { icon: "🎙️", en: "Talk both ways", kn: "ಮಾತಿನ ಸೇತುವೆ", what: "Speak English and hear it in Kannada, or let Ajji speak Kannada and hear it in English. A bridge for every family conversation." },
};
export const SoonPill = () => <span className="soon-pill">Coming soon</span>;
export default function ComingSoon({ feature = "gini", compact = false, onBack }) {
  const f = INFO[feature] || INFO.gini;
  return (
    <div className={`soon-card ${compact ? "compact" : ""}`}>
      {!compact && <Gini className="gini" mood="cheer" />}
      <span className="soon-pill big">✨ Coming soon</span>
      <h2 style={{ margin: 0 }}>{f.icon} {f.en} <span className="kn" style={{ fontWeight: 500 }}>{f.kn}</span></h2>
      <p style={{ margin: 0 }}>{f.what}</p>
      <p className="small muted" style={{ margin: 0 }}>It's part of Chili Pili Plus, opening soon. Until then, practise with the lessons, picture words and real-life phrase packs: they're all free.</p>
      {onBack && <button className="btn primary" onClick={onBack}>Back</button>}
    </div>
  );
}
