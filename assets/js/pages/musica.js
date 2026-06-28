import { getMusicaBySlug, listMusicas } from "../services/musicas-publicas-service.js";
import { getQueryParam } from "../utils.js";
import { createPersonalButtons, refreshPersonalActionButtons } from "../modules/personal-actions.js";
import { watchDocument } from "../db.js";

let currentPublicMusicaLiveUnsubscribe = null;
let currentPublicMusicaLiveSignature = "";

function buildPublicMusicaSignature(musica = {}) {
  return JSON.stringify({
    id: String(musica.id || ""),
    slug: String(musica.slug || ""),
    title: String(musica.title || ""),
    subtitle: String(musica.subtitle || ""),
    author: String(musica.author || ""),
    originalKey: String(musica.originalKey || ""),
    category: String(musica.category || ""),
    lyricHtml: String(musica.lyricHtml || ""),
    active: musica.active !== false
  });
}

function ensureMusicaUpdateBanner() {
  let banner = document.getElementById("musica-live-update-banner");
  if (banner) return banner;
  banner = document.createElement("button");
  banner.type = "button";
  banner.id = "musica-live-update-banner";
  banner.className = "musica-live-update-banner hidden";
  banner.textContent = "Essa música foi atualizada. Toque para atualizar";
  banner.addEventListener("click", () => window.location.reload());
  document.body.appendChild(banner);
  return banner;
}

function hideMusicaUpdateBanner() {
  ensureMusicaUpdateBanner().classList.add("hidden");
}

function showMusicaUpdateBanner() {
  ensureMusicaUpdateBanner().classList.remove("hidden");
}

function startPublicMusicaLiveWatch(musica = {}) {
  if (currentPublicMusicaLiveUnsubscribe) {
    currentPublicMusicaLiveUnsubscribe();
    currentPublicMusicaLiveUnsubscribe = null;
  }
  hideMusicaUpdateBanner();
  if (!musica?.id) return;
  currentPublicMusicaLiveSignature = buildPublicMusicaSignature(musica);
  currentPublicMusicaLiveUnsubscribe = watchDocument("musicasPublicas", musica.id, (nextDoc) => {
    if (!nextDoc) return;
    const nextSignature = buildPublicMusicaSignature(nextDoc);
    if (nextSignature !== currentPublicMusicaLiveSignature) {
      showMusicaUpdateBanner();
    }
  }, (error) => console.error("Erro ao observar atualizações da música pública:", error));
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensurePrevNextNav() {
  return document.querySelector(".prev-next-nav");
}

function renderPrevNext(currentSlug = "", items = []) {
  const nav = ensurePrevNextNav();
  if (!nav || !items.length) return;
  const currentIndex = items.findIndex((item) => String(item.slug || "") === String(currentSlug || ""));
  if (currentIndex === -1) {
    nav.innerHTML = "";
    return;
  }
  const previous = currentIndex > 0 ? items[currentIndex - 1] : null;
  const next = currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
  nav.innerHTML = `
    ${previous ? `<a href="./musica.html?slug=${encodeURIComponent(previous.slug)}" class="prev-link">← Anterior</a>` : `<span class="prev-link is-disabled">← Anterior</span>`}
    <span class="nav-divider"> | </span>
    ${next ? `<a href="./musica.html?slug=${encodeURIComponent(next.slug)}" class="next-link">Próxima →</a>` : `<span class="next-link is-disabled">Próxima →</span>`}
  `;
}

function renderMeta(musica) {
  const meta = document.getElementById("musica-meta");
  if (!meta) return;
  const parts = [];
  if (musica.author) parts.push(`<span class="meta-item">Autor: <strong>${escapeHtml(musica.author)}</strong></span>`);
  if (musica.originalKey) parts.push(`<span class="meta-item">Tom: <strong>${escapeHtml(musica.originalKey)}</strong></span>`);
  if (musica.category) parts.push(`<span class="meta-item">Categoria: <strong>${escapeHtml(musica.category)}</strong></span>`);
  meta.innerHTML = parts.join('<span class="meta-separator" aria-hidden="true"> | </span>');
}

function renderPersonalActions(musica) {
  const titleEl = document.getElementById("musica-titulo");
  if (!titleEl || !musica?.slug) return;

  let row = document.getElementById("musica-title-row");
  if (!row) {
    row = document.createElement("div");
    row.id = "musica-title-row";
    row.className = "page-title-row";
    titleEl.insertAdjacentElement("beforebegin", row);
    row.appendChild(titleEl);
  }

  let wrap = document.getElementById("musica-title-actions");
  if (!wrap) {
    wrap = document.createElement("span");
    wrap.id = "musica-title-actions";
    wrap.className = "personal-action-group";
    row.appendChild(wrap);
  }

  wrap.innerHTML = createPersonalButtons({
    type: "musica",
    title: musica.title || "",
    href: `./musica.html?slug=${encodeURIComponent(musica.slug)}`,
    slug: musica.slug || ""
  });
  refreshPersonalActionButtons(titleEl.closest(".container") || document);
}

function renderYoutube(url = "") {
  const wrapper = document.getElementById("musica-video-wrapper");
  if (!wrapper) return;
  const raw = String(url || "").trim();
  if (!raw) {
    wrapper.innerHTML = "";
    wrapper.hidden = true;
    return;
  }
  let embed = "";
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) embed = `https://www.youtube.com/embed/${id}`;
    } else if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\//, "");
      if (id) embed = `https://www.youtube.com/embed/${id}`;
    }
  } catch {}
  if (!embed) {
    wrapper.innerHTML = "";
    wrapper.hidden = true;
    return;
  }
  wrapper.hidden = false;
  wrapper.innerHTML = `<iframe src="${embed}" title="Vídeo da música" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const slug = getQueryParam("slug");
    const musica = await getMusicaBySlug(slug);
    const titleEl = document.getElementById("musica-titulo");
    const subtitleEl = document.getElementById("musica-subtitulo");
    const letraEl = document.getElementById("musica-letra");

    if (!musica) {
      if (titleEl) titleEl.textContent = "Música não encontrada";
      return;
    }

    if (titleEl) titleEl.textContent = musica.title || "Título da música";
    if (subtitleEl) {
      subtitleEl.textContent = musica.subtitle || "";
      subtitleEl.hidden = !musica.subtitle;
    }
    renderMeta(musica);
    renderPersonalActions(musica);
    if (letraEl) letraEl.innerHTML = musica.lyricHtml || "<p>Letra indisponível.</p>";
    renderYoutube("");
    document.querySelector(".page-cross-link")?.remove();

    const all = await listMusicas(true);
    renderPrevNext(musica.slug, all);
    startPublicMusicaLiveWatch(musica);

  } catch (error) {
    console.error("Erro ao carregar música pública:", error);
    const titleEl = document.getElementById("musica-titulo");
    if (titleEl) titleEl.textContent = "Erro ao carregar música";
  }
});

window.addEventListener("beforeunload", () => {
  if (currentPublicMusicaLiveUnsubscribe) {
    currentPublicMusicaLiveUnsubscribe();
    currentPublicMusicaLiveUnsubscribe = null;
  }
});
