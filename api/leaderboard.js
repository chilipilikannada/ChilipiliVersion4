// GET /api/leaderboard?week=YYYY-MM-DD -> { week: [...], all: [...] }
// Star champions across every registered child. Only first name + last initial, and only
// children whose grown-up hasn't switched it off (child.leaderboard === false hides them).
// Needs a signed-in family member or kid. Grown-up learners are not ranked.
import { whoIs, serviceToken, fsList, rateGuard } from "./_lib.js";

let cache = { at: 0, kids: null };
const shortName = (n) => { const p = String(n || "").trim().split(/\s+/); return p[0] ? p[0] + (p[1] ? " " + p[1][0].toUpperCase() + "." : "") : "A star"; };

export default async function handler(req, res) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(501).json({ error: "Not switched on yet", code: "not_configured" });
    const me = await whoIs(req);
    if (!me) return res.status(401).json({ error: "Sign in first" });
    if (!(await rateGuard(`lb:${me.uid}`, 30, 10 * 60e3, true))) return res.status(429).json({ error: "Try again in a little while" });
    if (!cache.kids || Date.now() - cache.at > 60e3) {
      const token = await serviceToken();
      cache = { at: Date.now(), kids: (await fsList("children", token)).filter((c) => c.status === "active" && !c.adult && c.leaderboard !== false) };
    }
    const week = String(req.query.week || "");
    const row = (c, stars) => ({ id: c.id, name: shortName(c.name), stars, level: c.level || 1 });
    const weekRows = cache.kids.map((c) => row(c, c.starsWeek && c.starsWeek.k === week ? +c.starsWeek.n || 0 : 0)).filter((r) => r.stars > 0).sort((a, b) => b.stars - a.stars);
    const allRows = cache.kids.map((c) => row(c, +c.stars || 0)).filter((r) => r.stars > 0).sort((a, b) => b.stars - a.stars);
    res.setHeader("Cache-Control", "private, max-age=30");
    return res.status(200).json({ week: weekRows.slice(0, 20), all: allRows.slice(0, 20), weekCount: weekRows.length, allCount: allRows.length, weekRank: Object.fromEntries(weekRows.map((r, i) => [r.id, i + 1])) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
