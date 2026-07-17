/* Ministério Seven V4 — Ferramentas somente para Integrantes autorizados */
import { getIntegranteAccess } from "./modules/integrante-access.js";
import { openPublicAuthModal } from "./public-auth.js";

let lastAllowed = null;
let refreshTimer = null;

function currentPageFile(){
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  return file || "index.html";
}

function isFerramentasPage(){
  return currentPageFile() === "ferramentas.html";
}

function isFerramentasHref(value = ""){
  if (!value) return false;
  try {
    const url = new URL(value, location.href);
    return (url.pathname.split("/").pop() || "").toLowerCase() === "ferramentas.html";
  } catch {
    return String(value).toLowerCase().includes("ferramentas.html");
  }
}

function setFerramentasLinksVisible(allowed){
  document.documentElement.classList.toggle("seven-integrante-allowed", !!allowed);
  document.documentElement.classList.toggle("seven-integrante-blocked", !allowed);

  document.querySelectorAll("a[href]").forEach((link) => {
    if (!isFerramentasHref(link.getAttribute("href") || "")) return;

    link.dataset.integranteOnly = "1";
    link.hidden = !allowed;
    link.classList.toggle("hidden", !allowed);

    if (!allowed) {
      link.removeAttribute("aria-current");
      link.classList.remove("active", "is-active", "current", "current-page");
    }
  });
}

function renderFerramentasBlocked(access){
  const main = document.querySelector("main.ferramentas-page, main");
  if (!main || !isFerramentasPage()) return;

  const logged = access?.logged === true;
  const title = logged ? "Ferramentas restritas" : "Entrar para acessar";
  const text = logged
    ? "A página Ferramentas é exclusiva para integrantes autorizados. Solicite a liberação ao administrador para usar o afinador e o metrônomo."
    : "Faça login com sua conta Google. Se sua conta estiver liberada como integrante, o afinador e o metrônomo serão exibidos automaticamente.";

  document.body.dataset.ferramentasBlocked = "1";
  main.innerHTML = `
    <section class="seven-integrante-block" aria-label="Acesso restrito">
      <span class="seven-integrante-block__tag">Área de Integrantes</span>
      <h1>${title}</h1>
      <p>${text}</p>
      <div class="seven-integrante-block__actions">
        ${!logged ? '<button type="button" class="seven-integrante-block__btn" id="seven-integrante-login-btn">Entrar com Google</button>' : ''}
        <a class="seven-integrante-block__link" href="./index.html">Voltar ao início</a>
      </div>
    </section>
  `;

  document.getElementById("seven-integrante-login-btn")?.addEventListener("click", () => {
    openPublicAuthModal();
  });
}

async function refreshFerramentasAccess(){
  let access = { logged:false, allowed:false, reason:"unknown" };

  try {
    access = await getIntegranteAccess({ openLogin:false });
  } catch (error) {
    console.warn("Não foi possível validar acesso às Ferramentas:", error);
  }

  const allowed = access?.allowed === true;
  setFerramentasLinksVisible(allowed);

  if (isFerramentasPage()) {
    if (allowed) {
      // Se a página estava bloqueada e o usuário acabou de logar/receber permissão,
      // recarrega para restaurar o HTML original e os listeners do afinador/metrônomo.
      if (document.body.dataset.ferramentasBlocked === "1") {
        location.reload();
        return;
      }
      document.body.dataset.ferramentasAllowed = "1";
    } else {
      renderFerramentasBlocked(access);
    }
  }

  lastAllowed = allowed;
}

function scheduleRefresh(){
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshFerramentasAccess, 40);
}

document.documentElement.classList.remove("seven-integrante-allowed");
document.documentElement.classList.add("seven-integrante-blocked");

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleRefresh, { once:true });
} else {
  scheduleRefresh();
}

window.addEventListener("seven:public-auth-updated", scheduleRefresh);
window.addEventListener("seven:page-ready", scheduleRefresh);
window.addEventListener("seven:menu-updated", scheduleRefresh);
window.addEventListener("popstate", scheduleRefresh);
