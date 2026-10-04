import { useEffect, useMemo, useState } from "react";
import ProgramPlan from "../../components/ProgramPlan.jsx";
import BrandName from "../../components/BrandName.jsx";
import { Home, Users, GraduationCap, Globe, ChevronDown, LogOut } from "lucide-react";
import GeneralCorner from "../General.jsx";
import WorkbookCard from "../../components/Workbook.jsx";
import { PackList, PackView } from "../../components/Packs.jsx";
import { packById } from "../../lib/packs.js";
import { useApp, useWatch, useVoiceLib, useStrokeLib, usePacketFiles, firstName } from "../../lib/hooks.js";
import { store } from "../../lib/store/index.js";
import { Logo, LetterSky } from "../../components/Art.jsx";
import { Avatar, Modal } from "../../components/ui.jsx";
import Onboarding from "./Onboarding.jsx";
import HomePage from "./Home.jsx";
import Packets from "./Packets.jsx";
import Meets from "./Meets.jsx";
import Messages from "./Messages.jsx";
import ChildPage from "./Child.jsx";
import KidSpace from "../kid/KidSpace.jsx";
import { isAdult, UNITS } from "../../lib/adult.js";

// Four corners. The bottom bar moves between them; Parent and Learning have their own sub-tabs.
const CORNERS = [
  ["", "Home", Home],
  ["home", "Parent", Users],
  ["learn", "Learning", GraduationCap],
  ["general", "General", Globe],
];
const PARENT_TABS = [["home", "Overview"], ["packets", "Packets"], ["meets", "Meets"], ["messages", "Messages"], ["child", "Profile"]];
const LEARN_TABS = [["learn", "My lessons"], ["printables", "Printables"], ["meets", "Meets"], ["messages", "Messages"], ["child", "Profile"]];
const PARENT_ROUTES = ["home", "packets", "plan", "packs"];
const LEARN_ROUTES = ["learn", "printables"];

export default function ParentApp() {
  const { profile, route, go } = useApp();
  const me = [["parentEmails", "array-contains", profile.email]];
  const [children, loadingKids] = useWatch("children", me);
  const [subs] = useWatch("submissions", me);
  const [activity] = useWatch("activity", me);
  const [logs] = useWatch("stageLogs", me);
  const [notes] = useWatch("meetNotes", me);
  const [messages] = useWatch("messages", me);
  const [meets] = useWatch("meets", []);
  const [posts] = useWatch("posts", []);
  const voiceLib = useVoiceLib();
  const strokeLib = useStrokeLib();
  const packetFiles = usePacketFiles();

  const [sel, setSel] = useState(() => { try { return localStorage.getItem("chilipili-child") || ""; } catch { return ""; } });
  const [picker, setPicker] = useState(false);
  const all = useMemo(() => [...children].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), [children]);
  const kidsOnly = all.filter((c) => !isAdult(c)), adults = all.filter(isAdult);
  const tab = route[0] || "";
  // Which corner we're in decides whose page it is: a child in the Parent corner, me in the Learning corner.
  const [corner, setCorner] = useState(() => (LEARN_ROUTES.includes(route[0]) ? "learn" : "parent"));
  useEffect(() => { if (PARENT_ROUTES.includes(tab)) setCorner("parent"); else if (LEARN_ROUTES.includes(tab)) setCorner("learn"); }, [tab]);
  const pool = corner === "learn" ? adults : kidsOnly;
  const child = (tab === "kid" || tab === "" ? all.find((c) => c.id === sel) : null) || pool.find((c) => c.id === sel) || pool[0] || all.find((c) => c.id === sel) || all[0] || null;
  useEffect(() => { if (child && child.id !== sel) setSel(child.id); }, [child && child.id]);
  useEffect(() => { if (child) try { localStorage.setItem("chilipili-child", child.id); } catch {} }, [child]);

  const fam = { child, kids: all, subs, activity, logs, notes, messages, meets, posts, voiceLib, strokeLib, packetFiles, setSel };

  if (loadingKids) return <div className="auth-wrap"><b>Loading…</b></div>;
  if (!all.length || route[0] === "add") return <Onboarding first={!all.length} onDone={(id) => { setSel(id); go(""); }} />;
  if (tab === "kid" && child) return <KidSpace fam={fam} />;

  const unreadTeacher = child ? messages.filter((m) => m.childId === child.id && m.fromRole !== "parent" && m.at > (Number(localStorage.getItem("chilipili-read-" + child.id)) || 0)).length : 0;
  const inParent = corner === "parent" && ["home", "packets", "plan", "packs", "meets", "messages", "child"].includes(tab);
  const inLearn = corner === "learn" && ["learn", "printables", "meets", "messages", "child"].includes(tab);
  const activeCorner = tab === "" ? "" : tab === "general" ? "general" : inLearn ? "learn" : inParent ? "home" : tab;
  const needKid = inParent && !kidsOnly.length, needMe = inLearn && !adults.length;
  const Page = tab === "" ? Hub : tab === "general" ? GeneralTab : needKid ? NoKid : needMe ? NoMe
    : { plan: PlanPage, home: HomePage, learn: HomePage, packets: Packets, printables: PrintablesPage, packs: PacksPage, meets: Meets, messages: Messages, child: ChildPage }[tab] || Hub;
  const sub = inParent && !needKid ? PARENT_TABS : inLearn && !needMe ? LEARN_TABS : null;
  return (
    <div className="shell">
      <LetterSky opacity={0.1} count={30} />
      <header className="appbar">
        <div className="appbar-in">
          <button className="brand" onClick={() => go("")}><Logo /><BrandName light /></button>
          <span className="spacer" />
          {sub && child && pool.length > 1 ? (
            <button className="child-switch" onClick={() => setPicker(true)} aria-label="Switch learner"><Avatar name={child.name} size="sm" /> {firstName(child.name)} <ChevronDown size={16} /></button>
          ) : <button className="child-switch" onClick={() => setPicker(true)} aria-label="Menu"><Avatar name={profile.name || profile.email} size="sm" /> <ChevronDown size={16} /></button>}
        </div>
        <div className="kasuti on-red" />
      </header>
      <div className="body">
        <nav className="sidenav" aria-label="Corners">
          {CORNERS.map(([k, l, I]) => <button key={k || "hub"} aria-current={activeCorner === k ? "page" : undefined} onClick={() => go(k)}><I />{l}</button>)}
        </nav>
        <main className="main">
          {sub && (
            <div className="corner-sub">
              <div className="cs-title">{corner === "learn" ? "📚 Learning corner" : "👪 Parent corner"}{child && <span className="muted"> · {firstName(child.name)}</span>}</div>
              <div className="cs-tabs" role="tablist">{sub.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)}>{l}{k === "messages" && unreadTeacher ? <span className="cs-dot">{unreadTeacher}</span> : null}</button>)}</div>
            </div>
          )}
          <Page fam={fam} />
        </main>
      </div>
      <nav className="bottomnav" aria-label="Corners">
        {CORNERS.map(([k, l, I]) => <button key={k || "hub"} aria-current={activeCorner === k ? "page" : undefined} onClick={() => go(k)}><I />{l}</button>)}
      </nav>
      {picker && (
        <Modal title="Learners" onClose={() => setPicker(false)}>
          <ul className="list">
            {all.map((k) => (
              <li key={k.id}>
                <Avatar name={k.name} />
                <div className="grow"><b>{k.name}</b><div className="sub">{isAdult(k) ? "Me · Learning corner" : k.status === "active" ? `Kid's corner · ${k.group || ""}` : "Waiting for the teacher"}</div></div>
                <button className="btn small ghost" onClick={() => { setSel(k.id); setPicker(false); go(isAdult(k) ? "learn" : "home"); }}>{k.id === (child && child.id) ? "Open" : "Switch"}</button>
              </li>
            ))}
          </ul>
          <button className="btn ghost" onClick={() => { setPicker(false); go("add"); }}>Add a learner (a child, or me)</button>
          <button className="btn quiet" onClick={() => store.signOut()}><LogOut size={18} /> Sign out ({profile.email})</button>
        </Modal>
      )}
    </div>
  );
}

// Home after sign-in: four doors.
function Hub({ fam }) {
  const { go, profile } = useApp();
  const kids = fam.kids.filter((c) => !isAdult(c)), me = fam.kids.find(isAdult);
  const open = (c, where) => { fam.setSel(c.id); go(where); };
  return (
    <div className="stack">
      <div className="hub-hello"><h1 style={{ margin: 0 }}><span className="kn">ನಮಸ್ಕಾರ</span>{profile.name ? `, ${firstName(profile.name)}` : ""}!</h1><p className="muted" style={{ margin: 0 }}>Where would you like to go?</p></div>
      <div className="doors">
        <div className="door kids">
          <span className="door-icon" aria-hidden="true">🦜</span>
          <b>Kid's corner</b><small>Today's mission, letters, stories and games with Gini</small>
          {kids.length ? <div className="door-kids">{kids.map((k) => <button key={k.id} className="btn yellow small" onClick={() => open(k, "kid")}>Open {firstName(k.name)}'s corner</button>)}</div>
            : <button className="btn yellow small" onClick={() => go("add")}>Add a child</button>}
        </div>
        <button className="door parent" onClick={() => (kids.length ? open(kids[0], "home") : go("add"))}>
          <span className="door-icon" aria-hidden="true">👪</span><b>Parent corner</b><small>{kids.length ? "Progress, the 6-month plan, packets, meets and messages" : "Add your child to start"}</small>
        </button>
        <button className="door learn" onClick={() => (me ? open(me, "learn") : (sessionStorage.setItem("chilipili-intent", "adult"), go("add")))}>
          <span className="door-icon" aria-hidden="true">📚</span><b>Learning corner</b><small>{me ? "Your own Kannada lessons and printables" : "Learn Kannada yourself: start your course"}</small>
        </button>
        <button className="door general" onClick={() => go("general")}>
          <span className="door-icon" aria-hidden="true">🌐</span><b>General corner</b><small>Real-life phrases, picture words, stories, printables</small>
        </button>
      </div>
    </div>
  );
}
function GeneralTab({ fam }) { return <GeneralCorner voiceLib={fam.voiceLib} />; }
function NoKid() { const { go } = useApp(); return <div className="card" style={{ textAlign: "center", justifyItems: "center" }}><span style={{ fontSize: 48 }}>👪</span><h2 style={{ margin: 0 }}>Parent corner</h2><p className="muted" style={{ margin: 0 }}>Add your child to see their progress, plan and packets here.</p><button className="btn primary" onClick={() => go("add")}>Add a child</button></div>; }
function NoMe() { const { go } = useApp(); return <div className="card" style={{ textAlign: "center", justifyItems: "center" }}><span style={{ fontSize: 48 }}>📚</span><h2 style={{ margin: 0 }}>Learning corner</h2><p className="muted" style={{ margin: 0 }}>Learn Kannada yourself: everyday conversation for talking with your partner and family, at your own pace.</p><button className="btn primary" onClick={() => { try { sessionStorage.setItem("chilipili-intent", "adult"); } catch {} go("add"); }}>Start my course</button></div>; }

// The whole six months for the selected learner.
function PlanPage({ fam }) {
  const { go } = useApp();
  const { child } = fam;
  const adult = isAdult(child);
  return (
    <div className="stack">
      <div className="page-title"><h1>{adult ? "My course" : `${firstName(child.name)}'s 6-month plan`}</h1><p className="muted" style={{ margin: 0 }}>Everything in the program, week by week. ✓ done · ★ this week.</p></div>
      <ProgramPlan child={child} onLesson={adult ? (u) => go("kid", "unit", String(UNITS.indexOf(u) + 1)) : undefined} />
    </div>
  );
}

// Grown-up learners: everything to print.
function PrintablesPage({ fam }) {
  return (
    <div className="stack">
      <div className="page-title"><h1>Printables</h1><p className="muted" style={{ margin: 0 }}>Print once, keep by the fridge, practise with your partner. New lesson sheets every week.</p></div>
      <div className="card"><WorkbookCard child={fam.child} strokeLib={fam.strokeLib} compact full /></div>
    </div>
  );
}

// Real-life phrases for the whole family (parents see every pack).
function PacksPage({ fam }) {
  const { route, go } = useApp();
  const pk = packById(route[1]);
  return (
    <div className="stack">
      <div className="page-title"><h1>Real-life Kannada</h1><p className="muted" style={{ margin: 0 }}>Phrases for the moments that matter: calls to India, grandparents visiting, the temple, festivals, weddings, a trip home. Hear them, practise with Gini, print them.</p></div>
      {pk ? <PackView key={pk.id} pack={pk} voiceLib={fam.voiceLib} onBack={() => go("packs")} /> : <PackList onOpen={(x) => go("packs", x.id)} />}
    </div>
  );
}
