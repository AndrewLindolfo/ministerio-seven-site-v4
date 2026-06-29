
import { watchAuth, logout, getAdminProfileByEmail } from "./auth.js";
import { canAccessAdminPage, isPrimaryAdmin } from "./services/admin-permissions-service.js";
import { getCollection } from "./db.js";

function norm(v=""){ return String(v||"").trim().toLowerCase(); }

const MODULE_TO_PAGE = {
  dashboard: "dashboard",
  musicasPublicas: "musicas-publicas",
  musicas: "musicas-publicas",
  musicasVocal: "musicas-vocal",
  vocalistas: "vocalistas",
  cifras: "cifras",
  programacoes: "programacoes",
  fotos: "fotos",
  downloads: "downloads",
  downloadsGerais: "downloads-geral",
  downloadsPorMusica: "downloads-por-musica",
  contatos: "contatos",
  links: "links",
  notificacoes: "notificacoes",
  ensaios: "ensaios",
  backup: "backup",
  admins: "admins",
  logs: "logs",
  config: "links"
};

function currentFile(){ return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
function activeKey(){
  const f = currentFile();
  if(f === 'index.html' || f === '') return 'dashboard';
  if(f.includes('musicas-publicas') || f.includes('editor-musica-publica')) return 'musicasPublicas';
  if(f.includes('musicas-vocal') || f === 'musicas.html' || f.includes('editor-musica.html')) return 'musicasVocal';
  if(f.includes('vocalistas')) return 'vocalistas';
  if(f.includes('cifras') || f.includes('editor-cifra')) return 'cifras';
  if(f.includes('programacoes')) return 'programacoes';
  if(f.includes('fotos')) return 'fotos';
  if(f.includes('downloads-por-musica')) return 'downloadsPorMusica';
  if(f.includes('downloads-geral')) return 'downloadsGerais';
  if(f.includes('downloads')) return 'downloads';
  if(f.includes('contatos')) return 'contatos';
  if(f.includes('links')) return 'links';
  if(f.includes('notificacoes')) return 'notificacoes';
  if(f.includes('ensaios') || f.includes('editor-ensaio')) return 'ensaios';
  if(f.includes('backup')) return 'backup';
  if(f.includes('admins')) return 'admins';
  if(f.includes('logs')) return 'logs';
  if(f.includes('config')) return 'config';
  return '';
}

function canShow(admin, key){
  if(key === 'dashboard') return true;
  const page = MODULE_TO_PAGE[key] || key;
  return canAccessAdminPage(admin, page);
}

function updateActive(){
  const key = activeKey();
  document.querySelectorAll('.admin-nav a[data-admin-module], .admin-cards-grid [data-admin-module]').forEach(el => {
    el.classList.toggle('is-active', el.dataset.adminModule === key);
  });
}

function applyPermissions(admin){
  document.querySelectorAll('[data-admin-module]').forEach(el => {
    const key = el.dataset.adminModule;
    if(!key) return;
    const visible = canShow(admin, key);
    el.classList.toggle('hidden', !visible);
  });
  document.body.classList.add('admin-permissions-ready');
}

async function loadDashboardCounts(){
  const map = [
    ['musicas-publicas','musicasPublicas'],
    ['musicas-vocal','musicas'],
    ['cifras','cifras'],
    ['programacoes','programacoes'],
    ['downloads','downloads']
  ];
  await Promise.all(map.map(async ([key, col]) => {
    const el = document.querySelector(`[data-admin-count="${key}"]`);
    if(!el) return;
    try{
      const items = await getCollection(col);
      el.textContent = Array.isArray(items) ? items.length.toLocaleString('pt-BR') : '0';
    }catch(e){ el.textContent = '0'; }
  }));
}


function updateAdminBrandLogo(){
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  document.querySelectorAll('.admin-brand-logo').forEach((img) => {
    img.src = isLight
      ? '../assets/img/seven-admin-brand/v7/v7-escura.svg'
      : '../assets/img/seven-admin-brand/v7/v7-clara.svg';
  });
}

try{
  new MutationObserver(updateAdminBrandLogo).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
}catch{}

function setupFallbackActions(){
  updateAdminBrandLogo();
  document.getElementById('admin-logout-button')?.addEventListener('click', async () => logout());
  updateActive();
  if(currentFile()==='index.html') loadDashboardCounts();
}

watchAuth(async (user) => {
  if(!user?.email) return;
  const photo = user.photoURL || '../assets/img/v7/icon_120.png';
  document.querySelectorAll('#admin-user-photo').forEach(img => { img.src = photo; img.alt = user.displayName || user.email || 'Conta'; });
  document.querySelectorAll('#admin-user-email').forEach(el => el.textContent = user.email || '');
  document.querySelectorAll('#admin-user-name').forEach(el => el.textContent = user.displayName || 'Administrador');
  try{
    const admin = await getAdminProfileByEmail(norm(user.email));
    if(admin){
      document.querySelectorAll('#admin-user-name').forEach(el => el.textContent = admin.name || admin.nome || user.displayName || 'Administrador');
      document.querySelectorAll('#admin-user-role').forEach(el => el.textContent = isPrimaryAdmin(admin) ? 'Administrador Master' : 'Administrador');
      applyPermissions(admin);
    }
  }catch(err){ console.warn('Não foi possível aplicar permissões no menu ADM.', err); }
});

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupFallbackActions);
else setupFallbackActions();
