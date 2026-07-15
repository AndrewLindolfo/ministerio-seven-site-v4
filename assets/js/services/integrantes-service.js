import { getDocument, getOneByField, setDocument, deleteDocument, getCollection, serverTimestamp } from "../db.js";

const COLLECTION = "integrantes";
const LEGACY_COLLECTION = "vocalistas";

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeUid(value = "") {
  return String(value || "").trim();
}

function isActive(item = null) {
  return !!item && item.active !== false && item.ativo !== false;
}

function normalizeIntegranteDoc(item = {}, source = COLLECTION) {
  const uid = normalizeUid(item.uid || item.id || "");
  return {
    ...item,
    id: uid || item.id,
    uid,
    email: normalizeEmail(item.email || ""),
    tipo: item.tipo || item.type || "integrante",
    moduloOrigem: source,
    active: item.active !== false && item.ativo !== false
  };
}

async function safeGetDocument(collectionName, id = "") {
  if (!id) return null;
  try { return await getDocument(collectionName, id); }
  catch (error) {
    if (!String(error?.code || "").includes("permission-denied")) {
      console.warn(`Não foi possível ler ${collectionName}/${id}:`, error);
    }
    return null;
  }
}

async function safeGetByEmail(collectionName, email = "") {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  try { return await getOneByField(collectionName, "email", normalized); }
  catch (error) {
    if (!String(error?.code || "").includes("permission-denied")) {
      console.warn(`Não foi possível consultar ${collectionName} por e-mail:`, error);
    }
    return null;
  }
}

async function safeCollection(collectionName) {
  try { return await getCollection(collectionName); }
  catch { return []; }
}

async function tryMigrateLegacy(uid = "", legacyDoc = null) {
  if (!uid || !legacyDoc) return;
  try {
    await setDocument(COLLECTION, uid, {
      ...legacyDoc,
      uid,
      tipo: legacyDoc.tipo || legacyDoc.type || "integrante",
      migratedFrom: LEGACY_COLLECTION,
      migratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      active: legacyDoc.active !== false && legacyDoc.ativo !== false
    }, { merge: true });
  } catch {
    // Se as regras da coleção nova ainda não estiverem publicadas, o legado continua funcionando.
  }
}

export async function getIntegrante(uid = "", email = "") {
  const normalizedUid = normalizeUid(uid);
  const normalizedEmail = normalizeEmail(email);

  const sources = [COLLECTION, LEGACY_COLLECTION];

  for (const source of sources) {
    const byUid = await safeGetDocument(source, normalizedUid);
    if (isActive(byUid)) {
      if (source === LEGACY_COLLECTION) await tryMigrateLegacy(normalizedUid, byUid);
      return normalizeIntegranteDoc(byUid, source);
    }
  }

  for (const source of sources) {
    const byEmail = await safeGetByEmail(source, normalizedEmail);
    if (isActive(byEmail)) {
      const doc = normalizeIntegranteDoc(byEmail, source);
      if (source === LEGACY_COLLECTION && doc.uid) await tryMigrateLegacy(doc.uid, byEmail);
      return doc;
    }
  }

  return null;
}

export async function isIntegrante(uid = "", email = "") {
  return !!(await getIntegrante(uid, email));
}

export async function listIntegrantes() {
  const [current, legacy] = await Promise.all([
    safeCollection(COLLECTION),
    safeCollection(LEGACY_COLLECTION)
  ]);

  const byKey = new Map();
  [...legacy, ...current].forEach((item) => {
    if (!isActive(item)) return;
    const source = current.includes(item) ? COLLECTION : LEGACY_COLLECTION;
    const doc = normalizeIntegranteDoc(item, source);
    const key = doc.uid || doc.email || doc.id;
    if (key) byKey.set(key, doc);
  });

  return Array.from(byKey.values()).sort((a, b) =>
    String(a.name || a.displayName || a.email || "").localeCompare(String(b.name || b.displayName || b.email || ""), "pt-BR")
  );
}

export async function setIntegrante(uid = "", payload = {}) {
  const normalizedUid = normalizeUid(uid || payload.uid || "");
  if (!normalizedUid) throw new Error("UID do usuário ausente.");

  await setDocument(COLLECTION, normalizedUid, {
    uid: normalizedUid,
    name: String(payload.name || payload.displayName || "").trim(),
    displayName: String(payload.displayName || payload.name || "").trim(),
    email: normalizeEmail(payload.email || ""),
    photoURL: String(payload.photoURL || "").trim(),
    tipo: payload.tipo || payload.type || "integrante",
    active: true,
    updatedAt: serverTimestamp(),
    createdAt: payload.createdAt || serverTimestamp()
  }, { merge: true });

  return normalizedUid;
}

export async function removeIntegrante(uid = "") {
  const normalizedUid = normalizeUid(uid || "");
  if (!normalizedUid) return;
  await Promise.allSettled([
    deleteDocument(COLLECTION, normalizedUid),
    deleteDocument(LEGACY_COLLECTION, normalizedUid)
  ]);
}

// Compatibilidade com arquivos antigos.
export const getVocalista = getIntegrante;
export const isVocalista = isIntegrante;
export const listVocalistas = listIntegrantes;
export const setVocalista = setIntegrante;
export const removeVocalista = removeIntegrante;
