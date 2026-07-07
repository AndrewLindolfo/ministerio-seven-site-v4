import { getCollection } from "../db.js";
import { setIntegrante, removeIntegrante, listIntegrantes } from "../services/integrantes-service.js";
import { recordAdminActivity } from "../services/admin-activity-service.js";

let publicUsers = [];
let integrantes = [];

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
    listIntegrantes()
  ]);
  publicUsers = users.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), "pt-BR"));
  integrantes = marked;
}

function isMarked(uid = "") {
  return integrantes.some((item) => String(item.uid || item.id || "") === String(uid || ""));
}

async function renderIntegrantes() {
  const box = document.getElementById("admin-integrantes-list");
  const search = document.getElementById("admin-integrantes-search");
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
      <div class="vocalista-user-card integrante-user-card">
        <div class="vocalista-user-info integrante-user-info">
          <img src="${escapeHtml(user.photoURL || "../assets/img/v7/icon_120.png")}" alt="" class="vocalista-user-avatar integrante-user-avatar" />
          <div>
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(user.email || "")}</small>
          </div>
        </div>
        <label class="vocalista-switch integrante-switch">
          <input type="checkbox" data-integrante-uid="${escapeHtml(uid)}" ${checked} />
          <span>Integrante</span>
        </label>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-integrante-uid]").forEach((input) => {
    input.addEventListener("change", async () => {
      const uid = input.dataset.integranteUid || "";
      const user = publicUsers.find((item) => String(item.id || item.uid || "") === uid);
      if (!user) return;
      input.disabled = true;
      try {
        if (input.checked) {
          await setIntegrante(uid, {
            name: getDisplayName(user),
            displayName: getDisplayName(user),
            email: user.email || "",
            photoURL: user.photoURL || "",
            tipo: "integrante"
          });
          await recordAdminActivity({ action: "update", module: "integrantes", itemId: uid, itemName: getDisplayName(user) });
        } else {
          await removeIntegrante(uid);
          await recordAdminActivity({ action: "delete", module: "integrantes", itemId: uid, itemName: getDisplayName(user) });
        }
        await loadData();
        await renderIntegrantes();
      } catch (error) {
        console.error("Erro ao atualizar integrante:", error);
        alert("Não foi possível atualizar o integrante. Verifique as regras do Firebase.");
        input.checked = !input.checked;
      } finally {
        input.disabled = false;
      }
    });
  });
}

async function refresh() {
  const box = document.getElementById("admin-integrantes-list");
  if (box) box.innerHTML = "<p>Carregando usuários...</p>";
  try {
    await loadData();
    await renderIntegrantes();
  } catch (error) {
    console.error("Erro ao carregar integrantes:", error);
    if (box) box.innerHTML = "<p>Não foi possível carregar usuários.</p>";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("admin-integrantes-search")?.addEventListener("input", renderIntegrantes);
  document.getElementById("admin-integrantes-refresh")?.addEventListener("click", refresh);
  await refresh();
});
