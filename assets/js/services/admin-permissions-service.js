import { getCollection, getOneByField, setDocument, deleteDocument, serverTimestamp } from "../db.js";

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

export const ADMIN_COLLECTION = "admins";

export const DEFAULT_PERMISSIONS = {
  musicas: { create: false, edit: false, delete: false },
  musicasVocal: { create: false, edit: false, delete: false },
  vocalistas: { create: false, edit: false, delete: false, activate: false },
  cifras: {
    create: false,
    edit: false,
    delete: false,
    capo: false,
    bpm: false,
    compasso: false,
    inst_violao: false,
    inst_guitarra: false,
    inst_baixo: false,
    inst_teclado: false
  },
  programacoes: { create: false, edit: false, delete: false },
  fotos: { create: false, edit: false, delete: false },
  downloadsGerais: { create: false, edit: false, delete: false },
  downloadsPorMusica: { create: false, edit: false, delete: false },
  contatos: { view: false, delete: false },
  notificacoes: {
    create: false,
    edit: false,
    delete: false,
    popup: false,
    top: false,
    buttonLink: false,
    beforeStart: false
  },
  ensaios: { create: false, edit: false, delete: false }
};

const PERMISSION_ALIASES = {
  musicasPublicas: "musicas",
  musicas_publicas: "musicas",
  publicMusicas: "musicas",
  musicasVocais: "musicasVocal",
  musicas_vocal: "musicasVocal",
  musicas_vocais: "musicasVocal",
  vocal: "musicasVocal",
  vocalMusicas: "musicasVocal",
  vocalistasSeven: "vocalistas",
  cifra: "cifras",
  downloads: "downloadsGerais",
  downloadsGeral: "downloadsGerais",
  downloads_gerais: "downloadsGerais",
  downloadsMusicas: "downloadsPorMusica",
  downloads_por_musica: "downloadsPorMusica",
  contato: "contatos",
  notificacao: "notificacoes",
  ensaio: "ensaios"
};

export const PRIMARY_ONLY_MODULES = new Set(["admins", "links", "backup", "logs"]);

export function cloneDefaultPermissions() {
  return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
}

function canonicalModuleKey(moduleKey = "") {
  const clean = String(moduleKey || "").trim();
  return PERMISSION_ALIASES[clean] || clean;
}

function normalizeIncomingPermissions(incoming = {}) {
  const normalized = {};
  if (!incoming || typeof incoming !== "object") return normalized;

  Object.entries(incoming).forEach(([rawModuleKey, modulePerms]) => {
    const moduleKey = canonicalModuleKey(rawModuleKey);
    if (!DEFAULT_PERMISSIONS[moduleKey] || !modulePerms || typeof modulePerms !== "object") return;

    normalized[moduleKey] = {
      ...(normalized[moduleKey] || {}),
      ...modulePerms
    };
  });

  return normalized;
}

function mergePermissions(_base = {}, incoming = {}) {
  const output = cloneDefaultPermissions();
  const normalizedIncoming = normalizeIncomingPermissions(incoming);

  Object.keys(output).forEach((moduleKey) => {
    const incomingGroup = normalizedIncoming?.[moduleKey] || {};
    Object.keys(output[moduleKey]).forEach((permKey) => {
      output[moduleKey][permKey] = incomingGroup?.[permKey] === true;
    });
  });

  return output;
}

export function isPrimaryAdmin(admin = null) {
  if (!admin) return false;
  if (admin.isPrimary === true || admin.principal === true || admin.master === true || admin.isMaster === true) return true;
  const perms = admin.permissions;
  return !perms || typeof perms !== "object" || !Object.keys(perms).length;
}

export function getEffectivePermissions(admin = null) {
  if (!admin) return cloneDefaultPermissions();

  if (isPrimaryAdmin(admin)) {
    const all = cloneDefaultPermissions();
    Object.keys(all).forEach((moduleKey) => {
      Object.keys(all[moduleKey]).forEach((permKey) => {
        all[moduleKey][permKey] = true;
      });
    });
    return all;
  }

  return mergePermissions(DEFAULT_PERMISSIONS, admin.permissions || {});
}

export function hasPermission(admin, moduleKey, permKey) {
  const canonical = canonicalModuleKey(moduleKey);
  const perms = getEffectivePermissions(admin);
  return perms?.[canonical]?.[permKey] === true;
}

export function hasAnyModulePermission(admin, moduleKey) {
  const canonical = canonicalModuleKey(moduleKey);
  const perms = getEffectivePermissions(admin);

  if (canonical === "downloads") {
    return hasAnyModulePermission(admin, "downloadsGerais") || hasAnyModulePermission(admin, "downloadsPorMusica");
  }

  return Object.values(perms?.[canonical] || {}).some(Boolean);
}

const CIFRA_INSTRUMENT_PERMISSION_MAP = {
  violao: "inst_violao",
  guitarra: "inst_guitarra",
  baixo: "inst_baixo",
  teclado: "inst_teclado"
};

export function getAllowedCifraInstruments(admin = null) {
  const allInstruments = Object.keys(CIFRA_INSTRUMENT_PERMISSION_MAP);
  if (isPrimaryAdmin(admin)) return allInstruments;

  const raw = normalizeIncomingPermissions(admin?.permissions || {})?.cifras || {};
  const hasExplicitRestrictions = Object.values(CIFRA_INSTRUMENT_PERMISSION_MAP).some((key) => key in raw);

  if (!hasExplicitRestrictions && hasAnyModulePermission(admin, "cifras")) {
    return allInstruments;
  }

  const perms = getEffectivePermissions(admin);
  return allInstruments.filter((instrument) => perms?.cifras?.[CIFRA_INSTRUMENT_PERMISSION_MAP[instrument]] === true);
}

export function canManageCifraInstrument(admin = null, instrument = "") {
  const normalized = String(instrument || "violao").trim().toLowerCase();
  return getAllowedCifraInstruments(admin).includes(normalized);
}

function canAccessModule(admin, moduleKey = "") {
  if (PRIMARY_ONLY_MODULES.has(moduleKey)) return isPrimaryAdmin(admin);
  return hasAnyModulePermission(admin, moduleKey);
}

export function canAccessAdminPage(admin, pageKey = "") {
  if (isPrimaryAdmin(admin)) return true;

  const key = String(pageKey || "").trim();

  switch (key) {
    case "dashboard":
      return true;

    case "admins":
    case "links":
    case "backup":
    case "logs":
      return false;

    case "musicas":
    case "musicas-publicas":
      return canAccessModule(admin, "musicas");
    case "editor-musica-create":
      return hasPermission(admin, "musicas", "create");
    case "editor-musica-edit":
      return hasPermission(admin, "musicas", "edit");

    case "musicas-vocal":
    case "musicas-vocais":
    case "vocal-musicas":
      return canAccessModule(admin, "musicasVocal");
    case "editor-musica-vocal-create":
    case "editor-musica-vocais-create":
      return hasPermission(admin, "musicasVocal", "create");
    case "editor-musica-vocal-edit":
    case "editor-musica-vocais-edit":
      return hasPermission(admin, "musicasVocal", "edit");

    case "vocalistas":
      return canAccessModule(admin, "vocalistas");
    case "editor-vocalista-create":
      return hasPermission(admin, "vocalistas", "create");
    case "editor-vocalista-edit":
      return hasPermission(admin, "vocalistas", "edit");

    case "cifras":
      return canAccessModule(admin, "cifras");
    case "editor-cifra-create":
      return hasPermission(admin, "cifras", "create");
    case "editor-cifra-edit":
      return hasPermission(admin, "cifras", "edit");

    case "programacoes":
      return canAccessModule(admin, "programacoes");
    case "fotos":
      return canAccessModule(admin, "fotos");
    case "downloads":
      return canAccessModule(admin, "downloadsGerais") || canAccessModule(admin, "downloadsPorMusica");
    case "downloads-geral":
    case "downloads-gerais":
      return canAccessModule(admin, "downloadsGerais");
    case "downloads-por-musica":
      return canAccessModule(admin, "downloadsPorMusica");
    case "contatos":
      return canAccessModule(admin, "contatos");
    case "notificacoes":
      return canAccessModule(admin, "notificacoes");
    case "ensaios":
      return canAccessModule(admin, "ensaios");
    case "editor-ensaio-create":
      return hasPermission(admin, "ensaios", "create");
    case "editor-ensaio-edit":
      return hasPermission(admin, "ensaios", "edit");

    default:
      return false;
  }
}

export async function listAdmins() {
  const all = await getCollection(ADMIN_COLLECTION);
  return all
    .filter((item) => item.active !== false && item.ativo !== false)
    .sort((a, b) => String(a.name || a.nome || a.email || "").localeCompare(String(b.name || b.nome || b.email || ""), "pt-BR"));
}

export async function getAdminByEmail(email = "") {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const admin = await getOneByField(ADMIN_COLLECTION, "email", normalized);
  if (!admin) return null;
  if (admin.active === false || admin.ativo === false) return null;
  return admin;
}

export async function saveSecondaryAdmin(payload = {}, existingId = "") {
  const email = normalizeEmail(payload.email || "");
  const name = String(payload.name || "").trim();
  if (!email || !name) {
    throw new Error("Preencha nome e e-mail do administrador.");
  }

  const maybeExisting = await getAdminByEmail(email);
  const targetId = existingId || maybeExisting?.id || email.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const current = maybeExisting?.id === targetId ? maybeExisting : null;
  const docData = {
    name,
    email,
    permissions: mergePermissions(DEFAULT_PERMISSIONS, payload.permissions || {}),
    isPrimary: false,
    active: payload.active !== false,
    updatedAt: serverTimestamp()
  };

  if (!current?.createdAt) docData.createdAt = serverTimestamp();

  await setDocument(ADMIN_COLLECTION, targetId, docData, { merge: true });
  return targetId;
}

export async function removeSecondaryAdmin(id = "") {
  if (!id) return;
  await deleteDocument(ADMIN_COLLECTION, id);
}
