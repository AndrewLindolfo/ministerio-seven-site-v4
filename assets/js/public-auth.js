import { auth, provider } from "./firebase.js";
import { getAdminProfileByEmail } from "./auth.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getPublicUserProfile, savePublicUserProfile } from "./services/public-user-service.js";
import { isIntegrante } from "./services/integrantes-service.js";

let currentUser = null;
let currentMenu = null;
let authReady = false;
let authWatchStarted = false;
let authReadyResolver = null;
let authReadyPromise = new Promise((resolve) => { authReadyResolver = resolve; });
let lastVocalNavState = null;
let lastHeaderStateKey = "";

const PUBLIC_HEADER_CACHE_KEY = "seven_public_header_profile_v4";
const PUBLIC_HEADER_LEGACY_CACHE_KEYS = ["seven_public_header_profile", "seven_public_header_profile_v2", "seven_public_header_profile_v3"];
const VOCAL_NAV_CACHE_KEY = "seven_integrante_nav_permission_v1";
const VOCAL_NAV_LEGACY_CACHE_KEYS = ["seven_vocal_nav_permission", "seven_vocal_nav_permission_v2", "seven_vocal_nav_permission_v3"];
const HEADER_CACHE_TTL = 1000 * 60 * 60 * 24;
const PERMISSION_CACHE_TTL = 1000 * 60 * 2;
const MASTER_EMAILS = new Set(["lindolfoandrew0@gmail.com"]);

function normalize(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isMasterEmail(email = "") {
  return MASTER_EMAILS.has(normalize(email));
}

function $(selector) {
  return document.querySelector(selector);
}

function readCachedJson(keys = []) {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const expiresAt = Number(data.expiresAt || 0);
      if (expiresAt && expiresAt < Date.now()) {
        localStorage.removeItem(key);
        continue;
      }
      return data;
    } catch {
      try { localStorage.removeItem(key); } catch {}
    }
  }
  return null;
}

function clearCache(keys = []) {
  try { keys.forEach((key) => localStorage.removeItem(key)); } catch {}
}

function getCachedHeaderProfile() {
  return readCachedJson([PUBLIC_HEADER_CACHE_KEY, ...PUBLIC_HEADER_LEGACY_CACHE_KEYS]);
}

function cacheHeaderProfile(profile = null) {
  try {
    if (!profile?.uid) {
      localStorage.removeItem(PUBLIC_HEADER_CACHE_KEY);
      return;
    }
    localStorage.setItem(PUBLIC_HEADER_CACHE_KEY, JSON.stringify({
      uid: String(profile.uid || "").trim(),
      email: normalize(profile.email || ""),
      photoURL: profile.photoURL || "assets/img/v7/icon_120.png",
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      displayName: profile.displayName || profile.email || "Minha conta",
      phone: profile.phone || "",
      isAdmin: !!profile.isAdmin,
      isIntegrante: !!profile.isIntegrante,
      isVocalista: !!profile.isIntegrante,
      updatedAt: Date.now(),
      expiresAt: Date.now() + HEADER_CACHE_TTL
    }));
  } catch (error) {
    console.warn("Não foi possível salvar cache do cabeçalho público:", error);
  }
}

function clearHeaderProfileCache() {
  clearCache([PUBLIC_HEADER_CACHE_KEY, ...PUBLIC_HEADER_LEGACY_CACHE_KEYS]);
}

function getCachedVocalPermissionForUser(user = null) {
  const cached = readCachedJson([VOCAL_NAV_CACHE_KEY, ...VOCAL_NAV_LEGACY_CACHE_KEYS]);
  if (!cached || !user) return null;
  const sameUid = String(cached.uid || "").trim() === String(user.uid || "").trim();
  const sameEmail = normalize(cached.email || "") === normalize(user.email || "");
  return sameUid || sameEmail ? cached : null;
}

function cacheVocalPermission(profile = null) {
  try {
    if (!profile?.uid) {
      localStorage.removeItem(VOCAL_NAV_CACHE_KEY);
      return;
    }
    localStorage.setItem(VOCAL_NAV_CACHE_KEY, JSON.stringify({
      uid: String(profile.uid || "").trim(),
      email: normalize(profile.email || ""),
      canSeeVocal: !!(profile.isAdmin || profile.isIntegrante || profile.isVocalista),
      isAdmin: !!profile.isAdmin,
      isIntegrante: !!(profile.isIntegrante || profile.isVocalista),
      isVocalista: !!(profile.isIntegrante || profile.isVocalista),
      updatedAt: Date.now(),
      expiresAt: Date.now() + PERMISSION_CACHE_TTL
    }));
  } catch (error) {
    console.warn("Não foi possível salvar cache de permissão de integrante:", error);
  }
}

function clearVocalPermissionCache() {
  clearCache([VOCAL_NAV_CACHE_KEY, ...VOCAL_NAV_LEGACY_CACHE_KEYS]);
}

function emitPublicAuthUpdated(profile = null) {
  try {
    window.dispatchEvent(new CustomEvent("seven:public-auth-updated", { detail: { profile } }));
  } catch {}
}

function ensureAuthModal() {
  if ($("#public-auth-modal")) return;

  const modal = document.createElement("div");
  modal.id = "public-auth-modal";
  modal.className = "public-auth-modal hidden";
  modal.innerHTML = `
    <div class="public-auth-modal__overlay" data-close-public-auth="1"></div>
    <div class="public-auth-modal__panel">
      <button type="button" class="public-auth-modal__close" data-close-public-auth="1" aria-label="Fechar">✕</button>
      <div class="public-auth-modal__eyebrow">Ministério Seven</div>
      <h2>Entrar</h2>
      <p class="public-auth-modal__text">Faça login para acessar favoritos, playlists e áreas liberadas para integrantes.</p>
      <button type="button" id="public-google-login-button" class="public-auth-modal__google-btn">
        <span class="public-auth-modal__google-icon" aria-hidden="true"><img src="./assets/img/ui/logo-g-login.png" alt="" class="public-auth-modal__google-image" /></span>
        <span>Continuar com Google</span>
      </button>
      <p class="public-auth-modal__footnote">O login público não redireciona para o painel administrativo. Contas ADM recebem um atalho para o Admin no menu da conta.</p>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll("[data-close-public-auth='1']").forEach((node) => {
    node.addEventListener("click", closePublicAuthModal);
  });

  $("#public-google-login-button")?.addEventListener("click", async () => {
    try {
      await loginPublicUser();
      closePublicAuthModal();
    } catch (error) {
      console.error("Erro ao fazer login público:", error);
      alert(`Não foi possível entrar com Google: ${error.code || error.message || "erro desconhecido"}`);
    }
  });
}

export function openPublicAuthModal() {
  ensureAuthModal();
  $("#public-auth-modal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

export function closePublicAuthModal() {
  $("#public-auth-modal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function ensureHeaderSlot() {
  const actions = $(".header-actions");
  if (!actions) return null;

  let slot = $("#public-user-slot");
  if (slot) return slot;

  slot = document.createElement("div");
  slot.id = "public-user-slot";
  slot.className = "public-user-slot";

  const mobileToggle = $("#mobile-menu-toggle");
  if (mobileToggle?.parentElement === actions) actions.insertBefore(slot, mobileToggle);
  else actions.appendChild(slot);

  return slot;
}

function closeUserMenu() {
  currentMenu?.classList.add("hidden");
}

function removeVocalNavLinks() {
  document.querySelectorAll('[data-vocal-link="1"]').forEach((node) => node.remove());
}

function syncVocalNavLink(canSeeVocal = false) {
  const desired = !!canSeeVocal;
  const hasAnyLink = !!document.querySelector('[data-vocal-link="1"]');
  if (lastVocalNavState === desired && ((desired && hasAnyLink) || (!desired && !hasAnyLink))) return;
  lastVocalNavState = desired;

  if (!desired) {
    removeVocalNavLinks();
    return;
  }

  document.querySelectorAll(".main-nav, .mobile-menu-panel").forEach((nav) => {
    if (!nav) return;

    let link = nav.querySelector('[data-vocal-link="1"]');
    if (!link) {
      link = document.createElement("a");
      link.href = "./musicas-vocal.html";
      link.textContent = "Músicas Vocal";
      link.setAttribute("data-vocal-link", "1");
      if (nav.classList.contains("mobile-menu-panel")) link.className = "mobile-nav-link";
    }

    const musicasLink = Array.from(nav.querySelectorAll("a")).find((item) => normalize(item.textContent) === "músicas");
    if (musicasLink && musicasLink.nextElementSibling !== link) musicasLink.insertAdjacentElement("afterend", link);
    else if (!musicasLink && link.parentElement !== nav) nav.appendChild(link);
  });

  try { window.dispatchEvent(new CustomEvent("seven:menu-updated")); } catch {}
}

async function safeIsAdminByEmail(email = "") {
  const normalized = normalize(email);
  if (!normalized) return false;
  if (isMasterEmail(normalized)) return true;
  try {
    return !!(await getAdminProfileByEmail(normalized));
  } catch (error) {
    if (!String(error?.code || "").includes("permission-denied")) {
      console.warn("Não foi possível confirmar ADM no cabeçalho público:", error);
    }
    return false;
  }
}

async function safeIsIntegrante(uid = "", email = "") {
  try {
    return !!(await isIntegrante(uid, email));
  } catch (error) {
    console.warn("Não foi possível confirmar integrante no cabeçalho público:", error);
    return false;
  }
}

async function buildProfileData(user) {
  const uid = String(user?.uid || "").trim();
  const email = normalize(user?.email || "");
  const savedProfile = await getPublicUserProfile(uid).catch(() => null);
  const firstName = savedProfile?.firstName || user?.displayName?.split(" ")?.[0] || "";
  const lastName = savedProfile?.lastName || user?.displayName?.split(" ").slice(1).join(" ") || "";
  const [isAdmin, integrante] = await Promise.all([
    safeIsAdminByEmail(email),
    safeIsIntegrante(uid, email)
  ]);

  return {
    uid,
    email,
    photoURL: savedProfile?.photoURL || user?.photoURL || "assets/img/v7/icon_120.png",
    firstName,
    lastName,
    displayName: savedProfile?.displayName || user?.displayName || [firstName, lastName].filter(Boolean).join(" ") || email,
    phone: savedProfile?.phone || "",
    isAdmin,
    isIntegrante: !!integrante,
    isVocalista: !!integrante,
    firebaseUser: user
  };
}

function buildHeaderStateKey(profile = null) {
  if (!profile?.uid) return "logged-out";
  return [
    "logged-in",
    String(profile.uid || "").trim(),
    normalize(profile.email || ""),
    String(profile.photoURL || ""),
    profile.isAdmin ? "admin" : "user",
    (profile.isIntegrante || profile.isVocalista) ? "integrante" : "nao-integrante"
  ].join("|");
}

function renderLoggedOut(slot) {
  lastHeaderStateKey = "logged-out";
  syncVocalNavLink(false);
  slot.innerHTML = `
    <button type="button" id="public-login-button" class="public-login-button public-login-button--image-only" aria-label="Entrar com Google">
      <img src="./assets/img/ui/login-user-preto.png" alt="Entrar" class="public-login-button__image public-login-button__image--light" />
      <img src="./assets/img/ui/login-user-branco.png" alt="Entrar" class="public-login-button__image public-login-button__image--dark" />
    </button>`;
  $("#public-login-button")?.addEventListener("click", openPublicAuthModal);
}

function renderLoggedIn(slot, profile) {
  const stateKey = buildHeaderStateKey(profile);
  if (lastHeaderStateKey === stateKey && slot.querySelector(".public-user-menu")) return;
  lastHeaderStateKey = stateKey;

  slot.innerHTML = `
    <div class="public-user-menu">
      <button type="button" id="public-user-toggle" class="public-user-toggle" aria-label="Minha conta">
        <img src="${profile.photoURL}" alt="Conta" class="public-user-avatar" />
      </button>
      <div id="public-user-dropdown" class="public-user-dropdown hidden">
        <a href="./conta.html">Minha conta</a>
        <a href="./favoritos.html">Favoritos</a>
        <a href="./playlists.html">Playlists</a>
        ${profile.isAdmin ? '<a href="./admin/index.html" class="public-user-admin-link">Admin</a>' : ''}
        <button type="button" id="public-logout-button">Sair</button>
      </div>
    </div>
  `;

  const dropdown = $("#public-user-dropdown");
  currentMenu = dropdown;

  $("#public-user-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropdown?.classList.toggle("hidden");
  });

  $("#public-logout-button")?.addEventListener("click", async () => {
    await logoutPublicUser();
    closeUserMenu();
    if (location.pathname.includes("/conta.html")) location.href = "./index.html";
  });
}

function restoreCachedHeaderAuthUi() {
  const slot = ensureHeaderSlot();
  if (!slot) return;
  const cached = getCachedHeaderProfile();
  if (cached?.uid) {
    currentUser = { ...cached, firebaseUser: null };
    renderLoggedIn(slot, cached);
    syncVocalNavLink(!!(cached.isAdmin || cached.isIntegrante || cached.isVocalista));
    return;
  }
  renderLoggedOut(slot);
}

async function renderHeaderAuth(user) {
  const slot = ensureHeaderSlot();
  if (!slot) return;

  if (!user?.uid) {
    currentUser = null;
    clearHeaderProfileCache();
    clearVocalPermissionCache();
    renderLoggedOut(slot);
    emitPublicAuthUpdated(null);
    return;
  }

  const cached = readCachedJson([PUBLIC_HEADER_CACHE_KEY]);
  if (cached?.uid === user.uid) {
    currentUser = { ...cached, firebaseUser: user };
    renderLoggedIn(slot, currentUser);
    const cachedPerm = getCachedVocalPermissionForUser(user);
    syncVocalNavLink(!!(cachedPerm?.canSeeVocal || cached.isAdmin || cached.isIntegrante || cached.isVocalista));
  }

  const profile = await buildProfileData(user);
  currentUser = profile;
  cacheHeaderProfile(profile);
  cacheVocalPermission(profile);
  syncVocalNavLink(profile.isAdmin || profile.isIntegrante || profile.isVocalista);

  savePublicUserProfile(profile.uid, {
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.displayName,
    email: profile.email,
    phone: profile.phone,
    photoURL: profile.photoURL
  }).catch((error) => console.warn("Não foi possível salvar perfil público:", error));

  renderLoggedIn(slot, profile);
  emitPublicAuthUpdated(profile);
}

function resolveAuthReady(profile) {
  authReady = true;
  if (authReadyResolver) {
    authReadyResolver(profile);
    authReadyResolver = null;
  }
}

export async function loginPublicUser() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logoutPublicUser() {
  clearHeaderProfileCache();
  clearVocalPermissionCache();
  syncVocalNavLink(false);
  await signOut(auth);
}

export function getCurrentPublicUser() {
  return currentUser;
}

export function watchPublicAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    await renderHeaderAuth(user);
    resolveAuthReady(currentUser);
    if (typeof callback === "function") callback(user, currentUser);
  });
}

export function whenPublicAuthReady() {
  if (authReady) return Promise.resolve(currentUser);
  return authReadyPromise;
}

export function requirePublicLogin(onReady) {
  if (currentUser?.uid) {
    if (typeof onReady === "function") onReady(currentUser);
    return true;
  }
  openPublicAuthModal();
  return false;
}

export function initPublicAuth() {
  ensureAuthModal();
  restoreCachedHeaderAuthUi();

  if (!authWatchStarted) {
    authWatchStarted = true;
    watchPublicAuth();
  } else if (authReady) {
    renderHeaderAuth(auth.currentUser);
  }

  if (!document.documentElement.dataset.publicAuthEventsBound) {
    document.documentElement.dataset.publicAuthEventsBound = "1";

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".public-user-menu")) closeUserMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeUserMenu();
        closePublicAuthModal();
      }
    });

    document.addEventListener("seven:page-ready", () => {
      ensureHeaderSlot();
      if (currentUser?.uid) renderLoggedIn(ensureHeaderSlot(), currentUser);
    });
  }
}
