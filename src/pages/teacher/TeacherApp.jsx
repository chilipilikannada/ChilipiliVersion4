import { useMemo } from "react";
import BrandName from "../../components/BrandName.jsx";
import { LayoutDashboard, Users, Inbox, CalendarHeart, MessageCircle, Megaphone, AudioLines, Settings as Cog, BarChart3, PenLine, FileText, Map as MapIcon, School, Home as HomeIcon } from "lucide-react";
import { useApp, useWatch, useWatchAny, useVoiceLib, useStrokeLib, usePacketFiles } from "../../lib/hooks.js";
import Team, { MyClasses } from "./Team.jsx";
import { Logo } from "../../components/Art.jsx";
import { Avatar } from "../../components/ui.jsx";
import Today from "./Today.jsx";
import Families from "./Families.jsx";
import Review from "./Review.jsx";
import Meets from "./Meets.jsx";
import Inboxes from "./Inboxes.jsx";
import Feed from "./Feed.jsx";
import Voice from "./Voice.jsx";
import Settings from "./Settings.jsx";
import Summary from "./Summary.jsx";
import Handwriting from "./Handwriting.jsx";
import Sheets from "./Sheets.jsx";
import CoursePlan from "./CoursePlan.jsx";
import { meetState } from "../parent/Meets.jsx";

const TABS = [
  ["today", "Today", LayoutDashboard],
  ["families", "Children", Users],
  ["summary", "Class summary", BarChart3],
  ["review", "Review", Inbox],
  ["sheets", "Packets", FileText],
  ["plan", "Course plan", MapIcon],
  ["meets", "Meets", CalendarHeart],
  ["messages", "Messages", MessageCircle],
  ["feed", "Class feed", Megaphone],
  ["handwriting", "My handwriting", PenLine],
  ["voice", "My voice", AudioLines],
  ["team", "Teachers & classes", School],
  ["settings", "Settings", Cog],
];
// Only the admin records the reference voice and handwriting, uploads worksheets and changes settings.
const ADMIN_ONLY = ["handwriting", "voice", "sheets", "settings", "team"];
const MOBILE = ["today", "families", "review", "meets", "messages"];

export default function TeacherApp() {
  const { profile, route, go, isAdmin, setView } = useApp();
  // The admin sees every family; a teacher only the classes they've been given.
  const scope = isAdmin ? null : (profile.classes || []);
  const [children] = useWatchAny("children", "classId", scope);
  const [subs] = useWatchAny("submissions", "classId", scope);
  const [activity] = useWatchAny("activity", "classId", scope);
  const [logs] = useWatchAny("stageLogs", "classId", scope);
  const [notes] = useWatchAny("meetNotes", "classId", scope);
  const [messages] = useWatchAny("messages", "classId", scope);
  const [allMeets] = useWatch("meets", []);
  const [allPosts] = useWatch("posts", []);
  const [users] = useWatch("users", isAdmin ? [] : null);
  const [phrases] = useWatchAny("phrases", "classId", scope);
  const [classes] = useWatch("classes", []);
  const [staff] = useWatch("staff", isAdmin ? [] : null);
  const mineOnly = (x) => isAdmin || !x.classId || (scope || []).includes(x.classId);
  const meets = useMemo(() => allMeets.filter(mineOnly), [allMeets, isAdmin, scope && scope.join()]);
  const posts = useMemo(() => allPosts.filter(mineOnly), [allPosts, isAdmin, scope && scope.join()]);
  const voiceLib = useVoiceLib();
  const strokeLib = useStrokeLib();
  const packetFiles = usePacketFiles();
  const data = { children, subs, activity, logs, notes, messages, meets, posts, users, voiceLib, strokeLib, packetFiles, phrases, classes, staff };

  const tabs = isAdmin ? TABS : [...TABS.filter(([k]) => !ADMIN_ONLY.includes(k)), ["classes", "My classes", School]];
  const tab = tabs.some(([k]) => k === (route[0] || "today")) ? route[0] || "today" : "today";
  const badges = useMemo(() => {
    const lastRead = (id) => { try { return Number(localStorage.getItem("chilipili-tread-" + id)) || 0; } catch { return 0; } };
    return {
      families: children.filter((c) => c.status === "pending").length,
      review: subs.filter((s) => s.status === "sent").length,
      meets: meets.filter((m) => m.status !== "cancelled" && meetState(m) === "ended" && !m.writtenUp).length,
      messages: new Set(messages.filter((m) => m.fromRole === "parent" && m.at > lastRead(m.childId)).map((m) => m.childId)).size,
    };
  }, [children, subs, meets, messages]);

  const Page = { today: Today, families: Families, review: Review, meets: Meets, messages: Inboxes, feed: Feed, voice: Voice, settings: Settings, summary: Summary, handwriting: Handwriting, sheets: Sheets, plan: CoursePlan, team: Team, classes: MyClasses }[tab] || Today;
  return (
    <div className="shell">
      <header className="appbar">
        <div className="appbar-in">
          <button className="brand" onClick={() => go("today")}><Logo /><BrandName light /><span className="pill yellow hide-s" style={{ marginLeft: 6 }}>{isAdmin ? "Admin" : "Teacher"}</span></button>
          <span className="spacer" />
          <button className="btn ghost small hide-s" style={{ marginRight: 8 }} onClick={() => { setView("family"); go(""); }}><HomeIcon size={16} /> My family</button>
          <button className="child-switch" onClick={() => go(isAdmin ? "settings" : "classes")}><Avatar name={profile.name} size="sm" /> <span className="hide-s">{profile.name}</span></button>
        </div>
        <div className="kasuti on-red" />
      </header>
      <div className="body">
        <nav className="sidenav" aria-label="Sections">
          {tabs.map(([k, l, I]) => <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}><I />{l}{badges[k] ? <span className="badge">{badges[k]}</span> : null}</button>)}
        </nav>
        <main className="main"><Page data={data} badges={badges} /></main>
      </div>
      <nav className="bottomnav" aria-label="Sections">
        {tabs.filter(([k]) => MOBILE.includes(k)).map(([k, l, I]) => <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}><I />{l}{badges[k] ? <span className="badge">{badges[k]}</span> : null}</button>)}
      </nav>
    </div>
  );
}
