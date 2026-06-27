import { watchAuth, getAdminProfileByEmail } from "../auth.js";
import { hasPermission, isPrimaryAdmin } from "../services/admin-permissions-service.js";
import { listProgramacoes, getProgramacao, saveProgramacao, removeProgramacao } from "../services/programacoes-service.js";
import { listMusicas } from "../services/musicas-service.js";
import { listCifras } from "../services/cifras-service.js";
import { recordAdminActivity } from "../services/admin-activity-service.js";

function $(selector) {
  return document.querySelector(selector);
}

let musicasCache = [];
let cifrasCache = [];
let selectedSongs = [];

function fmtDate(value = "") {
  if (!value) return "Sem data";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeHtml(text = "") {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getCifraForMusica(musica) {
  if (!musica) return null;
  return cifrasCache.find((item) => item.musicaId === musica.id || item.slug === musica.slug || item.title === musica.title) || null;
}

function buildSongPayload(musicaId) {
  const musica = musicasCache.find((m) => m.id === musicaId);
  if (!musica) return null;
  const cifra = getCifraForMusica(musica);

  return {
    musicaId: musica.id,
    title: musica.title || "",
    slug: musica.slug || "",
    subtitle: musica.subtitle || "",
    cifraSlug: cifra?.slug || "",
    hasCifra: !!cifra
  };
}

function renderSelectedSongs() {
  const root = $("#programacao-selected-songs");
  if (!root) return;

  if (!selectedSongs.length) {
    root.innerHTML = `<div class="programacao-empty-inline">Nenhuma música adicionada ainda.</div>`;
    return;
  }

  root.innerHTML = selectedSongs.map((song, index) => `
    <div class="programacao-song-row" data-song-id="${song.musicaId}">
      <div class="programacao-song-main">
        <strong>${index + 1}. ${escapeHtml(song.title)}</strong>
        ${song.subtitle ? `<small>${escapeHtml(song.subtitle)}</small>` : ""}
      </div>
      <div class="programacao-song-actions">
        <button type="button" class="button-outline" data-up-song="${song.musicaId}" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="button-outline" data-down-song="${song.musicaId}" ${index === selectedSongs.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="button-danger" data-remove-song="${song.musicaId}">Remover</button>
      </div>
    </div>
  `).join("");

  root.querySelectorAll("[data-remove-song]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedSongs = selectedSongs.filter((item) => item.musicaId !== btn.dataset.removeSong);
      renderSelectedSongs();
    });
  });

  root.querySelectorAll("[data-up-song]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.upSong;
      const idx = selectedSongs.findIndex((item) => item.musicaId === id);
      if (idx > 0) {
        [selectedSongs[idx - 1], selectedSongs[idx]] = [selectedSongs[idx], selectedSongs[idx - 1]];
        renderSelectedSongs();
      }
    });
  });

  root.querySelectorAll("[data-down-song]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.downSong;
      const idx = selectedSongs.findIndex((item) => item.musicaId === id);
      if (idx !== -1 && idx < selectedSongs.length - 1) {
        [selectedSongs[idx + 1], selectedSongs[idx]] = [selectedSongs[idx], selectedSongs[idx + 1]];
        renderSelectedSongs();
      }
    });
  });
}

function renderAvailableSongs(term = "") {
  const root = $("#programacao-available-songs");
  if (!root) return;

  const q = String(term || "").trim().toLowerCase();
  const selectedIds = new Set(selectedSongs.map((item) => item.musicaId));

  const filtered = musicasCache
    .filter((item) => !selectedIds.has(item.id))
    .filter((item) => {
      if (!q) return true;
      return String(item.title || "").toLowerCase().includes(q) ||
             String(item.subtitle || "").toLowerCase().includes(q);
    })
    .slice(0, 40);

  if (!filtered.length) {
    root.innerHTML = `<div class="programacao-empty-inline">Nenhuma música disponível.</div>`;
    return;
  }

  root.innerHTML = filtered.map((item) => `
    <button type="button" class="programacao-song-pick" data-pick-song="${item.id}">
      <strong>${escapeHtml(item.title || "")}</strong>
      ${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ""}
    </button>
  `).join("");

  root.querySelectorAll("[data-pick-song]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const song = buildSongPayload(btn.dataset.pickSong);
      if (!song) return;
      selectedSongs.push(song);
      renderSelectedSongs();
      renderAvailableSongs($("#programacao-song-search")?.value || "");
    });
  });
}


function normalizeHideAfterHours(value = "") {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return "";

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : "";
  }

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [hours, minutes] = raw.split(":").map(Number);
    const num = (hours || 0) + ((minutes || 0) / 60);
    return Number.isFinite(num) && num >= 0 ? num : "";
  }

  return "";
}

function fmtHideAfter(value) {
  const hours = normalizeHideAfterHours(value);
  if (hours === "") return "";
  if (hours === 0) return "no horário de início";

  const totalMinutes = Math.round(Number(hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const parts = [];
  if (h) parts.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (m) parts.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
  return parts.join(" e ") || "no horário de início";
}

function ensureModal() {
  if ($("#programacao-modal")) return;

  const modal = document.createElement("div");
  modal.id = "programacao-modal";
  modal.className = "programacao-modal hidden";
  modal.innerHTML = `
    <div class="programacao-modal-overlay" data-close-modal="1"></div>
    <div class="programacao-modal-panel">
      <div class="programacao-modal-header">
        <h2 id="programacao-modal-title">Nova programação</h2>
        <button type="button" class="programacao-close" data-close-modal="1">✕</button>
      </div>

      <form id="programacao-form" class="programacao-form">
        <input type="hidden" id="programacao-id" />

        <label>
          <span>Título</span>
          <input type="text" id="programacao-title" placeholder="Ex.: Culto Jovem Especial" required />
        </label>

        <div class="programacao-grid">
          <label>
            <span>Data</span>
            <input type="date" id="programacao-date" required />
          </label>
          <label>
            <span>Hora</span>
            <input type="time" id="programacao-time" required />
          </label>
        </div>

        <label>
          <span>Local</span>
          <input type="text" id="programacao-location" placeholder="Ex.: IASD Central" />
        </label>

        <label>
          <span>Google Maps <small>(opcional)</small></span>
          <input type="url" id="programacao-maps-url" placeholder="Cole aqui o link do local no Google Maps" />
          <small class="field-help">Quando preenchido, o local vira um botão clicável na página inicial.</small>
        </label>

        <label>
          <span>Descrição</span>
          <textarea id="programacao-description" rows="3" placeholder="Observações da programação"></textarea>
        </label>

        <div class="programacao-grid">
          <label>
            <span>Ocultar após <small>(horas)</small></span>
            <input type="number" id="programacao-hide-after" min="0" step="0.25" placeholder="Ex.: 3" />
            <small class="field-help">Tempo extra depois do início. Ex.: 3 = some 3 horas após começar. Em branco = some no horário de início.</small>
          </label>
        </div>

        <div class="programacao-song-picker">
          <div class="programacao-song-picker-header">
            <h3>Músicas da programação</h3>
            <input type="search" id="programacao-song-search" placeholder="Buscar músicas cadastradas..." />
          </div>

          <div class="programacao-song-columns">
            <div>
              <p class="programacao-song-title">Disponíveis</p>
              <div id="programacao-available-songs" class="programacao-song-list"></div>
            </div>
            <div>
              <p class="programacao-song-title">Selecionadas</p>
              <div id="programacao-selected-songs" class="programacao-song-list"></div>
            </div>
          </div>
        </div>

        <div class="programacao-actions">
          <button type="button" class="button-outline" id="programacao-cancel">Cancelar</button>
          <button type="submit" class="button-primary" id="programacao-save">Salvar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll("[data-close-modal='1']").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  $("#programacao-cancel")?.addEventListener("click", closeModal);
  $("#programacao-form")?.addEventListener("submit", onSubmitForm);
  $("#programacao-song-search")?.addEventListener("input", (event) => renderAvailableSongs(event.target.value));
}

async function preloadCatalogs() {
  musicasCache = await listMusicas(true);
  cifrasCache = await listCifras(true);
}

function openModal(data = null) {
  ensureModal();

  $("#programacao-id").value = data?.id || "";
  $("#programacao-title").value = data?.title || "";
  $("#programacao-date").value = data?.date || "";
  $("#programacao-time").value = data?.time || "";
  $("#programacao-location").value = data?.location || "";
  $("#programacao-maps-url").value = data?.mapsUrl || data?.googleMapsUrl || "";
  $("#programacao-description").value = data?.description || "";
  $("#programacao-hide-after").value = normalizeHideAfterHours(data?.hideAfterHours ?? data?.hideAfter ?? "");
  $("#programacao-modal-title").textContent = data?.id ? "Editar programação" : "Nova programação";
  $("#programacao-song-search").value = "";

  selectedSongs = Array.isArray(data?.songs) ? data.songs.map((item) => ({
    musicaId: item.musicaId || "",
    title: item.title || "",
    slug: item.slug || "",
    subtitle: item.subtitle || "",
    cifraSlug: item.cifraSlug || "",
    hasCifra: item.hasCifra !== false && !!item.cifraSlug
  })) : [];

  renderSelectedSongs();
  renderAvailableSongs("");

  $("#programacao-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");

  setTimeout(() => {
    $("#programacao-title")?.focus();
  }, 50);
}

function closeModal() {
  $("#programacao-modal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

async function onSubmitForm(event) {
  event.preventDefault();

  const hideAfterRaw = $("#programacao-hide-after")?.value?.trim() || "";
  const hideAfterHours = normalizeHideAfterHours(hideAfterRaw);

  if (hideAfterRaw && hideAfterHours === "") {
    alert("Preencha o campo 'Ocultar após' apenas com número de horas. Ex.: 1, 3 ou 4.5.");
    return;
  }

  const payload = {
    title: $("#programacao-title").value.trim(),
    date: $("#programacao-date").value,
    time: $("#programacao-time").value,
    location: $("#programacao-location").value.trim(),
    mapsUrl: $("#programacao-maps-url")?.value?.trim() || "",
    description: $("#programacao-description").value.trim(),
    hideAfter: hideAfterHours === "" ? "" : String(hideAfterHours),
    hideAfterHours,
    songs: selectedSongs,
    active: true
  };

  if (!payload.title || !payload.date || !payload.time) {
    alert("Preencha título, data e hora.");
    return;
  }

  const id = $("#programacao-id").value.trim();

  try {
    const saveBtn = $("#programacao-save");
    if (saveBtn) saveBtn.disabled = true;

    const savedId = await saveProgramacao(payload, id);
    await recordAdminActivity({ action: id ? "update" : "create", module: "programacoes", itemId: savedId, itemName: payload.title });
    closeModal();
    await renderProgramacoes();
  } catch (error) {
    console.error("Erro ao salvar programação:", error);
    alert("Não foi possível salvar a programação.");
  } finally {
    const saveBtn = $("#programacao-save");
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function onEditProgramacao(id) {
  try {
    const item = await getProgramacao(id);
    if (!item) {
      alert("Programação não encontrada.");
      return;
    }
    openModal({ ...item, id });
  } catch (error) {
    console.error(error);
    alert("Não foi possível abrir a programação para edição.");
  }
}

async function onDeleteProgramacao(id) {
  if (!confirm("Deseja excluir esta programação?")) return;

  try {
    const item = await getProgramacao(id);
    await removeProgramacao(id);
    await recordAdminActivity({ action: "delete", module: "programacoes", itemId: id, itemName: item?.title || "Programação" });
    await renderProgramacoes();
  } catch (error) {
    console.error(error);
    alert("Não foi possível excluir a programação.");
  }
}

function renderEmptyState(root) {
  root.innerHTML = `
    <div class="programacao-empty">
      <p>Nenhuma programação criada ainda.</p>
    </div>
  `;
}

function buildSongsPreview(songs = []) {
  if (!songs.length) return "";
  return `
    <div class="programacao-admin-songs">
      ${songs.map((song, index) => `
        <div class="programacao-admin-song-line">
          <span>${index + 1}. ${escapeHtml(song.title || "")}</span>
          <span class="programacao-admin-links">
            ${song.slug ? `<a href="../musica.html?slug=${song.slug}" target="_blank" rel="noopener">Vocal</a>` : "<span>Vocal</span>"}
            ${song.cifraSlug ? `<a href="../cifra.html?slug=${song.cifraSlug}" target="_blank" rel="noopener">Banda</a>` : `<span class="is-disabled">Em breve</span>`}
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

async function renderProgramacoes() {
  const root = $("#admin-programacoes-list");
  if (!root) return;

  try {
    const items = await listProgramacoes(false);

    if (!items.length) {
      renderEmptyState(root);
      return;
    }

    root.innerHTML = items.map((item) => `
      <article class="programacao-admin-card" data-id="${item.id}">
        <div class="programacao-admin-main">
          <h3>${escapeHtml(item.title || "Sem título")}</h3>
          <p>${escapeHtml(fmtDate(item.date))} • ${escapeHtml(item.time || "--:--")}${item.location ? " • " + escapeHtml(item.location) : ""}</p>
          ${item.mapsUrl || item.googleMapsUrl ? `<p class="programacao-hide-after">Google Maps cadastrado</p>` : ""}
          ${item.hideAfter || item.hideAfterHours ? `<p class="programacao-hide-after">Ocultar após: ${escapeHtml(fmtHideAfter(item.hideAfterHours ?? item.hideAfter))}</p>` : ""}
          ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
          ${buildSongsPreview(item.songs || [])}
        </div>
        <div class="programacao-admin-actions">
          <button type="button" class="button-outline" data-edit-id="${item.id}">Editar</button>
          <button type="button" class="button-danger" data-delete-id="${item.id}">Excluir</button>
        </div>
      </article>
    `).join("");

    root.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => onEditProgramacao(btn.dataset.editId));
    });

    root.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => onDeleteProgramacao(btn.dataset.deleteId));
    });
  } catch (error) {
    console.error("Erro ao listar programações:", error);
    root.innerHTML = `
      <div class="programacao-empty">
        <p>Não foi possível carregar as programações.</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  ensureModal();
  await preloadCatalogs();
  $("#new-programacao-button")?.addEventListener("click", () => openModal());
  await renderProgramacoes();
});

watchAuth(async (user) => {
  if (!user?.email) return;
  const admin = await getAdminProfileByEmail(user.email);
  if (!admin) return;
  const refresh = async () => {
    await renderProgramacoes();
    document.getElementById('new-programacao-button')?.classList.toggle('hidden', !hasPermission(admin,'programacoes','create'));
    document.querySelectorAll('[data-edit-id]').forEach((el)=>el.classList.toggle('hidden', !hasPermission(admin,'programacoes','edit')));
    document.querySelectorAll('[data-delete-id]').forEach((el)=>el.classList.toggle('hidden', !hasPermission(admin,'programacoes','delete')));
  };
  await refresh();
});
