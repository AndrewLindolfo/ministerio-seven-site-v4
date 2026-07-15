import { whenPublicAuthReady, openPublicAuthModal } from "../public-auth.js";
import { getAdminProfileByEmail } from "../auth.js";
import { isIntegrante } from "../services/integrantes-service.js";

function normalize(value = "") {
  return String(value || "").trim().toLowerCase();
}

export async function getIntegranteAccess(options = {}) {
  const openLogin = options.openLogin === true;
  const profile = await whenPublicAuthReady();
  const firebaseUser = profile?.firebaseUser || null;
  const uid = String(profile?.uid || firebaseUser?.uid || "").trim();
  const email = normalize(profile?.email || firebaseUser?.email || "");

  if (!uid) {
    if (openLogin) openPublicAuthModal();
    return { logged: false, allowed: false, profile: null, reason: "not-logged" };
  }

  if (profile?.isAdmin || profile?.isIntegrante || profile?.isVocalista) {
    return { logged: true, allowed: true, profile, reason: profile?.isAdmin ? "admin" : "integrante" };
  }

  try {
    const [admin, integrante] = await Promise.all([
      getAdminProfileByEmail(email).catch(() => null),
      isIntegrante(uid, email).catch(() => false)
    ]);
    const allowed = !!admin || !!integrante;
    return { logged: true, allowed, profile: { ...(profile || {}), isAdmin: !!admin, isIntegrante: !!integrante, isVocalista: !!integrante }, reason: allowed ? (!!admin ? "admin" : "integrante") : "not-integrante" };
  } catch (error) {
    console.error("Erro ao verificar acesso de integrante:", error);
    return { logged: true, allowed: false, profile, reason: "error", error };
  }
}
