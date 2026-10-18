import { firebaseConfig, hasFirebase } from "../config.js";
import { createLocalStore } from "./local.js";
import { createFirebaseStore } from "./firebase.js";

export const store = hasFirebase ? createFirebaseStore(firebaseConfig) : createLocalStore();
if (typeof window !== "undefined") window.__chiliCloud = !!hasFirebase;

// Work, messages and notes carry their child's class, so only that class's teacher (and the admin) can see them.
const LINKED = new Set(["activity", "submissions", "messages", "meetNotes", "phrases", "stageLogs"]);
async function withClass(col, data) {
  if (!LINKED.has(col) || !data || !data.childId || data.classId !== undefined) return data;
  let classId = "";
  try { const c = await store.get("children", data.childId); classId = (c && c.classId) || ""; } catch {}
  return { ...data, classId };
}
const rawAdd = store.add, rawSet = store.set, rawMerge = store.merge;
store.add = async (col, data) => rawAdd(col, await withClass(col, data));
store.set = async (col, id, data) => rawSet(col, id, await withClass(col, data));
store.merge = async (col, id, data) => rawMerge(col, id, await withClass(col, data));
