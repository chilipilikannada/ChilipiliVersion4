import { useApp } from "../lib/hooks.js";

// Who a meet or post is for. Teachers pick one of their classes; the admin can also choose everyone.
export function classOptions(classes, profile) {
  const admin = profile.role === "admin";
  const mine = (classes || []).filter((c) => admin || (profile.classes || []).includes(c.id));
  return [...(admin ? [["", "Everyone"]] : []), ...mine.map((c) => [c.id, c.name])];
}
export default function ClassPick({ classes, value, onChange, label = "For" }) {
  const { profile } = useApp();
  const opts = classOptions(classes, profile);
  if (opts.length <= 1 && profile.role === "admin") return null;
  return (
    <div className="field"><label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>{opts.map(([v, l]) => <option key={v || "all"} value={v}>{l}</option>)}</select>
    </div>
  );
}
