import { getCollection } from "../db.js";
import { setVocalista, removeVocalista, listVocalistas } from "../services/vocalistas-service.js";
import { recordAdminActivity } from "../services/admin-activity-service.js";

let publicUsers = [];
let vocalistas = [];

function normalize(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDisplayName(user = {}) {
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Usuário";
}

async function loadData() {
  const [users, marked] = await Promise.all([
    getCollection("usuariosPublicos"),
    listVocalistas()
  ]);
  publicUsers = users.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), "pt-BR"));
  vocalistas = marked;
}

function isMarked(uid = "") {
  return vocalistas.some((item) => String(item.uid || item.id || "") === String(uid || ""));
}

async function renderVocalistas() {
  const box = document.getElementById("admin-vocalistas-list");
  const search = document.getElementById("admin-vocalistas-search");
  if (!box) return;

  const term = normalize(search?.value || "");
  const filtered = !term ? publicUsers : publicUsers.filter((user) => {
    return normalize(getDisplayName(user)).includes(term) || normalize(user.email).includes(term);
  });

  if (!filtered.length) {
    box.innerHTML = "<p>Nenhum usuário encontrado. A pessoa precisa fazer login no site pelo menos uma vez para aparecer aqui.</p>";
    return;
  }

  box.innerHTML = filtered.map((user) => {
    const uid = user.id || user.uid || "";
    const name = getDisplayName(user);
    const checked = isMarked(uid) ? "checked" : "";
    return `
      <div class="vocalista-user-card">
        <div class="vocalista-user-info">
          <img src="${escapeHtml(user.photoURL || "../assets/img/v7/icon_120.png")}" alt="" class="vocalista-user-avatar" />
          <div>
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(user.email || "")}</small>
          </div>
        </div>
        <label class="vocalista-switch">
          <input type="checkbox" data-vocalista-uid="${escapeHtml(uid)}" ${checked} />
          <span>Vocalista</span>
        </label>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-vocalista-uid]").forEach((input) => {
    input.addEventListener("change", async () => {
      const uid = input.dataset.vocalistaUid || "";
      const user = publicUsers.find((item) => String(item.id || item.uid || "") === uid);
      if (!user) return;
      input.disabled = true;
      try {
        if (input.checked) {
          await setVocalista(uid, {
            name: getDisplayName(user),
            displayName: getDisplayName(user),
            email: user.email || "",
            photoURL: user.photoURL || ""
          });
          await recordAdminActivity({ action: "update", module: "vocalistas", itemId: uid, itemName: getDisplayName(user) });
        } else {
          await removeVocalista(uid);
          await recordAdminActivity({ action: "delete", module: "vocalistas", itemId: uid, itemName: getDisplayName(user) });
        }
        await loadData();
        await renderVocalistas();
      } catch (error) {
        console.error("Erro ao atualizar vocalista:", error);
        alert("Não foi possível atualizar o vocalista. Verifique as regras do Firebase.");
        input.checked = !input.checked;
      } finally {
        input.disabled = false;
      }
    });
  });
}

async function refresh() {
  const box = document.getElementById("admin-vocalistas-list");
  if (box) box.innerHTML = "<p>Carregando usuários...</p>";
  try {
    await loadData();
    await renderVocalistas();
  } catch (error) {
    console.error("Erro ao carregar vocalistas:", error);
    if (box) box.innerHTML = "<p>Não foi possível carregar usuários.</p>";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("admin-vocalistas-search")?.addEventListener("input", renderVocalistas);
  document.getElementById("admin-vocalistas-refresh")?.addEventListener("click", refresh);
  await refresh();
});
