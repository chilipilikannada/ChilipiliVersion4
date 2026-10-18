// What a child can write yet. A word is only given for tracing or writing when every letter and sign in it
// has already been taught; otherwise the child traces the word's first letter (ಅ as in ಅಮ್ಮ) and just says the word.
const SIGN = /[ಂಃ಼ಾ-್ೕೖ]/; // vowel signs, ಂ ಃ and the joining mark

export const charsOf = (items = []) => new Set(items.flatMap((t) => [...String(t)]));
export const canWrite = (word, known) => [...String(word)].every((ch) => known.has(ch));

// The first akshara of a word (base letter plus any signs on it).
export function firstLetter(word) {
  const cs = [...String(word)];
  let s = cs[0] || "";
  for (let i = 1; i < cs.length && SIGN.test(cs[i]); i++) s += cs[i];
  return s;
}

// The best thing to write from a list of words: whole words when the child has the letters,
// else known first letters (with the word they start), else nothing.
export function writeTargets(words, known, max = 2) {
  const list = [...new Set(words.filter(Boolean))];
  const whole = list.filter((w) => [...w].length <= 6 && canWrite(w, known));
  if (whole.length) return { kind: "words", items: whole.slice(0, max) };
  const firsts = [];
  for (const w of list) {
    let f = firstLetter(w);
    if (!canWrite(f, known)) f = [...w][0];
    if (canWrite(f, known) && !firsts.some((x) => x.letter === f)) firsts.push({ letter: f, word: w });
  }
  return firsts.length ? { kind: "first", items: firsts.slice(0, max).map((x) => x.letter), from: firsts.slice(0, max) } : { kind: "none", items: [] };
}
