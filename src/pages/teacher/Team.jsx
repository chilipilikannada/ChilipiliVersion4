import { useMemo, useState } from "react";
import { Plus, Copy, UserPlus, Trash2, School, Users } from "lucide-react";
import { useApp, firstName } from "../../lib/hooks.js";
import { store } from "../../lib/store/index.js";
import { Avatar, Btn } from "../../components/ui.jsx";
import { friendlyError } from "../../App.jsx";
import { isAdult } from "../../lib/adult.js";

// Teachers and guides each look after one or more classes. A family joins a class with its code; families
// without a class are self-paced, the app runs on its own for them, and their messages come to the admin.
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeCode = () => Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
const norm = (e) => String(e || "").trim().toLowerCase();
const copy = async (text, say) => { try { await navigator.clipboard.writeText(text); say("Copied."); } catch { say(text); } };
export const classInvite = (c, origin) => `ನಮಸ್ಕಾರ! Join our Kannada class "${c.name}" on Chili Pili Kannada Kali: ${origin}\nSign in, add your child (or yourself), and type this class code: ${c.code}`;

export default function Team({ data }) {
  const { say } = useApp();
  const classes = useMemo(() => [...(data.classes || [])].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), [data.classes]);
  const staff = useMemo(() => [...(data.staff || [])].sort((a, b) => (a.at || 0) - (b.at || 0)), [data.staff]);
  const kids = data.children || [];
  const count = (id) => kids.filter((c) => c.classId === id).length;
  const selfPaced = kids.filter((c) => !c.classId && c.status === "active");
  const [nc, setNc] = useState({ name: "", region: "" });
  const [ns, setNs] = useState({ email: "", name: "", classId: "" });
  const origin = typeof location !== "undefined" ? location.origin : "";

  async function addClass() {
    const name = nc.name.trim(); if (!name) return say("Give the class a name, like “Dallas Saturday kids”.", true);
    try {
      let code = makeCode();
      for (let i = 0; i < 5 && (await store.get("classCodes", code).catch(() => null)); i++) code = makeCode();
      const id = await store.add("classes", { name, region: nc.region.trim(), code, teacherEmails: [], createdAt: Date.now() });
      await store.set("classCodes", code, { classId: id, at: Date.now() });
      setNc({ name: "", region: "" }); say(`Class “${name}” created. Its code is ${code}.`);
    } catch (e) { say(friendlyError(e), true); }
  }
  async function removeClass(c) {
    if (count(c.id)) return say("Move its families to another class (or self-paced) first.", true);
    if (!confirm(`Delete the class “${c.name}”? Its code stops working.`)) return;
    try {
      for (const t of staff.filter((s) => (s.classes || []).includes(c.id))) await store.merge("staff", t.id, { classes: (t.classes || []).filter((x) => x !== c.id) });
      await store.remove("classCodes", c.code).catch(() => {});
      await store.remove("classes", c.id); say("Class deleted.");
    } catch (e) { say(friendlyError(e), true); }
  }
  // Keep both sides in step: the teacher's list of classes and the class's list of teachers.
  async function assign(t, classId, on) {
    try {
      const cls = classes.find((c) => c.id === classId); if (!cls) return;
      const tc = new Set(t.classes || []); on ? tc.add(classId) : tc.delete(classId);
      const ce = new Set(cls.teacherEmails || []); on ? ce.add(t.id) : ce.delete(t.id);
      await store.merge("staff", t.id, { classes: [...tc] });
      await store.merge("classes", classId, { teacherEmails: [...ce] });
    } catch (e) { say(friendlyError(e), true); }
  }
  async function addTeacher() {
    const email = norm(ns.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return say("Type the teacher's full email address.", true);
    try {
      const t = { id: email, email, name: ns.name.trim() || email.split("@")[0], classes: [], active: true, at: Date.now() };
      await store.set("staff", email, { email, name: t.name, classes: [], active: true, at: t.at });
      if (ns.classId) await assign(t, ns.classId, true);
      setNs({ email: "", name: "", classId: "" });
      say(`${t.name} added. They sign in with ${email} and see their classes.`);
    } catch (e) { say(friendlyError(e), true); }
  }
  async function setActive(t, active) { try { await store.merge("staff", t.id, { active }); say(active ? `${t.name} can sign in as a teacher again.` : `${t.name} is paused: they see the family app only.`); } catch (e) { say(friendlyError(e), true); } }
  async function removeTeacher(t) {
    if (!confirm(`Remove ${t.name} as a teacher? Their classes stay, with you looking after them.`)) return;
    try { for (const id of t.classes || []) await assign(t, id, false); await store.remove("staff", t.id); say("Removed."); } catch (e) { say(friendlyError(e), true); }
  }
  async function moveChild(c, classId) {
    const cls = classes.find((x) => x.id === classId);
    try { await store.update("children", c.id, { classId: cls ? cls.id : "", classCode: cls ? cls.code : "" }); say(cls ? `${firstName(c.name)} is now in ${cls.name}.` : `${firstName(c.name)} is self-paced.`); } catch (e) { say(friendlyError(e), true); }
  }
  const teachersOf = (c) => staff.filter((s) => (s.classes || []).includes(c.id));

  return (
    <div className="stack">
      <div className="page-title"><h1>Teachers &amp; classes</h1>
        <p className="muted">You're the admin and see everyone. Each teacher or guide sees only the children in their own classes. Families join a class with its code; anyone without a class is <b>self-paced</b>: the app runs on its own, and their messages come to you.</p></div>

      <div className="team-stats">
        <div className="card"><b>{classes.length}</b><span>classes</span></div>
        <div className="card"><b>{staff.filter((s) => s.active !== false).length}</b><span>teachers &amp; guides</span></div>
        <div className="card"><b>{kids.filter((c) => c.classId).length}</b><span>in a class</span></div>
        <div className="card"><b>{selfPaced.length}</b><span>self-paced</span></div>
      </div>

      <div className="card">
        <h3 style={{ margin: 0 }}><School size={20} /> Classes</h3>
        <div className="team-form">
          <input className="input" placeholder="Class name, e.g. Dallas Saturday kids" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
          <input className="input" placeholder="Region (optional), e.g. Texas" value={nc.region} onChange={(e) => setNc({ ...nc, region: e.target.value })} />
          <Btn icon={Plus} onClick={addClass}>Create class</Btn>
        </div>
        {!classes.length && <p className="muted small" style={{ margin: 0 }}>No classes yet. Everyone is self-paced, which works fine for a small group.</p>}
        <div className="class-grid">
          {classes.map((c) => (
            <div key={c.id} className="class-card">
              <div className="row" style={{ justifyContent: "space-between" }}><div><b>{c.name}</b>{c.region && <div className="sub">{c.region}</div>}</div><span className="pill">{count(c.id)} {count(c.id) === 1 ? "learner" : "learners"}</span></div>
              <div className="class-code"><span className="sub">Class code</span><b>{c.code}</b>
                <button className="btn ghost small" onClick={() => copy(classInvite(c, origin), say)}><Copy size={15} /> Copy invite</button></div>
              <div className="sub">Teachers</div>
              <div className="chips">{staff.length ? staff.map((t) => {
                const on = (t.classes || []).includes(c.id);
                return <button key={t.id} className={`chip ${on ? "on" : ""}`} onClick={() => assign(t, c.id, !on)} aria-pressed={on}>{on ? "✓ " : "+ "}{t.name}</button>;
              }) : <span className="sub">Add a teacher below, then tap their name here.</span>}</div>
              {!teachersOf(c).length && <span className="sub">No teacher yet: you look after this class.</span>}
              <div><button className="btn quiet small" onClick={() => removeClass(c)}><Trash2 size={15} /> Delete class</button></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: 0 }}><UserPlus size={20} /> Teachers &amp; guides</h3>
        <p className="muted small" style={{ margin: 0 }}>Add their email. When they sign in with it (Google or an email code), they get the teacher view for their classes only: children, review, meets, messages and the class feed. They can't change settings, your voice or your handwriting.</p>
        <div className="team-form">
          <input className="input" type="email" placeholder="teacher@email.com" value={ns.email} onChange={(e) => setNs({ ...ns, email: e.target.value })} />
          <input className="input" placeholder="Name" value={ns.name} onChange={(e) => setNs({ ...ns, name: e.target.value })} />
          <select className="input" value={ns.classId} onChange={(e) => setNs({ ...ns, classId: e.target.value })}><option value="">Class (optional)</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <Btn icon={UserPlus} onClick={addTeacher}>Add</Btn>
        </div>
        <ul className="list">{staff.map((t) => (
          <li key={t.id}><Avatar name={t.name} size="sm" />
            <div className="grow"><b>{t.name}</b>{t.active === false && <span className="pill" style={{ marginLeft: 6 }}>paused</span>}<div className="sub">{t.email} · {(t.classes || []).map((id) => (classes.find((c) => c.id === id) || {}).name).filter(Boolean).join(", ") || "no class yet"}</div></div>
            <button className="btn ghost small" onClick={() => setActive(t, t.active === false)}>{t.active === false ? "Resume" : "Pause"}</button>
            <button className="btn quiet small" onClick={() => removeTeacher(t)} aria-label={`Remove ${t.name}`}><Trash2 size={15} /></button>
          </li>
        ))}</ul>
      </div>

      <div className="card">
        <h3 style={{ margin: 0 }}><Users size={20} /> Learners and their class</h3>
        <p className="muted small" style={{ margin: 0 }}>Move anyone into a class, or back to self-paced. Their new work goes to that class's teacher from then on.</p>
        <ul className="list">{[...kids].filter((c) => c.status === "active").sort((a, b) => (a.classId || "").localeCompare(b.classId || "") || String(a.name).localeCompare(String(b.name))).map((c) => (
          <li key={c.id}><Avatar name={c.name} size="sm" />
            <div className="grow"><b>{c.name}</b><div className="sub">{isAdult(c) ? "Grown-up" : `Age ${c.age || "?"}`} · {(c.parentEmails || [])[0]}</div></div>
            <select className="input" style={{ width: "auto", minHeight: 38, padding: "6px 10px" }} value={c.classId || ""} onChange={(e) => moveChild(c, e.target.value)} aria-label={`Class for ${c.name}`}>
              <option value="">Self-paced</option>{classes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </li>
        ))}</ul>
      </div>
    </div>
  );
}

// A teacher's own view: their classes, codes to share, and who is in each.
export function MyClasses({ data }) {
  const { profile, say } = useApp();
  const mine = (data.classes || []).filter((c) => (profile.classes || []).includes(c.id));
  const origin = typeof location !== "undefined" ? location.origin : "";
  return (
    <div className="stack">
      <div className="page-title"><h1>My classes</h1><p className="muted">Share a class code with families. When they type it while adding their child, the child joins your class and their work comes to you.</p></div>
      {!mine.length && <div className="card"><p style={{ margin: 0 }}>You don't have a class yet. Ask the admin to give you one.</p></div>}
      {mine.map((c) => {
        const list = (data.children || []).filter((k) => k.classId === c.id);
        return (
          <div key={c.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}><div><h3 style={{ margin: 0 }}>{c.name}</h3>{c.region && <div className="sub">{c.region}</div>}</div><span className="pill">{list.length} {list.length === 1 ? "learner" : "learners"}</span></div>
            <div className="class-code"><span className="sub">Class code</span><b>{c.code}</b><button className="btn ghost small" onClick={() => copy(classInvite(c, origin), say)}><Copy size={15} /> Copy invite</button></div>
            <ul className="list">{list.map((k) => <li key={k.id}><Avatar name={k.name} size="sm" /><div className="grow"><b>{k.name}</b><div className="sub">{isAdult(k) ? "Grown-up" : `Age ${k.age || "?"}`}</div></div></li>)}</ul>
          </div>
        );
      })}
      <div className="card"><p className="small muted" style={{ margin: 0 }}>Signed in as {profile.email}. <button className="btn quiet small" onClick={() => store.signOut()}>Sign out</button></p></div>
    </div>
  );
}
