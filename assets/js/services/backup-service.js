import { getCollection, explainFirebaseError } from "../db.js";

export const BACKUP_SECTIONS = [
  {
    id: "admins",
    label: "Administradores",
    description: "Contas com acesso ao painel ADM.",
    collections: ["admins"]
  },
  {
    id: "usuariosPublicos",
    label: "Usuários públicos",
    description: "Usuários que fizeram login no site e preferências vinculadas ao perfil.",
    collections: ["usuariosPublicos"]
  },
  {
    id: "integrantes",
    label: "integrantes",
    description: "Liberação de acesso à área Músicas Vocal.",
    collections: ["Integrantes"]
  },
  {
    id: "musicasPublicas",
    label: "Músicas públicas",
    description: "Letras públicas usadas na página Músicas e no botão Letra.",
    collections: ["musicasPublicas"]
  },
  {
    id: "musicas",
    label: "Músicas Vocal",
    description: "Letras, vídeos e observações internas da área vocal.",
    collections: ["musicas"]
  },
  {
    id: "cifras",
    label: "Cifras",
    description: "Cifras públicas e vínculos com músicas.",
    collections: ["cifras"]
  },
  {
    id: "programacoes",
    label: "Programações",
    description: "Próximas programações, Google Maps, setlist e ocultar após.",
    collections: ["programacoes"]
  },
  {
    id: "ensaios",
    label: "Ensaios",
    description: "Conteúdo interno de ensaios.",
    collections: ["ensaios"]
  },
  {
    id: "albuns",
    label: "Álbuns/Fotos",
    description: "Álbuns cadastrados na área de fotos.",
    collections: ["albuns"]
  },
  {
    id: "downloads",
    label: "Downloads gerais",
    description: "Arquivos e links da página Downloads.",
    collections: ["downloads"]
  },
  {
    id: "downloadsPorMusica",
    label: "Downloads por música",
    description: "Downloads vinculados a músicas específicas.",
    collections: ["downloadsPorMusica"]
  },
  {
    id: "notificacoes",
    label: "Notificações",
    description: "Avisos e pop-ups cadastrados no site.",
    collections: ["notificacoes"]
  },
  {
    id: "contatos",
    label: "Contatos",
    description: "Mensagens enviadas pelo formulário de contato.",
    collections: ["contatos"]
  },
  {
    id: "links",
    label: "Links",
    description: "Links configuráveis do site.",
    collections: ["links"]
  },
  {
    id: "config",
    label: "Configurações",
    description: "Configurações gerais, banner, textos e ajustes do site.",
    collections: ["config"]
  },
  {
    id: "bibliotecasUsuarios",
    label: "Favoritos e playlists",
    description: "Bibliotecas pessoais dos usuários.",
    collections: ["bibliotecasUsuarios"]
  },
  {
    id: "activity_logs",
    label: "Log de atividades",
    description: "Histórico de ações administrativas.",
    collections: ["activity_logs"]
  }
];

export const BACKUP_COLLECTIONS = Array.from(new Set(BACKUP_SECTIONS.flatMap((section) => section.collections)));

const OPTIONAL_COLLECTIONS = new Set([
  "admins",
  "usuariosPublicos",
  "integrantes",
  "contatos",
  "activity_logs",
  "bibliotecasUsuarios",
  "ensaios"
]);

function cloneSection(section = {}) {
  return {
    id: section.id,
    label: section.label,
    description: section.description,
    collections: [...(section.collections || [])]
  };
}

export function getBackupSections() {
  return BACKUP_SECTIONS.map(cloneSection);
}

function normalizeSectionIds(sectionIds = null) {
  const valid = new Set(BACKUP_SECTIONS.map((section) => section.id));
  if (!Array.isArray(sectionIds) || !sectionIds.length) {
    return BACKUP_SECTIONS.map((section) => section.id);
  }
  const normalized = sectionIds.map((id) => String(id || "").trim()).filter((id) => valid.has(id));
  return normalized.length ? Array.from(new Set(normalized)) : BACKUP_SECTIONS.map((section) => section.id);
}

export function getSectionsByIds(sectionIds = null) {
  const wanted = new Set(normalizeSectionIds(sectionIds));
  return BACKUP_SECTIONS.filter((section) => wanted.has(section.id)).map(cloneSection);
}

export function getCollectionsForSections(sectionIds = null) {
  return Array.from(new Set(getSectionsByIds(sectionIds).flatMap((section) => section.collections)));
}

function sanitizeForJson(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value?.toDate === "function" && typeof value?.seconds === "number") {
    return {
      seconds: value.seconds,
      nanoseconds: Number(value.nanoseconds || 0)
    };
  }
  if (Array.isArray(value)) return value.map(sanitizeForJson);
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === "function") continue;
      out[key] = sanitizeForJson(val);
    }
    return out;
  }
  return value;
}

function buildSectionSummary(collectionCounts = {}) {
  const summary = {};
  for (const section of BACKUP_SECTIONS) {
    const count = section.collections.reduce((total, collectionName) => total + Number(collectionCounts[collectionName] || 0), 0);
    summary[section.id] = {
      label: section.label,
      count,
      collections: section.collections.reduce((acc, collectionName) => {
        acc[collectionName] = Number(collectionCounts[collectionName] || 0);
        return acc;
      }, {})
    };
  }
  return summary;
}

export async function exportBackupJson(sectionIds = null) {
  const selectedSections = getSectionsByIds(sectionIds);
  const selectedSectionIds = selectedSections.map((section) => section.id);
  const selectedCollections = getCollectionsForSections(selectedSectionIds);
  const exportedAt = new Date().toISOString();

  const result = {
    _meta: {
      app: "Ministerio Seven",
      site: "ministerio-seven-v4",
      version: 2,
      backupType: selectedSectionIds.length === BACKUP_SECTIONS.length ? "full" : "partial",
      exportedAt,
      selectedSections: selectedSections.map(cloneSection),
      collections: [...selectedCollections]
    }
  };

  const summary = {
    exported: {},
    sectionSummary: {},
    skipped: [],
    warnings: []
  };

  for (const name of selectedCollections) {
    try {
      const items = await getCollection(name);
      result[name] = sanitizeForJson(items);
      summary.exported[name] = Array.isArray(items) ? items.length : 0;
    } catch (error) {
      const readable = explainFirebaseError(error);
      if (OPTIONAL_COLLECTIONS.has(name) || error?.code === "permission-denied") {
        result[name] = [];
        summary.exported[name] = 0;
        summary.skipped.push(name);
        summary.warnings.push(`Coleção \"${name}\" ignorada no backup: ${readable}`);
        continue;
      }
      throw new Error(`Falha ao exportar \"${name}\": ${readable}`);
    }
  }

  summary.sectionSummary = buildSectionSummary(summary.exported);
  result._summary = summary;
  return result;
}

