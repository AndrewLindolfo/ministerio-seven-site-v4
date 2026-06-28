import { addDocument, updateDocument, deleteDocument, getCollection, getDocument, serverTimestamp } from "../db.js";

const COLLECTION = "programacoes";

function toLocalDateTime(dateStr = "", timeStr = "") {
  if (!dateStr) return null;

  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  const timeParts = String(timeStr || "00:00").split(":");
  const hours = Number(timeParts[0] || 0);
  const minutes = Number(timeParts[1] || 0);

  const dt = new Date(year, month, day, hours, minutes, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseHideAfterDurationMs(item = {}, startDate = null) {
  const rawMinutes = item?.hideAfterMinutes;
  const normalizedMinutes = normalizeHideAfterMinutes(rawMinutes);

  // Padrão V4: duração em minutos, podendo vir de um campo HH:mm no cadastro.
  // Ex.: "00:30" = 30 minutos, "01:00" = 1 hora.
  if (normalizedMinutes !== "") {
    return Math.round(Number(normalizedMinutes)) * 60 * 1000;
  }

  const raw = item?.hideAfterHours ?? item?.hideAfter ?? "";
  const value = String(raw ?? "").trim().replace(",", ".");

  if (!value) return 0;

  // Compatibilidade com a etapa anterior da V4: número de horas.
  // Ex.: "3" = 3 horas, "0.5" = 30 minutos.
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return Number(value) * 60 * 60 * 1000;
  }

  // Compatibilidade: se algum cadastro antigo estiver como HH:mm, tratar como duração.
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(":").map(Number);
    return ((hours || 0) * 60 + (minutes || 0)) * 60 * 1000;
  }

  // Compatibilidade com versões antigas que salvaram data/hora absoluta.
  const parsed = new Date(value);
  if (startDate && !Number.isNaN(parsed.getTime())) {
    return Math.max(0, parsed.getTime() - startDate.getTime());
  }

  return 0;
}

function getHideUntilDate(item = {}) {
  const startDate = toLocalDateTime(item?.date, item?.time);
  if (!startDate) return null;

  const extraMs = parseHideAfterDurationMs(item, startDate);
  return new Date(startDate.getTime() + extraMs);
}

function isProgramacaoVisible(item) {
  const hideUntil = getHideUntilDate(item);
  if (!hideUntil) return false;
  return hideUntil.getTime() >= Date.now();
}

function sortByDateTimeAsc(list = []) {
  return [...list].sort((a, b) => {
    const ad = toLocalDateTime(a.date, a.time);
    const bd = toLocalDateTime(b.date, b.time);

    if (!ad && !bd) return 0;
    if (!ad) return 1;
    if (!bd) return -1;

    return ad.getTime() - bd.getTime();
  });
}

function normalizeHideAfterMinutes(value = "") {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return "";

  if (/^\d+$/.test(raw)) {
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : "";
  }

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const num = Math.round(Number(raw));
    return Number.isFinite(num) && num >= 0 ? num : "";
  }

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [hours, minutes] = raw.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0 || minutes > 59) return "";
    const total = (hours * 60) + minutes;
    return Number.isFinite(total) && total >= 0 ? total : "";
  }

  return "";
}

export async function listProgramacoes(activeOnly = false) {
  const all = await getCollection(COLLECTION);
  const filtered = all.filter((item) => activeOnly ? item.active !== false : true);
  return sortByDateTimeAsc(filtered);
}

export async function listUpcomingProgramacoes() {
  const all = await listProgramacoes(true);
  const visible = all.filter((item) => isProgramacaoVisible(item));
  return sortByDateTimeAsc(visible);
}

export async function getProgramacao(id) {
  return await getDocument(COLLECTION, id);
}

export async function saveProgramacao(payload, id = "") {
  const hideAfterMinutes = normalizeHideAfterMinutes(payload.hideAfterMinutes ?? payload.hideAfterMinutesRaw ?? "");
  const hideAfterHours = hideAfterMinutes === "" ? "" : Number(hideAfterMinutes) / 60;
  const mapsUrl = String(payload.mapsUrl || payload.googleMapsUrl || "").trim();

  const docData = {
    title: payload.title || "",
    date: payload.date || "",
    time: payload.time || "",
    location: payload.location || "",
    mapsUrl,
    googleMapsUrl: mapsUrl,
    description: payload.description || "",
    hideAfter: hideAfterHours === "" ? "" : String(hideAfterHours),
    hideAfterHours,
    hideAfterMinutes,
    songs: Array.isArray(payload.songs) ? payload.songs : [],
    active: payload.active !== false,
    updatedAt: serverTimestamp()
  };

  if (id) {
    await updateDocument(COLLECTION, id, docData);
    return id;
  }

  docData.createdAt = serverTimestamp();
  return await addDocument(COLLECTION, docData);
}

export async function removeProgramacao(id) {
  await deleteDocument(COLLECTION, id);
}
