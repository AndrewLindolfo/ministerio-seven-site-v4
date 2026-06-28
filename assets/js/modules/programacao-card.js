import { listUpcomingProgramacoes } from "../services/programacoes-service.js";
import { listCifras } from "../services/cifras-service.js";
import { listMusicas as listMusicasPublicas } from "../services/musicas-publicas-service.js";
import { getCurrentPublicUser } from "../public-auth.js";

const VOCAL_NAV_CACHE_KEY = "seven_vocal_nav_permission_v3";
const VOCAL_NAV_LEGACY_CACHE_KEYS = ["seven_vocal_nav_permission", "seven_vocal_nav_permission_v2"];

function escapeHtml(text = "") {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSafeExternalUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function normalize(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fmtDate(value = "") {
  if (!value) return "Sem data";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildCountdown(date = "", time = "") {
  if (!date) return "";
  const parts = String(date).split("-");
  if (parts.length !== 3) return "";
  const timeParts = String(time || "00:00").split(":");

  const dt = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
    Number(timeParts[0] || 0),
    Number(timeParts[1] || 0),
    0,
    0
  );

  const now = new Date();
  const diff = dt.getTime() - now.getTime();

  if (diff <= 0) return "Acontece hoje";

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const chunks = [];
  if (days > 0) chunks.push(`${days}d`);
  if (hours > 0) chunks.push(`${hours}h`);
  if (minutes > 0 && days === 0) chunks.push(`${minutes}min`);

  return chunks.length ? `Começa em ${chunks.join(" ")}` : "Começa em instantes";
}

function getCachedVocalPermission() {
  try {
    for (const key of [VOCAL_NAV_CACHE_KEY, ...VOCAL_NAV_LEGACY_CACHE_KEYS]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const expiresAt = Number(data.expiresAt || 0);
      if (!expiresAt || expiresAt < Date.now()) {
        localStorage.removeItem(key);
        continue;
      }
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function canSeeVocalArea() {
  const profile = getCurrentPublicUser();
  if (profile?.isAdmin || profile?.isVocalista) return true;
  const cached = getCachedVocalPermission();
  return !!cached?.canSeeVocal;
}

function resolveExistingCifra(song = {}, cifraIndex = []) {
  const songTitle = normalize(song.title || song.name || "");
  const songSlug = String(song.slug || "").trim();
  const songCifraSlug = String(song.cifraSlug || "").trim();
  const songMusicaId = String(song.musicaId || "").trim();

  return cifraIndex.find((cifra) => {
    const cifraSlug = String(cifra.slug || "").trim();
    const cifraTitle = normalize(cifra.title || "");
    const cifraMusicaId = String(cifra.musicaId || "").trim();

    if (songCifraSlug && cifraSlug === songCifraSlug) return true;
    if (songMusicaId && cifraMusicaId && songMusicaId === cifraMusicaId) return true;
    if (songSlug && cifraSlug === songSlug) return true;
    if (songTitle && cifraTitle === songTitle) return true;

    return false;
  }) || null;
}

function resolveExistingPublicMusica(song = {}, musicasPublicasIndex = []) {
  const songTitle = normalize(song.title || song.name || "");
  const songSlug = String(song.slug || "").trim();
  const songPublicSlug = String(song.publicSlug || song.publicMusicaSlug || song.musicaPublicaSlug || "").trim();
  const songPublicId = String(song.publicMusicaId || song.musicaPublicaId || song.publicMusicId || "").trim();

  return musicasPublicasIndex.find((musica) => {
    const musicaId = String(musica.id || "").trim();
    const musicaSlug = String(musica.slug || "").trim();
    const musicaTitle = normalize(musica.title || musica.name || "");

    if (songPublicId && musicaId === songPublicId) return true;
    if (songPublicSlug && musicaSlug === songPublicSlug) return true;
    if (songSlug && musicaSlug === songSlug) return true;
    if (songTitle && musicaTitle === songTitle) return true;

    return false;
  }) || null;
}

function renderLetraLink(song = {}, musicasPublicasIndex = []) {
  const existingMusica = resolveExistingPublicMusica(song, musicasPublicasIndex);
  if (existingMusica?.slug) {
    return `
      <a class="programacao-link-chip programacao-link-chip--letra" href="./musica.html?slug=${encodeURIComponent(existingMusica.slug)}">
        <span class="programacao-link-icon" aria-hidden="true">📄</span>
        <span>Letra</span>
      </a>
    `;
  }

  return `
    <span class="programacao-link-chip programacao-link-chip--muted">
      <span class="programacao-link-icon" aria-hidden="true">📄</span>
      <span>Em breve</span>
    </span>
  `;
}

function renderVocalLink(song = {}, canSeeVocal = false) {
  if (!canSeeVocal) return "";

  const slug = String(song.slug || song.vocalSlug || "").trim();
  if (slug) {
    return `
      <a class="programacao-link-chip programacao-link-chip--vocal" href="./musica-vocal.html?slug=${encodeURIComponent(slug)}">
        <span class="programacao-link-icon" aria-hidden="true">🎤</span>
        <span>Vocal</span>
      </a>
    `;
  }

  return `
    <span class="programacao-link-chip programacao-link-chip--muted">
      <span class="programacao-link-icon" aria-hidden="true">🎤</span>
      <span>Vocal</span>
    </span>
  `;
}

function renderCifraLink(song = {}, cifraIndex = []) {
  const existingCifra = resolveExistingCifra(song, cifraIndex);
  if (existingCifra?.slug) {
    return `
      <a class="programacao-link-chip programacao-link-chip--banda" href="./cifra.html?slug=${encodeURIComponent(existingCifra.slug)}">
        <span class="programacao-link-icon" aria-hidden="true">🎸</span>
        <span>Cifra</span>
      </a>
    `;
  }

  return `
    <span class="programacao-link-chip programacao-link-chip--muted">
      <span class="programacao-link-icon" aria-hidden="true">🎸</span>
      <span>Em breve</span>
    </span>
  `;
}

function renderSongLine(song = {}, index = 0, cifraIndex = [], musicasPublicasIndex = [], canSeeVocal = false) {
  return `
    <div class="programacao-item">
      <div class="programacao-item-main">
        <span class="programacao-item-number">${index + 1}</span>
        <span class="programacao-item-title">${escapeHtml(song.title || "")}</span>
      </div>
      <div class="programacao-links">
        ${renderLetraLink(song, musicasPublicasIndex)}
        ${renderVocalLink(song, canSeeVocal)}
        ${renderCifraLink(song, cifraIndex)}
      </div>
    </div>
  `;
}

function renderProgramacaoBox(item = {}, isFirst = false, cifraIndex = [], musicasPublicasIndex = [], canSeeVocal = false) {
  const countdown = buildCountdown(item.date, item.time);
  const songs = Array.isArray(item.songs) ? item.songs : [];
  const mapsUrl = getSafeExternalUrl(item.mapsUrl || item.googleMapsUrl || "");
  const metaParts = [
    { icon: '📅', text: fmtDate(item.date) },
    { icon: '🕘', text: item.time || '--:--' },
    item.location ? { icon: '📍', text: item.location, href: mapsUrl } : null
  ].filter(Boolean);

  return `
    <div class="programacao-box${isFirst ? " programacao-box--primary" : ""}">
      <div class="programacao-box-topline"></div>
      <div class="programacao-header">
        <div class="programacao-header-main">
          <h3>${escapeHtml(item.title || "Programação")}</h3>
          <div class="programacao-meta">
            ${metaParts.map((part) => {
              const content = `
                <span class="programacao-meta-icon" aria-hidden="true">${part.icon}</span>
                <span>${escapeHtml(part.text)}</span>
              `;

              return part.href
                ? `<a class="programacao-meta-chip programacao-meta-chip--link" href="${escapeHtml(part.href)}" target="_blank" rel="noopener noreferrer" title="Abrir localização no Google Maps">${content}</a>`
                : `<span class="programacao-meta-chip">${content}</span>`;
            }).join('')}
          </div>
        </div>
        ${countdown ? `<span class="programacao-countdown">${escapeHtml(countdown)}</span>` : ''}
      </div>
      <div class="programacao-lista">
        ${songs.map((song, index) => renderSongLine(song, index, cifraIndex, musicasPublicasIndex, canSeeVocal)).join("")}
      </div>
    </div>
  `;
}

export async function renderProgramacaoCard() {
  const box = document.getElementById("programacao-card");
  if (!box) return;

  try {
    const canSeeVocal = canSeeVocalArea();
    const [upcoming, cifras, musicasPublicas] = await Promise.all([
      listUpcomingProgramacoes(),
      listCifras(true),
      listMusicasPublicas(true)
    ]);

    if (!upcoming.length) {
      box.innerHTML = `
        <div class="programacao-box">
          <p>Nenhuma programação futura cadastrada.</p>
        </div>
      `;
      return;
    }

    box.innerHTML = upcoming
      .map((item, index) => renderProgramacaoBox(item, index === 0, cifras || [], musicasPublicas || [], canSeeVocal))
      .join("");
  } catch (error) {
    console.error("Erro ao renderizar programação da home:", error);
    box.innerHTML = `
      <div class="programacao-box">
        <p>Não foi possível carregar as programações.</p>
      </div>
    `;
  }
}
