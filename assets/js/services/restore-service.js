import { setDocument, explainFirebaseError } from "../db.js";
import { BACKUP_SECTIONS, getBackupSections, getCollectionsForSections, getSectionsByIds } from "./backup-service.js";

const OPTIONAL_COLLECTIONS = new Set(["admins", "contatos", "activity_logs", "bibliotecasUsuarios", "ensaios"]);

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeForFirestore(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map(sanitizeForFirestore);
  if (isObject(value)) {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === "id") continue;
      out[key] = sanitizeForFirestore(val);
    }
    return out;
  }
  return value;
}

function getBackupDataRoot(json) {
  if (!isObject(json)) {
    throw new Error("Arquivo de backup inválido.");
  }

  if (isObject(json.data)) return json.data;
  return json;
}

function countCollection(dataRoot, collectionName) {
  const items = dataRoot?.[collectionName];
  return Array.isArray(items) ? items.length : 0;
}

function sectionCount(dataRoot, section = {}) {
  return (section.collections || []).reduce((total, collectionName) => total + countCollection(dataRoot, collectionName), 0);
}

function buildCollectionCounts(dataRoot, collections = []) {
  return collections.reduce((acc, collectionName) => {
    acc[collectionName] = countCollection(dataRoot, collectionName);
    return acc;
  }, {});
}

export function analyzeBackupJson(json) {
  const dataRoot = getBackupDataRoot(json);
  const allSections = getBackupSections();
  const sections = allSections.map((section) => {
    const count = sectionCount(dataRoot, section);
    return {
      ...section,
      count,
      available: count > 0,
      collectionCounts: buildCollectionCounts(dataRoot, section.collections)
    };
  });

  const knownCollections = new Set(BACKUP_SECTIONS.flatMap((section) => section.collections));
  const unknownCollections = Object.entries(dataRoot)
    .filter(([key, value]) => !key.startsWith("_") && !knownCollections.has(key) && Array.isArray(value))
    .map(([key, value]) => ({ collection: key, count: value.length }));

  return {
    meta: isObject(json._meta) ? json._meta : {},
    sections,
    availableSections: sections.filter((section) => section.available),
    unknownCollections,
    totalItems: sections.reduce((total, section) => total + section.count, 0)
  };
}

function getImportableSectionIds(json) {
  const analysis = analyzeBackupJson(json);
  return analysis.availableSections.map((section) => section.id);
}

export async function restoreBackupJson(json, sectionIds = null) {
  const dataRoot = getBackupDataRoot(json);
  const availableIds = new Set(getImportableSectionIds(json));
  const selectedIds = Array.isArray(sectionIds) && sectionIds.length
    ? sectionIds.filter((id) => availableIds.has(id))
    : Array.from(availableIds);

  if (!selectedIds.length) {
    throw new Error("Nenhuma opção de backup foi selecionada para importar.");
  }

  const sections = getSectionsByIds(selectedIds).filter((section) => availableIds.has(section.id));
  const collections = getCollectionsForSections(sections.map((section) => section.id));
  const summary = {
    restored: {},
    sectionSummary: {},
    skipped: [],
    warnings: []
  };

  for (const collectionName of collections) {
    const items = dataRoot[collectionName];
    if (!Array.isArray(items) || !items.length) {
      summary.restored[collectionName] = 0;
      continue;
    }

    try {
      let restoredCount = 0;
      for (const item of items) {
        if (!item?.id) continue;
        const cleanData = sanitizeForFirestore(item);
        await setDocument(collectionName, item.id, cleanData, { merge: true });
        restoredCount += 1;
      }
      summary.restored[collectionName] = restoredCount;
    } catch (error) {
      const readable = explainFirebaseError(error);
      if (OPTIONAL_COLLECTIONS.has(collectionName) || error?.code === "permission-denied") {
        summary.restored[collectionName] = 0;
        summary.skipped.push(collectionName);
        summary.warnings.push(`Coleção \"${collectionName}\" ignorada: ${readable}`);
        continue;
      }

      throw new Error(`Falha ao restaurar \"${collectionName}\": ${readable}`);
    }
  }

  for (const section of sections) {
    summary.sectionSummary[section.id] = {
      label: section.label,
      count: section.collections.reduce((total, collectionName) => total + Number(summary.restored[collectionName] || 0), 0),
      collections: section.collections.reduce((acc, collectionName) => {
        acc[collectionName] = Number(summary.restored[collectionName] || 0);
        return acc;
      }, {})
    };
  }

  return summary;
}
