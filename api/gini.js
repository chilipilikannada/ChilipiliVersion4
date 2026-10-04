// POST /api/gini { scene: {id, en, who, goal}, history: [{from: "gini"|"me", kn, en}], said, audience: "kid"|"adult", turn }
//   -> { reply: {kn, rom, en}, feedback: {ok, better_kn, better_rom, tip}, suggestions: [{kn, rom, en}], done }
// Talk with Gini: a short spoken-style conversation in Kannada. Gini plays a role (Ajji on a call,
// Amma at the temple, an auto driver) and gently corrects the learner. Needs ANTHROPIC_API_KEY.
import { voiceAccess } from "./_lib.js";

const env = process.env;
const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

const system = (scene, audience) => `You are Gini, a cheerful green parrot who teaches Kannada in Chili Pili, an app for Kannada families in the USA.
Right now you are role-playing as ${clip(scene.who, 40) || "a friendly Kannada speaker"} in this scene: "${clip(scene.en, 80)}" (${clip(scene.goal, 160)}).
The learner is ${audience === "adult" ? "a grown-up beginner, often someone whose partner or in-laws speak Kannada" : "a child aged 5 to 12 growing up in the USA"}.

Each turn the learner says something (in Kannada script, romanised Kannada, English, or a mix; it may come from speech recognition with mistakes).
1. Work out what they meant.
2. feedback: "ok" true if their Kannada was understandable for a beginner (be generous; small slips are fine). If they used English, or it was clearly wrong, give the natural spoken Kannada for what they meant in "better_kn" and "better_rom". "tip": one short, warm English sentence (max 15 words), praise first. If ok and nothing to fix, better_kn may be "".
3. reply: your next line in character, natural everyday spoken Kannada as a Bengaluru or Mysuru family speaks (e.g. ಮಾಡ್ತೀನಿ, ಬರ್ತೀನಿ), ONE short sentence of 3 to 9 words, ending with a simple question that keeps the scene going. Use ನೀನು with children and close family, ನೀವು with elders and new people.
4. suggestions: two different short answers the learner could say next, easy for a beginner.
5. done: true when the scene has reached a natural goodbye, or after about 6 turns.
"rom" is easy pronunciation in English letters: double long vowels (aa ii uu ee oo), capitals for retroflex T D N L, e.g. "naanu chennaagiddiini".
Keep everything kind, simple and suitable for children. Never ask for or repeat personal details (address, phone, school name, passwords). If the learner says something unkind or unsafe, don't repeat it: gently steer back to the scene.
Reply with ONLY this JSON, no other text:
{"feedback":{"ok":true,"better_kn":"","better_rom":"","tip":""},"reply":{"kn":"","rom":"","en":""},"suggestions":[{"kn":"","rom":"","en":""},{"kn":"","rom":"","en":""}],"done":false}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    if (!env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "Gini's chat isn't switched on yet.", code: "not_configured" });
    const acc = await voiceAccess(req, "gini");
    if (acc.error) return res.status(429).json({ error: "Gini needs a little rest. Try again soon!" });
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const said = clip(body.said, 200);
    if (!said) return res.status(400).json({ error: "Say or type something first" });
    const scene = body.scene || {};
    const history = (Array.isArray(body.history) ? body.history : []).slice(-10).map((t) => `${t.from === "gini" ? "Gini" : "Learner"}: ${clip(t.kn || t.en, 160)}${t.en && t.kn ? ` (${clip(t.en, 120)})` : ""}`).join("\n");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001", max_tokens: 600,
        system: system(scene, body.audience === "adult" ? "adult" : "kid"),
        messages: [{ role: "user", content: `Conversation so far:\n${history || "(Gini has not spoken yet)"}\n\nTurn ${Math.min(20, +body.turn || 1)}. The learner now says: "${said}"` }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: `Gini couldn't answer (${r.status})` });
    const j = await r.json();
    const text = (j.content || []).map((c) => c.text || "").join("").trim();
    const m = text.match(/\{[\s\S]*\}/);
    const out = JSON.parse(m ? m[0] : text);
    const line = (x) => ({ kn: clip(x && x.kn, 200), rom: clip(x && (x.rom || x.roman), 200), en: clip(x && x.en, 200) });
    const fb = out.feedback || {};
    return res.status(200).json({
      reply: line(out.reply),
      feedback: { ok: fb.ok !== false, better_kn: clip(fb.better_kn, 200), better_rom: clip(fb.better_rom, 200), tip: clip(fb.tip, 160) },
      suggestions: (Array.isArray(out.suggestions) ? out.suggestions : []).slice(0, 2).map(line).filter((s) => s.kn),
      done: !!out.done,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
