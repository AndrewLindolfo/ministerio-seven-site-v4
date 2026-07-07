import { getDocument, setDocument, deleteDocument, getCollection, serverTimestamp } from "../db.js";

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
    tipo: item.tipo || item.type || "integrante",
    moduloOrigem: source,
    active: item.active !== false && item.ativo !== false
  };
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
  } catch (error) {
    // Se as regras ainda não foram publicadas para a coleção nova, o legado continua funcionando.
    console.warn("Não foi possível migrar integrante legado automaticamente:", error);
  }
}

export async function getIntegrante(uid = "") {
  const normalizedUid = normalizeUid(uid);
  if (!normalizedUid) return null;

  const current = await getDocument(COLLECTION, normalizedUid).catch(() => null);
  if (isActive(current)) return normalizeIntegranteDoc(current, COLLECTION);

  const legacy = await getDocument(LEGACY_COLLECTION, normalizedUid).catch(() => null);
  if (!isActive(legacy)) return null;

  await tryMigrateLegacy(normalizedUid, legacy);
  return normalizeIntegranteDoc(legacy, LEGACY_COLLECTION);
}

export async function isIntegrante(uid = "") {
  return !!(await getIntegrante(uid));
}

export async function listIntegrantes() {
  const [current, legacy] = await Promise.all([
    getCollection(COLLECTION).catch(() => []),
    getCollection(LEGACY_COLLECTION).catch(() => [])
  ]);

  const byUid = new Map();

  legacy.forEach((item) => {
    if (!isActive(item)) return;
    const doc = normalizeIntegranteDoc(item, LEGACY_COLLECTION);
    if (doc.uid) byUid.set(doc.uid, doc);
  });

  current.forEach((item) => {
    if (!isActive(item)) return;
    const doc = normalizeIntegranteDoc(item, COLLECTION);
    if (doc.uid) byUid.set(doc.uid, doc);
  });

  return Array.from(byUid.values())
    .sort((a, b) => String(a.name || a.displayName || a.email || "").localeCompare(String(b.name || b.displayName || b.email || ""), "pt-BR"));
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

// Compatibilidade com arquivos antigos que ainda importem Vocalista.
export const getVocalista = getIntegrante;
export const isVocalista = isIntegrante;
export const listVocalistas = listIntegrantes;
export const setVocalista = setIntegrante;
export const removeVocalista = removeIntegrante;
