import { watchAuth, getAdminProfileByEmail } from "../auth.js";
import { canAccessAdminPage, isPrimaryAdmin } from "../services/admin-permissions-service.js";

function normalize(email = "") {
  return String(email || "").trim().toLowerCase();
}

const MODULE_CARD_PAGE_MAP = {
  musicas: "musicas",
  musicasPublicas: "musicas",
  "musicas-publicas": "musicas",

  musicasVocal: "musicas-vocal",
  musicasVocais: "musicas-vocal",
  "musicas-vocal": "musicas-vocal",
  "musicas-vocais": "musicas-vocal",
  vocal: "musicas-vocal",

  vocalistas: "vocalistas",
  cifras: "cifras",
  programacoes: "programacoes",
  fotos: "fotos",
  downloads: "downloads",
  downloadsGerais: "downloads-geral",
  downloadsPorMusica: "downloads-por-musica",
  contatos: "contatos",
  notificacoes: "notificacoes",
  ensaios: "ensaios"
};

const PRIMARY_ONLY_CARDS = new Set(["links", "backup", "admins", "logs"]);

function resolveCardVisibility(admin, key = "") {
  const moduleKey = String(key || "").trim();
  if (!moduleKey) return false;
  if (PRIMARY_ONLY_CARDS.has(moduleKey)) return isPrimaryAdmin(admin);

  const pageKey = MODULE_CARD_PAGE_MAP[moduleKey] || moduleKey;
  return canAccessAdminPage(admin, pageKey);
}

function ensureEmptyState() {
  const grid = document.querySelector(".admin-cards-grid");
  if (!grid || document.getElementById("admin-empty-permissions")) return;

  const message = document.createElement("p");
  message.id = "admin-empty-permissions";
  message.className = "admin-empty-permissions hidden";
  message.textContent = "Nenhum módulo foi liberado para este administrador.";
  grid.insertAdjacentElement("afterend", message);
}

function updateEmptyState() {
  const cards = [...document.querySelectorAll("[data-admin-module]")];
  const hasVisibleCard = cards.some((card) => !card.classList.contains("hidden"));
  document.getElementById("admin-empty-permissions")?.classList.toggle("hidden", hasVisibleCard);
}

function revealDashboard() {
  document.body.classList.remove("admin-dashboard-permissions-pending");
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("admin-dashboard-permissions-pending");
  ensureEmptyState();

  watchAuth(async (user) => {
    if (!user?.email) return;

    try {
      const admin = await getAdminProfileByEmail(normalize(user.email));
      if (!admin) return;

      document.querySelectorAll("[data-admin-module]").forEach((card) => {
        const visible = resolveCardVisibility(admin, card.dataset.adminModule);
        card.classList.toggle("hidden", !visible);
      });

      updateEmptyState();
      revealDashboard();
    } catch (error) {
      console.error("Erro ao preparar painel administrativo:", error);
      revealDashboard();
    }
  });
});
