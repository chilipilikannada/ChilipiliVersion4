// Badges kids (and grown-ups) collect. Worked out from what's already saved, so nothing new is stored.
const count = (o) => Object.keys(o || {}).length;
const weeks = (c) => Object.values(c.weekDone || {});
const fullWeeks = (c) => weeks(c).filter((w) => Object.keys(w).filter((k) => /^d\d$/.test(k)).length >= 6).length;
const good = (c) => Object.values(c.letters || {}).filter((s) => s >= 2).length;
const streak = (c) => (c.streak && c.streak.count) || 0;

// [id, icon, English, Kannada, value(child), target]
export const BADGES = [
  ["star-1", "⭐", "First star", "ಮೊದಲ ನಕ್ಷತ್ರ", (c) => c.stars || 0, 1],
  ["letter-1", "✏️", "First letter", "ಮೊದಲ ಅಕ್ಷರ", (c) => count(c.letters), 1],
  ["streak-3", "🔥", "3 days in a row", "ಮೂರು ದಿನ", streak, 3],
  ["stars-25", "🌟", "25 stars", "೨೫ ನಕ್ಷತ್ರ", (c) => c.stars || 0, 25],
  ["family", "📞", "Family talker", "ಮನೆ ಮಾತು", (c) => weeks(c).filter((w) => w.family).length, 1],
  ["story", "📖", "Story lover", "ಕಥೆ ಪ್ರಿಯ", (c) => weeks(c).filter((w) => w.story).length, 1],
  ["week", "🥇", "A full week", "ಪೂರ್ತಿ ವಾರ", fullWeeks, 1],
  ["streak-7", "🔥", "7-day streak", "ಏಳು ದಿನ", streak, 7],
  ["letters-10", "📝", "10 letters", "೧೦ ಅಕ್ಷರ", good, 10],
  ["talker", "🗣️", "Kannada talker", "ಮಾತುಗಾರ", (c) => c.spoken || 0, 10],
  ["stars-100", "💫", "Star collector", "೧೦೦ ನಕ್ಷತ್ರ", (c) => c.stars || 0, 100],
  ["journey", "🗺️", "Letter explorer", "ಅಕ್ಷರ ಪಯಣಿಗ", (c) => count((c.journey || {}).done), 15],
  ["letters-30", "🖋️", "Letter master", "ಅಕ್ಷರ ಮಾಸ್ಟರ್", good, 30],
  ["streak-30", "🌋", "30-day champion", "೩೦ ದಿನ", streak, 30],
  ["stars-250", "🏆", "Kannada superstar", "ಕನ್ನಡ ತಾರೆ", (c) => c.stars || 0, 250],
].map(([id, icon, en, kn, value, target]) => ({ id, icon, en, kn, value, target }));

export const badgeState = (c) => BADGES.map((b) => { const v = Math.min(b.target, b.value(c || {})); return { ...b, v, earned: v >= b.target }; });
export const earnedIds = (c) => badgeState(c).filter((b) => b.earned).map((b) => b.id);
// The closest badge not yet earned (by how far along it is).
export const nextBadge = (c) => badgeState(c).filter((b) => !b.earned).sort((a, b) => b.v / b.target - a.v / a.target)[0] || null;
