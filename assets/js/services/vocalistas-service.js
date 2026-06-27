import { getDocument, setDocument, deleteDocument, getCollection, serverTimestamp } from "../db.js";

const COLLECTION = "vocalistas";

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

export async function getVocalista(uid = "") {
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) return null;
  const doc = await getDocument(COLLECTION, normalizedUid);
  if (!doc) return null;
  if (doc.active === false || doc.ativo === false) return null;
  return doc;
}

export async function isVocalista(uid = "") {
  return !!(await getVocalista(uid));
}

export async function listVocalistas() {
  const all = await getCollection(COLLECTION);
  return all
    .filter((item) => item.active !== false && item.ativo !== false)
    .sort((a, b) => String(a.name || a.displayName || a.email || "").localeCompare(String(b.name || b.displayName || b.email || ""), "pt-BR"));
}

export async function setVocalista(uid = "", payload = {}) {
  const normalizedUid = String(uid || payload.uid || "").trim();
  if (!normalizedUid) throw new Error("UID do usuário ausente.");

  await setDocument(COLLECTION, normalizedUid, {
    uid: normalizedUid,
    name: String(payload.name || payload.displayName || "").trim(),
    displayName: String(payload.displayName || payload.name || "").trim(),
    email: normalizeEmail(payload.email || ""),
    photoURL: String(payload.photoURL || "").trim(),
    active: true,
    updatedAt: serverTimestamp(),
    createdAt: payload.createdAt || serverTimestamp()
  }, { merge: true });

  return normalizedUid;
}

export async function removeVocalista(uid = "") {
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) return;
  await deleteDocument(COLLECTION, normalizedUid);
}
