import { auth, provider } from "./firebase.js";
import { getAdminProfileByEmail } from "./auth.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getPublicUserProfile, savePublicUserProfile } from "./services/public-user-service.js";
import { isVocalista } from "./services/vocalistas-service.js";

let currentUser = null;
let currentMenu = null;
let authReadyResolver = null;
const authReadyPromise = new Promise((resolve) => {
  authReadyResolver = resolve;
});

const VOCAL_NAV_CACHE_KEY = "seven_vocal_nav_permission_v3";
const VOCAL_NAV_LEGACY_CACHE_KEYS = ["seven_vocal_nav_permission", "seven_vocal_nav_permission_v2"];
const VOCAL_NAV_CACHE_TTL = 1000 * 60 * 60 * 24 * 7;
const PUBLIC_HEADER_CACHE_KEY = "seven_public_header_profile_v3";
const PUBLIC_HEADER_LEGACY_CACHE_KEYS = ["seven_public_header_profile", "seven_public_header_profile_v2"];
const PUBLIC_HEADER_CACHE_TTL = 1000 * 60 * 60 * 24 * 7;
const MASTER_EMAILS = new Set(["lindolfoandrew0@gmail.com"]);
let lastVocalNavState = null;
let lastHeaderStateKey = "";

function readCachedJson(keys = []) {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const expiresAt = Number(data.expiresAt || 0);
      if (!expiresAt || expiresAt < Date.now()) {
        localStorage.removeItem(key);
        continue;
      }
      return { ...data, __cacheKey: key };
    } catch {
      try { localStorage.removeItem(key); } catch {}
    }
  }
  return null;
}

function getCachedVocalNavPermission() {
  try {
    const data = readCachedJson([VOCAL_NAV_CACHE_KEY, ...VOCAL_NAV_LEGACY_CACHE_KEYS]);
    if (!data) return null;
    if (data.__cacheKey !== VOCAL_NAV_CACHE_KEY) {
      localStorage.setItem(VOCAL_NAV_CACHE_KEY, JSON.stringify({ ...data, __cacheKey: undefined }));
    }
    delete data.__cacheKey;
    return data;
  } catch (error) {
    console.warn("Não foi possível ler o cache de permissão vocal:", error);
    return null;
  }
}

function cacheVocalNavPermission(profile = null) {
  try {
    if (!profile?.uid) {
      localStorage.removeItem(VOCAL_NAV_CACHE_KEY);
      return;
    }
    localStorage.setItem(VOCAL_NAV_CACHE_KEY, JSON.stringify({
      uid: String(profile.uid || "").trim(),
      email: normalize(profile.email || ""),
      canSeeVocal: !!(profile.isAdmin || profile.isVocalista),
      isAdmin: !!profile.isAdmin,
      isVocalista: !!profile.isVocalista,
      updatedAt: Date.now(),
      expiresAt: Date.now() + VOCAL_NAV_CACHE_TTL
    }));
  } catch (error) {
    console.warn("Não foi possível salvar o cache de permissão vocal:", error);
  }
}

function clearVocalNavPermissionCache() {
  try {
    localStorage.removeItem(VOCAL_NAV_CACHE_KEY);
    VOCAL_NAV_LEGACY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Não foi possível limpar o cache de permissão vocal:", error);
  }
}

function getCachedPublicHeaderProfile() {
  try {
    const data = readCachedJson([PUBLIC_HEADER_CACHE_KEY, ...PUBLIC_HEADER_LEGACY_CACHE_KEYS]);
    if (!data) return null;
    if (data.__cacheKey !== PUBLIC_HEADER_CACHE_KEY) {
      localStorage.setItem(PUBLIC_HEADER_CACHE_KEY, JSON.stringify({ ...data, __cacheKey: undefined }));
    }
    delete data.__cacheKey;
    return data;
  } catch (error) {
    console.warn("Não foi possível ler o cache do usuário do cabeçalho:", error);
    return null;
  }
}

function cachePublicHeaderProfile(profile = null) {
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
      isVocalista: !!profile.isVocalista,
      updatedAt: Date.now(),
      expiresAt: Date.now() + PUBLIC_HEADER_CACHE_TTL
    }));
  } catch (error) {
    console.warn("Não foi possível salvar o cache do usuário do cabeçalho:", error);
  }
}

function clearPublicHeaderProfileCache() {
  try {
    localStorage.removeItem(PUBLIC_HEADER_CACHE_KEY);
    PUBLIC_HEADER_LEGACY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Não foi possível limpar o cache do usuário do cabeçalho:", error);
  }
}

function getCachedPublicHeaderForUser(user = null) {
  const cached = getCachedPublicHeaderProfile();
  if (!cached || !user) return null;
  const sameUid = String(cached.uid || "").trim() === String(user.uid || "").trim();
  const sameEmail = normalize(cached.email || "") === normalize(user.email || "");
  return sameUid || sameEmail ? cached : null;
}

function getCachedVocalPermissionForUser(user = null) {
  const cached = getCachedVocalNavPermission();
  if (!cached || !user) return null;
  const sameUid = String(cached.uid || "").trim() === String(user.uid || "").trim();
  const sameEmail = normalize(cached.email || "") === normalize(user.email || "");
  if (sameUid || sameEmail) return cached;
  clearVocalNavPermissionCache();
  return null;
}

function normalize(email = "") {
  return String(email || "").trim().toLowerCase();
}

function isMasterEmail(email = "") {
  return MASTER_EMAILS.has(normalize(email));
}

function $(selector) {
  return document.querySelector(selector);
}

function emitPublicAuthUpdated(profile = null) {
  try {
    window.dispatchEvent(new CustomEvent("seven:public-auth-updated", {
      detail: { profile }
    }));
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
      <p class="public-auth-modal__text">Faça login para acessar favoritos, playlists e recursos pessoais do site.</p>
      <button type="button" id="public-google-login-button" class="public-auth-modal__google-btn">
        <span class="public-auth-modal__google-icon" aria-hidden="true"><img src="./assets/img/ui/logo-g-login.png" alt="" class="public-auth-modal__google-image" /></span>
        <span>Continuar com Google</span>
      </button>
      <p class="public-auth-modal__footnote">O login não é obrigatório para navegar no site. Ele é usado apenas para recursos pessoais.</p>
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
  const mobileToggle = $("#mobile-menu-toggle");
  if (!actions || !mobileToggle) return null;

  let slot = $("#public-user-slot");
  if (slot) return slot;

  slot = document.createElement("div");
  slot.id = "public-user-slot";
  slot.className = "public-user-slot";
  actions.insertBefore(slot, mobileToggle);
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
  if (lastVocalNavState === desired) {
    const hasAnyLink = !!document.querySelector('[data-vocal-link="1"]');
    if ((desired && hasAnyLink) || (!desired && !hasAnyLink)) return;
  }

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
      if (nav.classList.contains("mobile-menu-panel")) {
        link.className = "mobile-nav-link";
      }
    }

    const musicasLink = Array.from(nav.querySelectorAll("a")).find((item) => String(item.textContent || "").trim().toLowerCase() === "músicas");
    if (musicasLink && musicasLink.nextElementSibling !== link) {
      musicasLink.insertAdjacentElement("afterend", link);
    } else if (!musicasLink && link.parentElement !== nav) {
      nav.appendChild(link);
    }
  });
}

function restoreCachedVocalNavLink() {
  const cachedHeader = getCachedPublicHeaderProfile();
  const cachedPermission = getCachedVocalNavPermission();
  if (!cachedHeader?.uid || !cachedPermission?.canSeeVocal) return;

  const sameUid = String(cachedHeader.uid || "").trim() === String(cachedPermission.uid || "").trim();
  const sameEmail = normalize(cachedHeader.email || "") === normalize(cachedPermission.email || "");
  if (sameUid || sameEmail) {
    syncVocalNavLink(true);
  }
}


async function safeIsAdminByEmail(email = "") {
  const normalizedEmail = normalize(email);
  if (!normalizedEmail) return false;
  if (isMasterEmail(normalizedEmail)) return true;

  try {
    return !!(await getAdminProfileByEmail(normalizedEmail));
  } catch (error) {
    if (String(error?.code || "").includes("permission-denied")) {
      return false;
    }
    console.warn("Não foi possível confirmar permissão de administrador no cabeçalho público:", error);
    return false;
  }
}

async function buildProfileData(user) {
  const email = normalize(user?.email || "");
  const profile = await getPublicUserProfile(user?.uid || "");
  const firstName = profile?.firstName || user?.displayName?.split(" ")?.[0] || "";
  const lastName = profile?.lastName || user?.displayName?.split(" ").slice(1).join(" ") || "";

  return {
    uid: user?.uid || "",
    email,
    photoURL: profile?.photoURL || user?.photoURL || "assets/img/v7/icon_120.png",
    firstName,
    lastName,
    displayName: profile?.displayName || user?.displayName || [firstName, lastName].filter(Boolean).join(" "),
    phone: profile?.phone || "",
    isAdmin: await safeIsAdminByEmail(email),
    isVocalista: !!(await isVocalista(user?.uid || ""))
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
    profile.isVocalista ? "vocal" : "novocal"
  ].join("|");
}

function renderLoggedInIfNeeded(slot, profile) {
  const stateKey = buildHeaderStateKey(profile);
  const alreadyLoggedIn = slot?.querySelector(".public-user-menu");
  if (alreadyLoggedIn && lastHeaderStateKey === stateKey) return;
  lastHeaderStateKey = stateKey;
  renderLoggedIn(slot, profile);
}

function renderLoggedOutIfNeeded(slot) {
  const stateKey = "logged-out";
  const alreadyLoggedOut = slot?.querySelector("#public-login-button");
  if (alreadyLoggedOut && lastHeaderStateKey === stateKey) return;
  lastHeaderStateKey = stateKey;
  renderLoggedOut(slot);
}

async function renderLoggedOut(slot) {
  syncVocalNavLink(false);
  slot.innerHTML = `
    <button type="button" id="public-login-button" class="public-login-button public-login-button--image-only" aria-label="Entrar">
      <img src="./assets/img/ui/login-user-preto.png" alt="Entrar" class="public-login-button__image public-login-button__image--light" />
      <img src="./assets/img/ui/login-user-branco.png" alt="Entrar" class="public-login-button__image public-login-button__image--dark" />
    </button>`;
  $("#public-login-button")?.addEventListener("click", openPublicAuthModal);
}

async function renderLoggedIn(slot, profile) {
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

  const toggle = $("#public-user-toggle");
  const dropdown = $("#public-user-dropdown");
  currentMenu = dropdown;

  toggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropdown?.classList.toggle("hidden");
  });

  $("#public-logout-button")?.addEventListener("click", async () => {
    clearVocalNavPermissionCache();
    clearPublicHeaderProfileCache();
    syncVocalNavLink(false);
    await signOut(auth);
    closeUserMenu();
    if (window.location.pathname.includes("/conta.html")) {
      window.location.href = "./index.html";
    }
  });
}

async function renderHeaderAuth(user) {
  const slot = ensureHeaderSlot();
  if (!slot) return;

  if (!user) {
    currentUser = null;
    clearVocalNavPermissionCache();
    clearPublicHeaderProfileCache();
    renderLoggedOutIfNeeded(slot);
    emitPublicAuthUpdated(null);
    return;
  }

  const cachedHeader = getCachedPublicHeaderForUser(user);
  if (cachedHeader?.uid) {
    currentUser = { ...cachedHeader, firebaseUser: user };
    renderLoggedInIfNeeded(slot, cachedHeader);
  }

  const cachedPermission = getCachedVocalPermissionForUser(user);
  syncVocalNavLink(!!cachedPermission?.canSeeVocal);

  const profile = await buildProfileData(user);
  currentUser = { ...profile, firebaseUser: user };
  cachePublicHeaderProfile(profile);
  cacheVocalNavPermission(profile);
  syncVocalNavLink(profile.isAdmin || profile.isVocalista);
  await savePublicUserProfile(profile.uid, {
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.displayName,
    email: profile.email,
    phone: profile.phone,
    photoURL: profile.photoURL
  });
  renderLoggedInIfNeeded(slot, profile);
  emitPublicAuthUpdated(profile);
}

export async function loginPublicUser() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logoutPublicUser() {
  clearVocalNavPermissionCache();
  clearPublicHeaderProfileCache();
  syncVocalNavLink(false);
  await signOut(auth);
}

export function getCurrentPublicUser() {
  return currentUser;
}

export function watchPublicAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    await renderHeaderAuth(user);
    if (authReadyResolver) {
      authReadyResolver(currentUser);
      authReadyResolver = null;
    }
    if (typeof callback === "function") callback(user);
  });
}

export function whenPublicAuthReady() {
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

function restoreCachedHeaderAuthUi() {
  const slot = ensureHeaderSlot();
  if (!slot) return;

  const cachedHeader = getCachedPublicHeaderProfile();
  if (cachedHeader?.uid) {
    currentUser = { ...cachedHeader, firebaseUser: null };
    renderLoggedInIfNeeded(slot, cachedHeader);
    restoreCachedVocalNavLink();
    return;
  }

  renderLoggedOutIfNeeded(slot);
}

export function initPublicAuth() {
  ensureAuthModal();
  restoreCachedHeaderAuthUi();
  watchPublicAuth();

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".public-user-menu")) closeUserMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeUserMenu();
      closePublicAuthModal();
    }
  });
}
