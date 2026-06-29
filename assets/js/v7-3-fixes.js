/* Ministério Seven V7.3 — correções estruturais */
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

  function brandSrc(part){
    const mode = isLight() ? 'escura' : 'clara';
    return asset(`img/brand-seven/${part}/${part}-${mode}.svg`);
  }

  function buildBrandCombo(){
    const combo = document.createElement('span');
    combo.className = 'v73-brand-combo';
    combo.innerHTML = `
      <img class="v73-brand-mark" alt="V7" src="${brandSrc('v7')}">
      <span class="v73-brand-word" aria-hidden="true">
        <img class="v73-brand-ministerio" alt="" src="${brandSrc('ministerio')}">
        <img class="v73-brand-seven" alt="" src="${brandSrc('seven')}">
      </span>`;
    return combo;
  }

  function refreshBrandTheme(){
    document.querySelectorAll('.v73-brand-combo').forEach((combo) => {
      const mark = combo.querySelector('.v73-brand-mark');
      const min = combo.querySelector('.v73-brand-ministerio');
      const seven = combo.querySelector('.v73-brand-seven');
      if (mark) mark.src = brandSrc('v7');
      if (min) min.src = brandSrc('ministerio');
      if (seven) seven.src = brandSrc('seven');
    });
    document.querySelectorAll('.v73-admin-brand-mini img').forEach((img) => { img.src = brandSrc('v7'); });
  }

  function enhanceHeaderBrand(){
    const targets = [
      ...document.querySelectorAll('.site-header .brand-link'),
      ...document.querySelectorAll('.admin-topbar .admin-brand')
    ];

    targets.forEach((target) => {
      if (!target || target.dataset.v73Brand === '1') return;
      target.dataset.v73Brand = '1';
      const label = target.getAttribute('aria-label') || target.textContent?.trim() || 'Ministério Seven';
      target.setAttribute('aria-label', label.includes('Seven') ? label : 'Ministério Seven');
      target.innerHTML = '';
      target.appendChild(buildBrandCombo());
    });
  }

  function normalizePublicNav(){
    document.querySelectorAll('.main-nav a, .header-nav a, .site-nav a').forEach((a) => {
      const txt = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (/m[úu]sicas\s+vocal/i.test(txt)) a.textContent = 'Músicas Vocal';
      a.classList.add('v73-nav-nowrap');
    });
  }

  /* ---------- Auto-rolagem própria ---------- */
  let panel;
  let timer = null;
  let speed = 1.6;

  function stopAuto(){
    if (timer) window.clearInterval(timer);
    timer = null;
    panel?.querySelector('.v73-scroll-play')?.classList.remove('is-running');
  }

  function startAuto(){
    stopAuto();
    const btn = panel?.querySelector('.v73-scroll-play');
    btn?.classList.add('is-running');
    timer = window.setInterval(() => {
      const px = Math.max(0.2, speed) * 0.9;
      window.scrollBy({ top: px, left: 0, behavior: 'auto' });
      const nearEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (nearEnd) stopAuto();
    }, 16);
  }

  function hideOldScrollBubbles(){
    document.querySelectorAll('#scroll-bubble, #musica-scroll-bubble, .scroll-bubble, .musica-scroll-bubble, [class*="scroll-bubble"]').forEach((el) => {
      if (el.classList.contains('v73-scroll-panel') || el.closest('.v73-scroll-panel')) return;
      el.setAttribute('hidden', 'hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function createScrollPanel(){
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'v73-scroll-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Auto-rolagem');
    panel.innerHTML = `
      <div class="v73-scroll-head">
        <div class="v73-scroll-title">Auto-rolagem</div>
        <button type="button" class="v73-scroll-close" aria-label="Fechar">×</button>
      </div>
      <div class="v73-scroll-body">
        <button type="button" class="v73-scroll-play" aria-label="Iniciar ou pausar auto-rolagem"></button>
        <div class="v73-scroll-range-wrap">
          <div class="v73-scroll-range-label"><span>Velocidade</span><span class="v73-scroll-speed-value">${speed.toFixed(1)}x</span></div>
          <input class="v73-scroll-range" type="range" min="0.3" max="4" step="0.1" value="${speed}">
        </div>
        <button type="button" class="v73-scroll-reset" title="Voltar para 1.6x" aria-label="Resetar velocidade">↺</button>
      </div>
      <div class="v73-scroll-hint">Arraste pela barra superior. O slider só altera a velocidade.</div>`;
    document.body.appendChild(panel);

    const close = panel.querySelector('.v73-scroll-close');
    const play = panel.querySelector('.v73-scroll-play');
    const range = panel.querySelector('.v73-scroll-range');
    const reset = panel.querySelector('.v73-scroll-reset');
    const value = panel.querySelector('.v73-scroll-speed-value');

    close.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      stopAuto();
      panel.classList.remove('is-open');
    });
    play.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (timer) stopAuto(); else startAuto();
    });
    range.addEventListener('input', () => {
      speed = Number(range.value) || 1.6;
      value.textContent = `${speed.toFixed(1)}x`;
    });
    ['pointerdown','mousedown','touchstart','click'].forEach((eventName) => {
      range.addEventListener(eventName, (ev) => ev.stopPropagation(), { capture:true, passive:true });
    });
    reset.addEventListener('click', (ev) => {
      ev.preventDefault();
      speed = 1.6;
      range.value = String(speed);
      value.textContent = `${speed.toFixed(1)}x`;
    });

    makePanelDraggable(panel);
    return panel;
  }

  function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }

  function makePanelDraggable(box){
    const head = box.querySelector('.v73-scroll-head');
    if (!head || head.dataset.v73Drag === '1') return;
    head.dataset.v73Drag = '1';
    let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;

    const move = (ev) => {
      if (!dragging) return;
      const p = ev.touches ? ev.touches[0] : ev;
      const rect = box.getBoundingClientRect();
      const left = clamp(sl + p.clientX - sx, 8, window.innerWidth - rect.width - 8);
      const top = clamp(st + p.clientY - sy, 8, window.innerHeight - rect.height - 8);
      box.classList.add('v73-positioned');
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.right = 'auto';
      box.style.bottom = 'auto';
      ev.preventDefault();
    };
    const end = () => {
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
    return /auto\s*-?rolagem|auto\b|rolagem/i.test(text) && !/font|fonte|tom|pdf|foco|tela/i.test(text);
  }

  function interceptAutoButtons(){
    document.body.classList.add('v73-autoscroll-custom');
    hideOldScrollBubbles();

    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button, a, [role="button"]');
      if (!isAutoButton(btn)) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      hideOldScrollBubbles();
      const p = createScrollPanel();
      p.classList.add('is-open');
    }, true);

    document.querySelectorAll('#scroll-panel-toggle, .scroll-panel-toggle-btn, .v72-auto-btn-fixed').forEach((btn) => {
      btn.setAttribute('title', 'Auto-rolagem');
      btn.setAttribute('aria-label', 'Auto-rolagem');
      if (!btn.textContent.trim() || btn.textContent.trim().length < 3) btn.textContent = 'Auto';
    });
  }

  /* ---------- ADM Sidebar com permissões ---------- */
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
      console.warn('V7.3: não foi possível ler permissões do ADM; usando fallback visual.', error);
      return { user:null, admin:null, perms:null, fallback:true };
    }
  }

  function filterMenuByPerms(menu, admin, perms){
    if (!perms || !admin) {
      const cards = [...document.querySelectorAll('.admin-card[href], a.admin-card')];
      if (cards.length) {
        const allowedHref = new Set(cards.map((card) => (card.getAttribute('href') || '').split('/').pop()));
        return menu.filter((item) => item.key === 'dashboard' || allowedHref.has(item.href));
      }
      return menu.filter((item) => ['dashboard'].includes(item.key));
    }
    return menu.filter((item) => {
      try { return perms.canAccessAdminPage(admin, item.key) === true; }
      catch { return item.key === 'dashboard'; }
    });
  }

  function buildAdminSidebar(items){
    const nav = document.createElement('aside');
    nav.className = 'v73-admin-sidebar';
    const active = currentAdminKey();
    nav.innerHTML = `
      <div class="v73-admin-brand-mini">
        <img alt="V7" src="${brandSrc('v7')}">
        <div><strong>Ministério Seven</strong><span>Painel ADM</span></div>
      </div>
      <div class="v73-admin-menu-title">Menu</div>
      <nav class="v73-admin-menu" aria-label="Menu administrativo">
        ${items.map((item) => `<a href="${item.href}" class="${item.key === active ? 'is-active' : ''}" data-admin-key="${item.key}"><span class="v73-admin-menu-icon">${item.icon}</span><span>${item.label}</span></a>`).join('')}
      </nav>`;
    return nav;
  }

  function applyAdminLayout(items){
    if (!window.location.pathname.toLowerCase().includes('/admin/')) return;
    document.body.classList.add('v73-admin-page');
    if (document.querySelector('.v73-admin-shell')) {
      document.body.classList.add('v73-admin-ready');
      return;
    }

    const main = document.querySelector('main') || document.querySelector('.admin-main') || document.body;
    const shell = document.createElement('div');
    shell.className = 'v73-admin-shell';
    const sidebar = buildAdminSidebar(items);
    const content = document.createElement('div');
    content.className = 'v73-admin-content';

    const children = [...main.childNodes].filter((node) => {
      if (node.nodeType !== 1) return true;
      return !node.classList?.contains('v73-admin-shell');
    });
    children.forEach((node) => content.appendChild(node));

    if (currentAdminKey() === 'dashboard' && !content.querySelector('.v73-admin-dashboard-welcome')) {
      const welcome = document.createElement('section');
      welcome.className = 'v73-admin-dashboard-welcome';
      welcome.innerHTML = `<h2>Área de administração</h2><p>Use o menu lateral para acessar os módulos liberados para o seu perfil. Os itens sem permissão permanecem ocultos.</p>`;
      content.insertBefore(welcome, content.firstChild);
    }

    shell.appendChild(sidebar);
    shell.appendChild(content);
    main.appendChild(shell);
    document.body.classList.add('v73-admin-ready');
  }

  async function initAdminSidebar(){
    if (!window.location.pathname.toLowerCase().includes('/admin/')) return;
    document.body.classList.add('v73-admin-page');
    const context = await getAdminPermissionContext();
    const items = filterMenuByPerms(adminMenu, context.admin, context.perms);
    applyAdminLayout(items.length ? items : adminMenu.filter((item) => item.key === 'dashboard'));
  }

  function run(){
    document.body.classList.add('v7-layout-v73');
    enhanceHeaderBrand();
    normalizePublicNav();
    interceptAutoButtons();
    refreshBrandTheme();
    hideOldScrollBubbles();
    initAdminSidebar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  window.addEventListener('load', () => setTimeout(() => {
    enhanceHeaderBrand();
    normalizePublicNav();
    hideOldScrollBubbles();
    refreshBrandTheme();
  }, 120));

  const observer = new MutationObserver(() => {
    enhanceHeaderBrand();
    normalizePublicNav();
    hideOldScrollBubbles();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });

  const themeObserver = new MutationObserver(refreshBrandTheme);
  themeObserver.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme','class'] });
})();
