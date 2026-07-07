import { watchAuth, getAdminProfileByEmail } from "./auth.js";
import { canAccessAdminPage } from "./services/admin-permissions-service.js";

function normalize(email = "") {
  return String(email).trim().toLowerCase();
}

function isEditMode(params) {
  return Boolean(params.get("id") || params.get("doc") || params.get("slug"));
}

function resolveAdminPageKey() {
  const path = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const editing = isEditMode(params);

  if (path.endsWith("/admin/") || path.endsWith("/admin/index.html")) return "dashboard";
  if (path.endsWith("/admin/admins.html")) return "admins";
  if (path.endsWith("/admin/links.html") || path.endsWith("/admin/config.html")) return "links";
  if (path.endsWith("/admin/backup.html")) return "backup";
  if (path.endsWith("/admin/logs.html")) return "logs";

  if (path.endsWith("/admin/musicas-publicas.html")) return "musicas-publicas";
  if (path.endsWith("/admin/editor-musica-publica.html")) return editing ? "editor-musica-edit" : "editor-musica-create";

  if (
    path.endsWith("/admin/musicas.html") ||
    path.endsWith("/admin/musicas-vocal.html") ||
    path.endsWith("/admin/musicas-vocais.html") ||
    path.endsWith("/admin/vocal-musicas.html")
  ) return "musicas-vocal";

  if (
    path.endsWith("/admin/editor-musica.html") ||
    path.endsWith("/admin/editor-musica-vocal.html") ||
    path.endsWith("/admin/editor-musicas-vocal.html") ||
    path.endsWith("/admin/editor-musica-vocais.html") ||
    path.endsWith("/admin/editor-musicas-vocais.html")
  ) return editing ? "editor-musica-vocal-edit" : "editor-musica-vocal-create";

  if (path.endsWith("/admin/integrantes.html") || path.endsWith("/admin/vocalistas.html")) return "integrantes";
  if (path.endsWith("/admin/editor-integrante.html")) return editing ? "editor-integrante-edit" : "editor-integrante-create";

  if (path.endsWith("/admin/cifras.html")) return "cifras";
  if (path.endsWith("/admin/editor-cifra.html")) return editing ? "editor-cifra-edit" : "editor-cifra-create";

  if (path.endsWith("/admin/programacoes.html")) return "programacoes";
  if (path.endsWith("/admin/fotos.html")) return "fotos";
  if (path.endsWith("/admin/downloads.html")) return "downloads";
  if (path.endsWith("/admin/downloads-geral.html") || path.endsWith("/admin/downloads-gerais.html")) return "downloads-geral";
  if (path.endsWith("/admin/downloads-por-musica.html")) return "downloads-por-musica";
  if (path.endsWith("/admin/contatos.html")) return "contatos";
  if (path.endsWith("/admin/notificacoes.html")) return "notificacoes";

  if (path.endsWith("/admin/ensaios.html")) return "ensaios";
  if (path.endsWith("/admin/editor-ensaio.html")) return editing ? "editor-ensaio-edit" : "editor-ensaio-create";

  return "dashboard";
}

export function protectAdminPage() {
  watchAuth(async (user) => {
    if (!user) {
      window.location.href = "/login.html";
      return;
    }

    try {
      const admin = await getAdminProfileByEmail(normalize(user.email));
      if (!admin) {
        alert("Seu e-mail não está autorizado para acessar a área administrativa.");
        window.location.href = "/login.html";
        return;
      }

      const pageKey = resolveAdminPageKey();
      if (!canAccessAdminPage(admin, pageKey)) {
        alert("Você não tem permissão para acessar esta página.");
        window.location.href = "/admin/index.html";
      }
    } catch (error) {
      console.error("Erro ao validar acesso administrativo:", error);
      alert("Não foi possível validar o acesso administrativo.");
      window.location.href = "/login.html";
    }
  });
}

protectAdminPage();

