import { getIntegranteAccess } from "./integrante-access.js";
import { openPublicAuthModal } from "../public-auth.js";

const RESTRICTED_FILES = new Set(["cifras.html", "cifra.html", "ferramentas.html"]);
const RESTRICTED_TARGETS = new Set(["cifras.html", "cifra.html", "ferramentas.html"]);
let lastRun = 0;
let lastAllowed = null;

function isAdminPath(){
  return /\/admin(\/|$)/i.test(location.pathname);
}

function currentFile(){
  return (location.pathname.split("/").pop() || "index.html").toLowerCase();
}

function normalizeText(value = ""){
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function targetFileFromHref(href = ""){
  if(!href || href === "#" || href.startsWith("#")) return "";
  try{
    return (new URL(href, location.href).pathname.split("/").pop() || "index.html").toLowerCase();
  }catch{
    return "";
  }
}

function isRestrictedAnchor(anchor){
  if(!anchor || anchor.closest(".admin-shell,.admin-layout,.admin-page,[data-admin-root]")) return false;
  const href = anchor.getAttribute("href") || "";
  const file = targetFileFromHref(href);
  const text = normalizeText(anchor.textContent || anchor.getAttribute("aria-label") || anchor.title || "");

  if(RESTRICTED_TARGETS.has(file)) return true;
  if(text === "cifras" || text.includes("abrir cifras") || text.includes("ver cifra")) return true;
  if(text === "ferramentas" || text.includes("afinador") || text.includes("metronomo")) return true;
  return false;
}

function ensureCss(){
  if(document.getElementById("seven-restricted-public-access-css")) return;
  const link = document.createElement("link");
  link.id = "seven-restricted-public-access-css";
  link.rel = "stylesheet";
  link.href = new URL("../../css/restricted-public-access.css", import.meta.url).href;
  document.head.appendChild(link);
}

function toggleRestrictedLinks(allowed){
  document.querySelectorAll("a[href], button[data-href]").forEach((node) => {
    if(isRestrictedAnchor(node)){
      node.classList.toggle("seven-restricted-hidden", !allowed);
      node.setAttribute("aria-hidden", allowed ? "false" : "true");
      if(!allowed) node.setAttribute("tabindex", "-1");
      else node.removeAttribute("tabindex");
    }
  });

  // Cards/atalhos da home que não são links diretos, mas contêm Cifras/Ferramentas.
  document.querySelectorAll(".home-card,.quick-card,.feature-card,.resource-card,.atalho-card,.home-shortcut,[data-card]").forEach((card) => {
    const text = normalizeText(card.textContent || "");
    const shouldRestrict = text.includes("cifras") || text.includes("ferramentas");
    if(shouldRestrict){
      card.classList.toggle("seven-restricted-hidden", !allowed);
      card.setAttribute("aria-hidden", allowed ? "false" : "true");
    }
  });
}

function restrictedTitleFor(file){
  if(file === "ferramentas.html") return "Ferramentas restritas";
  if(file === "cifra.html") return "Cifra restrita";
  return "Cifras restritas";
}

function restrictedMessageFor(access){
  if(access?.logged){
    return "Sua conta está logada, mas ainda não está liberada como integrante. Solicite a liberação ao administrador.";
  }
  return "Faça login com sua conta Google. O conteúdo será liberado somente para integrantes autorizados.";
}

function renderRestrictedPage(access){
  const main = document.querySelector("main");
  if(!main) return;
  if(main.dataset.sevenRestrictedRendered === "1") return;

  const file = currentFile();
  main.dataset.sevenRestrictedRendered = "1";
  main.className = "restricted-public-page";
  main.innerHTML = `
    <section class="container seven-access-restricted-wrap">
      <div class="seven-access-restricted-card">
        <span class="seven-access-eyebrow">Acesso restrito</span>
        <h1>${restrictedTitleFor(file)}</h1>
        <p>${restrictedMessageFor(access)}</p>
        <div class="seven-access-actions">
          ${access?.logged ? "" : `<button type="button" id="seven-restricted-login-btn" class="button-primary seven-restricted-login-btn">Entrar com Google</button>`}
          <a href="./index.html" class="button-outline">Voltar ao início</a>
        </div>
      </div>
    </section>`;

  document.getElementById("seven-restricted-login-btn")?.addEventListener("click", () => openPublicAuthModal());
}

function isRestrictedCurrentPage(){
  return RESTRICTED_FILES.has(currentFile());
}

async function refreshRestrictedAccess({ force = false } = {}){
  if(isAdminPath()) return;
  ensureCss();

  const runId = ++lastRun;
  document.documentElement.classList.add("seven-restricted-checking");

  // Por padrão, deixa os links restritos ocultos até confirmar permissão.
  toggleRestrictedLinks(false);

  let access;
  try{
    access = await getIntegranteAccess({ openLogin: false });
  }catch(error){
    console.warn("Não foi possível verificar acesso de integrante:", error);
    access = { logged: false, allowed: false, reason: "error" };
  }

  if(runId !== lastRun) return;

  const allowed = access?.allowed === true;
  lastAllowed = allowed;
  document.documentElement.classList.toggle("seven-integrante-allowed", allowed);
  document.documentElement.classList.toggle("seven-integrante-blocked", !allowed);
  document.documentElement.classList.remove("seven-restricted-checking");

  toggleRestrictedLinks(allowed);

  if(isRestrictedCurrentPage()){
    const alreadyRestricted = !!document.querySelector(".seven-access-restricted-card");
    if(!allowed){
      renderRestrictedPage(access);
    }else if(alreadyRestricted){
      // Se a pessoa logou na própria página restrita, recarrega para executar os scripts da página limpa.
      location.reload();
    }
  }
}

function bindRestrictedEvents(){
  if(document.documentElement.dataset.sevenRestrictedAccessBound === "1") return;
  document.documentElement.dataset.sevenRestrictedAccessBound = "1";

  window.addEventListener("seven:public-auth-updated", () => refreshRestrictedAccess({ force: true }));
  document.addEventListener("seven:page-ready", () => refreshRestrictedAccess({ force: true }));
  document.addEventListener("seven:page-swapped", () => refreshRestrictedAccess({ force: true }));
  window.addEventListener("popstate", () => setTimeout(() => refreshRestrictedAccess({ force: true }), 40));
  window.addEventListener("pageshow", () => refreshRestrictedAccess({ force: true }));

  // Se algum script reconstruir o menu depois, revalida sem ficar observando DOM pesado.
  window.addEventListener("seven:menu-updated", () => refreshRestrictedAccess({ force: true }));
}

export function initRestrictedPublicAccess(){
  if(isAdminPath()) return;
  ensureCss();
  bindRestrictedEvents();
  refreshRestrictedAccess({ force: true });
}
