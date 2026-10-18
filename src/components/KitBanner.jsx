import { useState } from "react";
import WelcomeKit from "./WelcomeKit.jsx";

// The welcome kit sits at the top of Home for the first month, until the family hides it.
export default function KitBanner({ child, adult, strokeLib }) {
  const key = `kit-hide-${child.id}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  const start = child.startDate ? new Date(child.startDate).getTime() : Date.now();
  if (hidden || Date.now() - start > 30 * 864e5) return null;
  return <WelcomeKit child={child} adult={adult} strokeLib={strokeLib} onClose={() => { try { localStorage.setItem(key, "1"); } catch {} setHidden(true); }} />;
}
