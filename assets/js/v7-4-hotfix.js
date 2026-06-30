/* Ministério Seven V7.4 — hotfix sem observers pesados */
(function(){
  const scriptUrl = document.currentScript?.src || '';
  const asset = (path) => {
    try { return new URL(`../${path}`, scriptUrl).href; }
    catch { return `assets/${path}`; }
  };

  const isLight = () => {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    const bodyTheme = document.body?.getAttribute('data-theme');
    return htmlTheme === 'light' || bodyTheme === 'light' || document.documentElement.classList.contains('light') || document.body?.classList.contains('light');
  };

  const logoSrc = () => asset(`img/logo-header/${isLight() ? 'logo-header-escura.svg' : 'logo-header-clara.svg'}`);

  function restoreHeaderLogo(){
    document.querySelectorAll('.site-header .brand-link').forEach((brand) => {
      if (!brand) return;
      brand.dataset.v74Brand = '1';
      brand.setAttribute('aria-label', 'Ministério Seven');
      const current = brand.querySelector('.v74-brand-logo');
      if (current) { current.src = logoSrc(); return; }
      brand.innerHTML = `<img id="header-v7-logo" src="${logoSrc()}" alt="Ministério Seven" class="brand-v7 v74-brand-logo" />`;
    });
  }

  function refreshThemeLogos(){
    document.querySelectorAll('.v74-brand-logo').forEach((img) => { img.src = logoSrc(); });
    document.querySelectorAll('.v74-admin-brand-mini img').forEach((img) => { img.src = logoSrc(); });
  }

  function normalizePublicNav(){
    document.querySelectorAll('.site-header .main-nav a, .site-header .header-nav a, .site-header .site-nav a, .mobile-menu-panel a').forEach((a) => {
      const txt = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (/m[úu]sicas\s+vocal/i.test(txt)) a.textContent = 'Músicas Vocal';
      a.classList.add('v74-nav-nowrap');
    });
  }

  function stopLegacyHeavyScripts(){
    document.body.classList.remove('v73-autoscroll-custom');
    document.body.classList.add('v74-autoscroll-ready');
  }

  /* ---------- Auto-rolagem V7.4 ---------- */
  let panel;
  let timer = null;
  let speed = 1.6;

  function stopAuto(){
    if (timer) window.clearInterval(timer);
    timer = null;
    panel?.querySelector('.v74-scroll-play')?.classList.remove('is-running');
  }

  function startAuto(){
    stopAuto();
    panel?.querySelector('.v74-scroll-play')?.classList.add('is-running');
    timer = window.setInterval(() => {
      const px = Math.max(0.15, speed) * 0.9;
      window.scrollBy({ top:px, left:0, behavior:'auto' });
      const nearEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 5;
      if (nearEnd) stopAuto();
    }, 16);
  }

  function createScrollPanel(){
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'v74-scroll-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Auto-rolagem');
    panel.innerHTML = `
      <div class="v74-scroll-head">
        <div class="v74-scroll-title">Auto-rolagem</div>
        <button type="button" class="v74-scroll-close" aria-label="Fechar">×</button>
      </div>
      <div class="v74-scroll-body">
        <button type="button" class="v74-scroll-play" aria-label="Iniciar ou pausar"></button>
        <div class="v74-scroll-range-wrap">
          <div class="v74-scroll-range-label"><span>Velocidade</span><span class="v74-scroll-speed-value">1.6x</span></div>
          <div class="v74-scroll-range-row">
            <input class="v74-scroll-range" type="range" min="0.3" max="4" step="0.1" value="1.6" aria-label="Velocidade da auto-rolagem" />
            <button type="button" class="v74-scroll-reset" title="Voltar velocidade padrão" aria-label="Voltar velocidade padrão">1x</button>
          </div>
        </div>
      </div>
      <div class="v74-scroll-hint">Arraste pela barra superior.</div>`;
    document.body.appendChild(panel);

    const close = panel.querySelector('.v74-scroll-close');
    const play = panel.querySelector('.v74-scroll-play');
    const range = panel.querySelector('.v74-scroll-range');
    const value = panel.querySelector('.v74-scroll-speed-value');
    const reset = panel.querySelector('.v74-scroll-reset');

    close?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); closeAutoPanel(); }, true);
    play?.addEventListener('click', (ev) => { ev.preventDefault(); timer ? stopAuto() : startAuto(); }, true);
    range?.addEventListener('input', () => {
      speed = Number(range.value) || 1;
      if (value) value.textContent = `${speed.toFixed(1)}x`;
    });
    ['pointerdown','mousedown','touchstart','click'].forEach((eventName) => {
      range?.addEventListener(eventName, (ev) => ev.stopPropagation(), { capture:true, passive:true });
    });
    reset?.addEventListener('click', (ev) => {
      ev.preventDefault();
      speed = 1;
      if (range) range.value = '1';
      if (value) value.textContent = '1.0x';
    }, true);

    enablePanelDrag(panel);
    return panel;
  }

  function enablePanelDrag(box){
    const head = box.querySelector('.v74-scroll-head');
    if (!head || head.dataset.v74Drag === '1') return;
    head.dataset.v74Drag = '1';
    let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const move = (ev) => {
      if (!dragging) return;
      const pointer = ev.touches ? ev.touches[0] : ev;
      if (!pointer) return;
      const rect = box.getBoundingClientRect();
      const left = clamp(sl + pointer.clientX - sx, 8, window.innerWidth - rect.width - 8);
      const top = clamp(st + pointer.clientY - sy, 8, window.innerHeight - rect.height - 8);
      box.classList.add('v74-positioned');
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.right = 'auto';
      box.style.bottom = 'auto';
      ev.preventDefault();
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      box.classList.remove('is-dragging');
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('touchmove', move, true);
      window.removeEventListener('touchend', end, true);
    };
    head.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button,input,a')) return;
      const rect = box.getBoundingClientRect();
      dragging = true; sx = ev.clientX; sy = ev.clientY; sl = rect.left; st = rect.top;
      box.classList.add('is-dragging');
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', end, true);
      ev.preventDefault();
    }, true);
    head.addEventListener('touchstart', (ev) => {
      if (ev.target.closest('button,input,a')) return;
      const touch = ev.touches[0]; if (!touch) return;
      const rect = box.getBoundingClientRect();
      dragging = true; sx = touch.clientX; sy = touch.clientY; sl = rect.left; st = rect.top;
      box.classList.add('is-dragging');
      window.addEventListener('touchmove', move, true);
      window.addEventListener('touchend', end, true);
      ev.preventDefault();
    }, { capture:true, passive:false });
  }

  function isAutoButton(el){
    if (!el) return false;
    if (el.matches?.('#scroll-panel-toggle, .scroll-panel-toggle-btn, .v72-auto-btn-fixed')) return true;
    const text = `${el.textContent || ''} ${el.getAttribute?.('title') || ''} ${el.getAttribute?.('aria-label') || ''} ${el.id || ''} ${el.className || ''}`;
    return /auto\s*-?rolagem|auto\b|auto-rolamento|rolagem/i.test(text) && !/font|fonte|tom|pdf|foco|tela|metr[ôo]nomo|tempo/i.test(text);
  }

  function hideLegacyBubbles(){
    document.querySelectorAll('#scroll-bubble, #musica-scroll-bubble, .scroll-bubble, .musica-scroll-bubble').forEach((el) => {
      if (el.classList.contains('v74-scroll-panel') || el.closest('.v74-scroll-panel')) return;
      el.setAttribute('hidden', 'hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function setAutoButtonsActive(active){
    document.querySelectorAll('#scroll-panel-toggle, #musica-scroll-panel-toggle, .scroll-panel-toggle-btn, .v72-auto-btn-fixed').forEach((btn) => {
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function closeAutoPanel(){
    stopAuto();
    if (panel) {
      panel.classList.remove('is-open', 'is-dragging');
      panel.setAttribute('aria-hidden', 'true');
    }
    setAutoButtonsActive(false);
  }

  function openAutoPanel(){
    hideLegacyBubbles();
    const box = createScrollPanel();
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    setAutoButtonsActive(true);
  }

  function toggleAutoPanel(){
    if (panel?.classList.contains('is-open')) closeAutoPanel();
    else openAutoPanel();
  }

  function initAutoScroll(){
    stopLegacyHeavyScripts();
    hideLegacyBubbles();
    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button, a, [role="button"]');
      if (!isAutoButton(btn)) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      toggleAutoPanel();
    }, true);
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && panel?.classList.contains('is-open')) closeAutoPanel();
    });
    document.querySelectorAll('#scroll-panel-toggle, #musica-scroll-panel-toggle, .scroll-panel-toggle-btn, .v72-auto-btn-fixed').forEach((btn) => {
      btn.setAttribute('title', 'Auto-rolagem');
      btn.setAttribute('aria-label', 'Auto-rolagem');
      btn.classList.add('v74-auto-button');
    });
  }

  /* ---------- ADM lateral V7.4 ---------- */
  const adminMenu = [
    { key:'dashboard', label:'Visão geral', href:'index.html', icon:'⌂' },
    { key:'musicas', label:'Músicas', href:'musicas.html', icon:'♪' },
    { key:'musicas-vocal', label:'Músicas Vocal', href:'musicas-vocal.html', icon:'♫' },
    { key:'vocalistas', label:'Vocalistas', href:'vocalistas.html', icon:'◉' },
    { key:'cifras', label:'Cifras', href:'cifras.html', icon:'♯' },
    { key:'programacoes', label:'Programações', href:'programacoes.html', icon:'◷' },
    { key:'fotos', label:'Fotos', href:'fotos.html', icon:'▣' },
    { key:'downloads', label:'Downloads', href:'downloads.html', icon:'⇩' },
    { key:'contatos', label:'Contatos', href:'contatos.html', icon:'✉' },
    { key:'links', label:'Links', href:'links.html', icon:'🔗' },
    { key:'notificacoes', label:'Notificações', href:'notificacoes.html', icon:'!' },
    { key:'ensaios', label:'Ensaios', href:'ensaios.html', icon:'▤' },
    { key:'backup', label:'Backup', href:'backup.html', icon:'◫' },
    { key:'admins', label:'ADMs', href:'admins.html', icon:'♛' },
    { key:'logs', label:'Log de atividades', href:'logs.html', icon:'☰' }
  ];

  function currentAdminKey(){
    const path = window.location.pathname.toLowerCase();
    if (!path.includes('/admin/')) return '';
    const file = path.split('/').pop() || 'index.html';
    if (file === 'index.html' || file === '') return 'dashboard';
    if (file.includes('musicas-vocal') || file.includes('musicas-vocais')) return 'musicas-vocal';
    if (file.includes('musicas')) return 'musicas';
    if (file.includes('vocalistas')) return 'vocalistas';
    if (file.includes('cifras')) return 'cifras';
    if (file.includes('programacoes')) return 'programacoes';
    if (file.includes('fotos')) return 'fotos';
    if (file.includes('downloads')) return 'downloads';
    if (file.includes('contatos')) return 'contatos';
    if (file.includes('links') || file.includes('config')) return 'links';
    if (file.includes('notificacoes')) return 'notificacoes';
    if (file.includes('ensaios')) return 'ensaios';
    if (file.includes('backup')) return 'backup';
    if (file.includes('admins')) return 'admins';
    if (file.includes('logs')) return 'logs';
    return 'dashboard';
  }

  async function getAdminPermissionContext(){
    try {
      const authUrl = new URL('./auth.js', scriptUrl).href;
      const permsUrl = new URL('./services/admin-permissions-service.js', scriptUrl).href;
      const auth = await import(authUrl);
      const perms = await import(permsUrl);
      return await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Tempo de validação excedido.')), 6500);
        auth.watchAuth(async (user) => {
          try {
            if (!user) { window.clearTimeout(timeout); resolve({ user:null, admin:null, perms }); return; }
            const admin = await auth.getAdminProfileByEmail(String(user.email || '').trim().toLowerCase());
            window.clearTimeout(timeout);
            resolve({ user, admin, perms });
          } catch (error) { window.clearTimeout(timeout); reject(error); }
        });
      });
    } catch (error) {
      console.warn('V7.4: não foi possível ler permissões do ADM; usando fallback visual.', error);
      return { user:null, admin:null, perms:null, fallback:true };
    }
  }

  function canAccess(item, admin, perms){
    if (item.key === 'dashboard') return true;
    if (!admin || !perms) return false;
    const role = String(admin.role || admin.tipo || admin.nivel || '').toLowerCase();
    if (role.includes('master') || role.includes('owner') || admin.master === true || admin.isMaster === true) return true;
    try { return perms.canAccessAdminPage(admin, item.key) === true; }
    catch { return false; }
  }

  function filterMenuByPerms(menu, admin, perms){
    if (!perms || !admin) {
      const cards = [...document.querySelectorAll('.admin-card[href], a.admin-card')];
      if (cards.length) {
        const allowedHref = new Set(cards.map((card) => (card.getAttribute('href') || '').split('/').pop()));
        return menu.filter((item) => item.key === 'dashboard' || allowedHref.has(item.href));
      }
      return menu.filter((item) => item.key === 'dashboard');
    }
    return menu.filter((item) => canAccess(item, admin, perms));
  }

  function buildAdminSidebar(items){
    const nav = document.createElement('aside');
    nav.className = 'v74-admin-sidebar';
    const active = currentAdminKey();
    nav.innerHTML = `
      <div class="v74-admin-brand-mini">
        <img alt="Ministério Seven" src="${logoSrc()}">
        <div><strong>Ministério Seven</strong><span>Painel ADM</span></div>
      </div>
      <div class="v74-admin-menu-title">Menu</div>
      <nav class="v74-admin-menu" aria-label="Menu administrativo">
        ${items.map((item) => `<a href="${item.href}" class="${item.key === active ? 'is-active' : ''}" data-admin-key="${item.key}"><span class="v74-admin-menu-icon">${item.icon}</span><span>${item.label}</span></a>`).join('')}
      </nav>`;
    return nav;
  }

  function applyAdminLayout(items){
    if (!window.location.pathname.toLowerCase().includes('/admin/')) return;
    document.body.classList.add('v74-admin-page');
    if (document.querySelector('.v74-admin-shell')) { document.body.classList.add('v74-admin-ready'); return; }

    const main = document.querySelector('main') || document.querySelector('.admin-main') || document.body;
    const shell = document.createElement('div');
    shell.className = 'v74-admin-shell';
    const sidebar = buildAdminSidebar(items);
    const content = document.createElement('div');
    content.className = 'v74-admin-content';

    const children = [...main.childNodes].filter((node) => {
      if (node.nodeType !== 1) return true;
      return !node.classList?.contains('v74-admin-shell') && !node.classList?.contains('v73-admin-shell');
    });
    children.forEach((node) => content.appendChild(node));

    if (currentAdminKey() === 'dashboard' && !content.querySelector('.v74-admin-dashboard-welcome')) {
      const welcome = document.createElement('section');
      welcome.className = 'v74-admin-dashboard-welcome';
      welcome.innerHTML = `<h2>Área de administração</h2><p>Use o menu lateral para acessar os módulos liberados para o seu perfil. Itens sem permissão ficam ocultos antes de aparecer.</p>`;
      content.insertBefore(welcome, content.firstChild);
    }

    shell.appendChild(sidebar);
    shell.appendChild(content);
    main.appendChild(shell);
    document.body.classList.add('v74-admin-ready');
  }

  async function initAdminSidebar(){
    if (!window.location.pathname.toLowerCase().includes('/admin/')) return;
    document.body.classList.add('v74-admin-page');
    const context = await getAdminPermissionContext();
    const items = filterMenuByPerms(adminMenu, context.admin, context.perms);
    applyAdminLayout(items.length ? items : adminMenu.filter((item) => item.key === 'dashboard'));
  }



  /* ---------- Ícones de favoritos e playlists ---------- */
  function personalIconUrl(name){
    return asset(`icons/seven-personal/${name}`);
  }

  function personalIcon(name){
    const url = personalIconUrl(name);
    return `<span class="ms-personal-icon" aria-hidden="true" style="-webkit-mask-image:url('${url}');mask-image:url('${url}')"></span>`;
  }

  function safeText(value){
    return String(value || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function originalButtonText(button, fallback = ''){
    if(!button) return fallback;
    if(!button.dataset.msPersonalOriginalText){
      const text = (button.textContent || '').replace(/\s+/g,' ').trim();
      button.dataset.msPersonalOriginalText = text || fallback;
    }
    return button.dataset.msPersonalOriginalText || fallback;
  }

  function setPersonalButton(button, icon, title, options = {}){
    if(!button) return;
    const withText = options.text === true;
    const text = options.textValue || originalButtonText(button, title || '');
    const nextKey = `${icon}|${withText ? text : ''}`;
    button.classList.add('ms-personal-icon-btn');
    if(withText) button.classList.add('ms-personal-icon-btn--text');
    else button.classList.remove('ms-personal-icon-btn--text');
    if(button.dataset.msPersonalRenderKey !== nextKey || !button.querySelector('.ms-personal-icon')){
      button.innerHTML = `${personalIcon(icon)}${withText ? `<span class="ms-personal-label">${safeText(text)}</span>` : ''}`;
      button.dataset.msPersonalRenderKey = nextKey;
    }
    if(title){
      button.setAttribute('title', title);
      button.setAttribute('aria-label', title);
    }
  }

  function isFavoriteActive(button){
    if(!button) return false;
    const aria = String(button.getAttribute('aria-pressed') || '').toLowerCase();
    return aria === 'true' || button.classList.contains('is-active') || button.classList.contains('active');
  }

  function applyFavoritePlaylistIcons(){
    document.querySelectorAll('[data-favorite-button]').forEach((button) => {
      const active = isFavoriteActive(button);
      setPersonalButton(button, active ? 'icon-star-2.svg' : 'icon-star-1.svg', active ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
      button.classList.toggle('ms-personal-favorite-active', active);
    });

    document.querySelectorAll('[data-playlist-button]').forEach((button) => {
      setPersonalButton(button, 'icon-playlist-add.svg', 'Adicionar à playlist');
    });

    document.querySelectorAll('.playlist-modal__close,[data-close-playlist-modal="1"].playlist-modal__close').forEach((button) => {
      setPersonalButton(button, 'icon-remove.svg', 'Fechar');
    });

    document.querySelectorAll('#playlist-create-button').forEach((button) => {
      setPersonalButton(button, 'icon-list-plus.svg', 'Criar e adicionar', { text:true, textValue:'Criar e adicionar' });
    });

    document.querySelectorAll('.playlist-modal__choice[data-playlist-choice]').forEach((button) => {
      setPersonalButton(button, 'icon-playlist-add.svg', 'Adicionar nesta playlist', { text:true });
    });

    document.querySelectorAll('#new-playlist-page-button').forEach((button) => {
      setPersonalButton(button, 'icon-list-plus.svg', 'Criar playlist', { text:true, textValue:'Criar playlist' });
    });

    document.querySelectorAll('[data-delete-playlist],.personal-playlist-delete').forEach((button) => {
      setPersonalButton(button, 'icon-remove.svg', 'Excluir playlist', { text:true, textValue:'Excluir' });
    });

    document.querySelectorAll('[data-remove-item],.personal-playlist-remove').forEach((button) => {
      setPersonalButton(button, 'icon-remove.svg', button.getAttribute('aria-label') || 'Remover da playlist');
    });

    document.querySelectorAll('[data-toggle-playlist],.personal-playlist-toggle').forEach((button) => {
      setPersonalButton(button, 'icon-empty-playlist.svg', 'Abrir playlist', { text:true });
    });

    document.querySelectorAll('.personal-library-empty').forEach((box) => {
      if(box.dataset.msPersonalEmptyIcon === '1') return;
      if(box.querySelector('button,a,input')) return;
      const txt = (box.textContent || '').replace(/\s+/g,' ').trim();
      if(!txt) return;
      const icon = /playlist/i.test(txt) ? 'icon-empty-playlist.svg' : 'icon-star-1.svg';
      box.innerHTML = `${personalIcon(icon)}<span>${safeText(txt)}</span>`;
      box.dataset.msPersonalEmptyIcon = '1';
      box.classList.add('ms-personal-empty-iconized');
    });
  }

  let personalIconScheduled = false;
  function schedulePersonalIcons(){
    if(personalIconScheduled) return;
    personalIconScheduled = true;
    window.setTimeout(() => {
      personalIconScheduled = false;
      applyFavoritePlaylistIcons();
    }, 70);
  }

  function initFavoritePlaylistIcons(){
    applyFavoritePlaylistIcons();
    window.setTimeout(applyFavoritePlaylistIcons, 180);
    window.setTimeout(applyFavoritePlaylistIcons, 700);
    try{
      const observer = new MutationObserver((mutations) => {
        if(mutations.some((m) => m.type === 'childList' || m.attributeName === 'class' || m.attributeName === 'aria-pressed')){
          schedulePersonalIcons();
        }
      });
      observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class','aria-pressed'] });
    }catch{}
  }

  function run(){
    document.body.classList.add('v7-layout-v74');
    restoreHeaderLogo();
    normalizePublicNav();
    initAutoScroll();
    initAdminSidebar();
    initFavoritePlaylistIcons();
    refreshThemeLogos();
    setTimeout(() => { restoreHeaderLogo(); normalizePublicNav(); refreshThemeLogos(); }, 160);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  window.addEventListener('load', () => setTimeout(() => { restoreHeaderLogo(); normalizePublicNav(); refreshThemeLogos(); applyFavoritePlaylistIcons(); }, 120));

  /* Só observa troca de tema; não observa DOM inteiro para evitar travamentos no Live Server. */
  try {
    new MutationObserver(refreshThemeLogos).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme','class'] });
  } catch {}
})();
