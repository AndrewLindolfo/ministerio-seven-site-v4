// Ministério Seven V4 — restrição pública para área de Integrantes
// Bloqueia Cifras e Ferramentas para visitantes/usuários sem liberação.
import { whenPublicAuthReady, openPublicAuthModal } from "../public-auth.js";
import { getAdminProfileByEmail } from "../auth.js";
import { isIntegrante } from "../services/integrantes-service.js";

const RESTRICTED_FILES = new Set(["cifras.html", "cifra.html", "ferramentas.html"]);
let started = false;
let lastAllowed = null;
let running = false;

function normalize(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isAdminPath() {
  return /\/admin(\/|$)/i.test(location.pathname);
}

function currentFile() {
  let file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (!file || file === "/") file = "index.html";
  return file;
}

function fileFromHref(href = "") {
  try {
    const url = new URL(href, location.href);
    let file = (url.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!file || file === "/") file = "index.html";
    return file;
  } catch {
    return "";
  }
}

function isRestrictedHref(href = "") {
  const file = fileFromHref(href);
  return RESTRICTED_FILES.has(file);
}

function setRestrictedLinksVisibility(allowed) {
  document.documentElement.classList.toggle("seven-integrante-allowed", !!allowed);
  document.documentElement.classList.add("seven-integrante-restrictions-ready");

  document.querySelectorAll("a[href]").forEach((link) => {
    const restricted = isRestrictedHref(link.getAttribute("href") || "");
    if (!restricted) return;
    link.classList.toggle("seven-integrante-only-link", true);
    if (allowed) {
      link.hidden = false;
      link.removeAttribute("aria-hidden");
      link.removeAttribute("tabindex");
    } else {
      link.hidden = true;
      link.setAttribute("aria-hidden", "true");
      link.setAttribute("tabindex", "-1");
    }
  });

  try {
    window.dispatchEvent(new CustomEvent("seven:integrante-permission-updated", { detail: { allowed: !!allowed } }));
  } catch {}
}

async function resolveAccess() {
  const profile = await whenPublicAuthReady().catch(() => null);
  const firebaseUser = profile?.firebaseUser || null;
  const uid = String(profile?.uid || firebaseUser?.uid || "").trim();
  const email = normalize(profile?.email || firebaseUser?.email || "");

  if (!uid && !email) {
    return { logged: false, allowed: false, profile: null, reason: "not-logged" };
  }

  if (profile?.isAdmin || profile?.isIntegrante || profile?.isVocalista) {
    return {
      logged: true,
      allowed: true,
      profile,
      reason: profile?.isAdmin ? "admin" : "integrante"
    };
  }

  try {
    const [admin, integrante] = await Promise.all([
      email ? getAdminProfileByEmail(email).catch(() => null) : Promise.resolve(null),
      (uid || email) ? isIntegrante(uid, email).catch(() => false) : Promise.resolve(false)
    ]);

    const allowed = !!admin || !!integrante;
    return {
      logged: true,
      allowed,
      profile: { ...(profile || {}), isAdmin: !!admin, isIntegrante: !!integrante, isVocalista: !!integrante },
      reason: allowed ? (admin ? "admin" : "integrante") : "not-integrante"
    };
  } catch (error) {
    console.error("Erro ao validar acesso de integrante:", error);
    return { logged: true, allowed: false, profile, reason: "error", error };
  }
}

function restrictedMessage(access) {
  const logged = access?.logged === true;
  const title = "Área exclusiva para integrantes";
  const text = logged
    ? "Sua conta está logada, mas ainda não está liberada como integrante. Solicite a liberação ao administrador."
    : "Faça login com Google para verificar sua liberação como integrante.";
  const button = logged
    ? "<a class=\"restricted-integrante-btn\" href=\"./index.html\">Voltar ao início</a>"
    : "<button type=\"button\" id=\"restricted-integrante-login\" class=\"restricted-integrante-btn\">Entrar com Google</button>";

  return `
    <section class="restricted-integrante-screen">
      <div class="restricted-integrante-card">
        <span class="restricted-integrante-kicker">ACESSO RESTRITO</span>
        <h1>${title}</h1>
        <p>${text}</p>
        <div class="restricted-integrante-actions">${button}</div>
      </div>
    </section>
  `;
}

function blockRestrictedPage(access) {
  const file = currentFile();
  if (!RESTRICTED_FILES.has(file)) return;

  const main = document.querySelector("main");
  if (!main) return;

  if (access.allowed) {
    if (main.dataset.integranteBlocked === "1") {
      location.reload();
    }
    return;
  }

  main.dataset.integranteBlocked = "1";
  main.innerHTML = restrictedMessage(access);
  document.getElementById("restricted-integrante-login")?.addEventListener("click", () => openPublicAuthModal());
}

async function applyRestrictions() {
  if (isAdminPath() || running) return;
  running = true;
  try {
    const access = await resolveAccess();
    lastAllowed = !!access.allowed;
    setRestrictedLinksVisibility(lastAllowed);
    blockRestrictedPage(access);
  } finally {
    running = false;
  }
}

export function initIntegranteRestrictions() {
  if (started || isAdminPath()) return;
  started = true;

  // Esconde imediatamente até confirmar a permissão.
  document.documentElement.classList.add("seven-integrante-restrictions-ready");
  setRestrictedLinksVisibility(false);

  applyRestrictions();
  document.addEventListener("seven:page-ready", () => applyRestrictions());
  document.addEventListener("seven:page-swapped", () => applyRestrictions());
  window.addEventListener("seven:public-auth-updated", () => applyRestrictions());
  window.addEventListener("storage", (event) => {
    if (String(event.key || "").includes("seven_")) applyRestrictions();
  });
}
