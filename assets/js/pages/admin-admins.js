import {
  listAdmins,
  saveSecondaryAdmin,
  removeSecondaryAdmin,
  DEFAULT_PERMISSIONS,
  cloneDefaultPermissions,
  getEffectivePermissions,
  isPrimaryAdmin
} from "../services/admin-permissions-service.js";

const MODULE_TITLES = {
  musicas: "Músicas públicas",
  musicasVocal: "Músicas vocal",
  vocalistas: "Vocalistas",
  cifras: "Cifras",
  programacoes: "Programações",
  fotos: "Fotos",
  downloadsGerais: "Downloads gerais",
  downloadsPorMusica: "Downloads por música",
  contatos: "Contatos",
  notificacoes: "Notificações",
  ensaios: "Ensaios"
};

const LABELS = {
  musicas: { create: "Pode criar", edit: "Pode editar", delete: "Pode excluir" },
  musicasVocal: { create: "Pode criar", edit: "Pode editar", delete: "Pode excluir" },
  vocalistas: { create: "Pode cadastrar", edit: "Pode editar", delete: "Pode excluir", activate: "Pode ativar/desativar" },
  cifras: {
    create: "Pode criar",
    edit: "Pode editar",
    delete: "Pode excluir",
    capo: "Editar capotraste",
    bpm: "Editar BPM",
    compasso: "Editar compasso",
    inst_violao: "Instrumento: Violão",
    inst_guitarra: "Instrumento: Guitarra",
    inst_baixo: "Instrumento: Baixo",
    inst_teclado: "Instrumento: Teclado"
  },
  programacoes: { create: "Pode criar", edit: "Pode editar", delete: "Pode excluir" },
  fotos: { create: "Pode criar", edit: "Pode editar", delete: "Pode excluir" },
  downloadsGerais: { create: "Pode criar", edit: "Pode editar", delete: "Pode excluir" },
  downloadsPorMusica: { create: "Pode criar", edit: "Pode editar", delete: "Pode excluir" },
  contatos: { view: "Pode ver", delete: "Pode excluir/marcar" },
  notificacoes: {
    create: "Pode criar",
    edit: "Pode editar",
    delete: "Pode excluir",
    popup: "Usar pop-up",
    top: "Usar exibir no topo",
    buttonLink: "Usar botão/link",
    beforeStart: "Usar exibir antes da data de início"
  },
  ensaios: { create: "Pode criar", edit: "Pode editar", delete: "Pode excluir" }
};

function qs(sel) {
  return document.querySelector(sel);
}

function ensurePermissionCards() {
  const grid = document.querySelector(".admin-permission-grid");
  if (!grid) return;

  Object.keys(DEFAULT_PERMISSIONS).forEach((moduleKey) => {
    let root = grid.querySelector(`[data-module="${moduleKey}"]`);

    if (!root) {
      const card = document.createElement("section");
      card.className = "admin-permission-card";
      card.innerHTML = `
        <h3>${MODULE_TITLES[moduleKey] || moduleKey}</h3>
        <div class="admin-permission-items" data-module="${moduleKey}"></div>
      `;
      grid.appendChild(card);
      root = card.querySelector(`[data-module="${moduleKey}"]`);
    }

    const title = root.closest(".admin-permission-card")?.querySelector("h3");
    if (title && MODULE_TITLES[moduleKey]) title.textContent = MODULE_TITLES[moduleKey];
  });
}

function renderPermissionToggles() {
  ensurePermissionCards();

  Object.entries(DEFAULT_PERMISSIONS).forEach(([moduleKey, modulePerms]) => {
    const root = document.querySelector(`[data-module="${moduleKey}"]`);
    if (!root) return;

    root.innerHTML = Object.keys(modulePerms).map((permKey) => `
      <label class="admin-permission-row">
        <span>${LABELS[moduleKey]?.[permKey] || permKey}</span>
        <span class="admin-switch">
          <input type="checkbox" data-permission="${moduleKey}.${permKey}" />
          <span class="admin-switch-slider"></span>
        </span>
      </label>
    `).join("");
  });
}

function readPermissionsFromForm() {
  const output = cloneDefaultPermissions();

  document.querySelectorAll("[data-permission]").forEach((input) => {
    const [moduleKey, permKey] = input.dataset.permission.split(".");
    if (output[moduleKey] && permKey in output[moduleKey]) {
      output[moduleKey][permKey] = input.checked === true;
    }
  });

  return output;
}

function writePermissionsToForm(permissions = {}) {
  const effective = getEffectivePermissions({ permissions, isPrimary: false });

  document.querySelectorAll("[data-permission]").forEach((input) => {
    const [moduleKey, permKey] = input.dataset.permission.split(".");
    input.checked = effective?.[moduleKey]?.[permKey] === true;
  });
}

function resetForm() {
  qs("#admin-secondary-id").value = "";
  qs("#admin-secondary-name").value = "";
  qs("#admin-secondary-email").value = "";
  writePermissionsToForm(cloneDefaultPermissions());
}

function summarizePermissions(item) {
  const perms = getEffectivePermissions(item);
  const tags = [];

  Object.keys(perms).forEach((moduleKey) => {
    if (Object.values(perms[moduleKey]).some(Boolean)) {
      tags.push(MODULE_TITLES[moduleKey] || moduleKey);
    }
  });

  return tags;
}

async function renderList() {
  const root = qs("#admin-secondary-list");
  if (!root) return;

  const all = await listAdmins();
  const secondary = all.filter((item) => !isPrimaryAdmin(item));

  root.innerHTML = secondary.length ? secondary.map((item) => `
    <div class="admin-list-card">
      <div>
        <strong>${item.name || item.nome || ""}</strong>
        <p class="admin-admin-email">${item.email || ""}</p>
        <div class="admin-admin-tags">
          ${summarizePermissions(item).map((tag) => `<span class="admin-admin-tag">${tag}</span>`).join("")}
        </div>
      </div>
      <div class="admin-list-actions">
        <button type="button" class="button-outline" data-edit-id="${item.id}">Editar</button>
        <button type="button" class="button-danger" data-delete-id="${item.id}">Excluir</button>
      </div>
    </div>
  `).join("") : "<p>Nenhum administrador secundário cadastrado.</p>";

  root.querySelectorAll("[data-edit-id]").forEach((btn) => btn.addEventListener("click", async () => {
    const allAdmins = await listAdmins();
    const item = allAdmins.find((entry) => entry.id === btn.dataset.editId);
    if (!item) return;

    qs("#admin-secondary-id").value = item.id || "";
    qs("#admin-secondary-name").value = item.name || item.nome || "";
    qs("#admin-secondary-email").value = item.email || "";
    writePermissionsToForm(item.permissions || {});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));

  root.querySelectorAll("[data-delete-id]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Excluir este administrador secundário?")) return;
    await removeSecondaryAdmin(btn.dataset.deleteId);
    await renderList();
  }));
}

document.addEventListener("DOMContentLoaded", async () => {
  renderPermissionToggles();
  resetForm();
  await renderList();

  qs("#admin-secondary-reset")?.addEventListener("click", resetForm);

  qs("#admin-admin-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: qs("#admin-secondary-name").value.trim(),
      email: qs("#admin-secondary-email").value.trim(),
      permissions: readPermissionsFromForm(),
      active: true
    };

    await saveSecondaryAdmin(payload, qs("#admin-secondary-id").value.trim());
    alert("✅ ADM salvo com sucesso!");
    resetForm();
    await renderList();
  });
});
