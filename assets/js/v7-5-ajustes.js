
(function(){
  const scriptUrl = document.currentScript?.src || '';
  function onReady(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  function isAdminPage(){ return /\/admin\//i.test(location.pathname) || document.body.classList.contains('admin-page') || !!document.querySelector('.admin-dashboard, .admin-main, .admin-content, [data-admin-page]'); }

  function hideHamburgerDesktop(){
    const apply = () => {
      const show = window.innerWidth <= 900;
      document.querySelectorAll('#mobile-menu-toggle, .mobile-menu-toggle, .hamburger, .menu-toggle').forEach(el => {
        el.style.display = show ? 'inline-flex' : 'none';
      });
    };
    apply();
    window.addEventListener('resize', apply);
  }

  function buildAdminSidebar(){
    if(!isAdminPage()) return;
    const main = document.querySelector('.admin-main, .admin-dashboard, .admin-page main, main');
    if(!main || main.closest('.v75-admin-shell')) return;

    const body = document.body;
    const shell = document.createElement('div');
    shell.className = 'v75-admin-shell';

    const sidebar = document.createElement('aside');
    sidebar.className = 'v75-admin-sidebar';
    sidebar.innerHTML = `
      <div class="v75-admin-title">Painel ADM</div>
      <div class="v75-admin-subtitle">Painel Administrativo</div>
      <nav class="v75-admin-menu"></nav>
    `;
    const menu = sidebar.querySelector('.v75-admin-menu');

    const existingItems = Array.from(document.querySelectorAll('.admin-sidebar a, .sidebar a, [data-admin-nav] a')).filter(a => a.href);
    let links = [];
    if(existingItems.length){
      links = existingItems.map(a => ({ href: a.getAttribute('href'), label: (a.textContent||'').trim() }));
    } else {
      // fallback: only use visible cards/menu labels found on page; keeps secondary admin cleaner
      const labels = Array.from(document.querySelectorAll('.admin-card, .dashboard-card, [data-module-card]'))
        .map(card => ({ label: (card.textContent||'').trim().split('\n').map(s=>s.trim()).filter(Boolean)[0] || '' , href: card.querySelector('a')?.getAttribute('href') || '#' }))
        .filter(x => x.label);
      if(labels.length) links = labels;
      else links = [{label:'Visão geral', href:'index.html'}];
    }

    // de-duplicate + keep only meaningful labels
    const seen = new Set();
    links = links.filter(item => {
      const label = (item.label||'').replace(/\s+/g,' ').trim();
      if(!label) return false;
      const key = label.toLowerCase();
      if(seen.has(key)) return false;
      seen.add(key);
      item.label = label;
      return true;
    });

    if(!links.some(x => /vis[ãa]o geral/i.test(x.label))) links.unshift({label:'Visão geral', href:'index.html'});

    links.forEach(item => {
      const a = document.createElement('a');
      a.className = 'v75-admin-link';
      a.href = item.href || '#';
      if (location.pathname.endsWith(item.href || '')) a.classList.add('is-active');
      if ((item.href || '').endsWith('index.html') && /\/admin\/?$/i.test(location.pathname)) a.classList.add('is-active');
      a.innerHTML = `<span>${item.label}</span>`;
      menu.appendChild(a);
    });

    const content = document.createElement('div');
    content.className = 'v75-admin-content';

    main.parentNode.insertBefore(shell, main);
    shell.appendChild(sidebar);
    shell.appendChild(content);
    content.appendChild(main);
  }

  function normalizeAvatar(){
    document.querySelectorAll('#admin-account-toggle, .user-menu-trigger, .header-avatar, .account-avatar-wrap').forEach(el => {
      el.style.borderRadius = '14px';
      el.style.overflow = 'hidden';
    });
    document.querySelectorAll('#admin-account-toggle img, .user-menu-trigger img, .header-avatar img, .account-avatar-wrap img').forEach(el => {
      el.style.borderRadius = '14px';
      el.style.objectFit = 'cover';
    });
  }

  onReady(() => {
    hideHamburgerDesktop();
    normalizeAvatar();
    buildAdminSidebar();
  });
})();
