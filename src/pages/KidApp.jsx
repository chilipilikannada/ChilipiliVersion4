import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useApp, useDoc, useWatch, useVoiceLib, useStrokeLib, firstName } from "../../lib/hooks.js";
import { store } from "../../lib/store/index.js";
import { Gini } from "../../components/Art.jsx";
import KidSpace from "./KidSpace.jsx";
import GrownupGate from "../../components/GrownupGate.jsx";

// A child signed in with their own code: only their space, nothing else.
export default function KidApp() {
  const { profile, route, go } = useApp();
  const child = useDoc("children", profile.kidId);
  const [activity] = useWatch("activity", [["childId", "==", profile.kidId]]);
  const voiceLib = useVoiceLib();
  const strokeLib = useStrokeLib();
  useEffect(() => { if (route[0] !== "kid" && route[0] !== "home") go("kid"); /* eslint-disable-next-line */ }, [route[0]]);
  if (child === undefined) return <div className="auth-wrap"><b>Loading…</b></div>;
  if (!child) return <Grownups name={profile.name} gone />;
  if (route[0] === "home") return <Grownups name={child.name} />;
  return <KidSpace fam={{ child, voiceLib, strokeLib, activity, subs: [], logs: [] }} />;
}

function Grownups({ name, gone }) {
  const { go } = useApp();
  const [gate, setGate] = useState(false);
  const out = () => store.signOut().then(() => go(""));
  return (
    <div className="auth-wrap">
      <div className="auth-card card" style={{ gap: 14, textAlign: "center", justifyItems: "center" }}>
        <Gini className="gini" />
        {gone ? <p>This number doesn't work any more. A grown-up can sign out here and sign in again.</p> : <h2>{firstName(name)}'s space</h2>}
        {!gone && <button className="btn primary" onClick={() => go("kid")}>Back to Gini</button>}
        <button className="btn ghost" onClick={() => (gone ? out() : setGate(true))}><LogOut size={18} /> Grown-ups: sign out</button>
      </div>
      {gate && <GrownupGate note={`This device is signed in with ${firstName(name)}'s number.`} onClose={() => setGate(false)}
        options={[{ key: "out", icon: "🚪", label: `Sign ${firstName(name)} out of this device`, sub: "Then a parent can sign in with Google or an email code", kind: "main", onClick: out }]} />}
    </div>
  );
}
