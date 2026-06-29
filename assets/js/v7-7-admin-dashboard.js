
/* Ministério Seven V7.7 — Dashboard ADM real + ícones/logos */
(function(){
  const scriptUrl = document.currentScript?.src || '';
  const asset = (path) => {
    try { return new URL(`../seven-v7/${path}`, scriptUrl).href; }
    catch { return `assets/seven-v7/${path}`; }
  };
  const icon = (name) => asset(`icons/${name}`);
  const brand = (name) => asset(`brand/${name}`);

  const modules = [
    {key:'dashboard', label:'Dashboard', href:'index.html', icon:'admin-icon-admin-dashboard.svg', group:'main'},
    {key:'musicas', label:'Músicas Públicas', href:'musicas.html', icon:'admin-icon-admin-public-music.svg', group:'main'},
    {key:'musicas-vocal', label:'Músicas Vocal', href:'musicas-vocal.html', icon:'admin-icon-admin-vocal-music.svg', group:'main'},
    {key:'vocalistas', label:'Vocalistas', href:'vocalistas.html', icon:'admin-icon-admin-vocalists.svg', group:'main'},
    {key:'cifras', label:'Cifras', href:'cifras.html', icon:'admin-icon-admin-chords.svg', group:'main'},
    {key:'programacoes', label:'Programações', href:'programacoes.html', icon:'admin-icon-admin-programs.svg', group:'main'},
    {key:'fotos', label:'Fotos', href:'fotos.html', icon:'admin-icon-admin-photos.svg', group:'main'},
    {key:'downloads', label:'Downloads', href:'downloads.html', icon:'admin-icon-admin-downloads.svg', group:'main'},
    {key:'contatos', label:'Contatos', href:'contatos.html', icon:'admin-icon-admin-contacts.svg', group:'main'},
    {key:'links', label:'Links', href:'links.html', icon:'admin-icon-admin-links.svg', group:'main'},
    {key:'notificacoes', label:'Notificações', href:'notificacoes.html', icon:'admin-icon-admin-notifications.svg', group:'main'},
    {key:'ensaios', label:'Ensaios', href:'ensaios.html', icon:'admin-icon-admin-programs.svg', group:'main'},
    {key:'backup', label:'Backup', href:'backup.html', icon:'admin-icon-admin-backup.svg', group:'config'},
    {key:'admins', label:'ADMs', href:'admins.html', icon:'admin-icon-admin-users.svg', group:'config'},
    {key:'usuarios', label:'Usuários', href:'usuarios.html', icon:'admin-icon-admin-users.svg', group:'config'},
    {key:'permissoes', label:'Permissões', href:'permissoes.html', icon:'admin-icon-admin-permissions.svg', group:'config'},
    {key:'logs', label:'Log de atividades', href:'logs.html', icon:'admin-icon-admin-logs.svg', group:'config'},
    {key:'config', label:'Configurações', href:'configuracoes.html', icon:'admin-icon-admin-settings.svg', group:'config'}
  ];

  const byHref = Object.fromEntries(modules.map(m => [m.href.toLowerCase(), m]));
  const byLabel = modules.reduce((acc,m)=>{acc[m.label.toLowerCase()] = m; return acc;},{});

  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',fn) : fn(); }
  function isAdmin(){ return /\/admin(\/|$)/i.test(location.pathname) || document.body.classList.contains('admin-page') || !!document.querySelector('[data-admin-page], .admin-dashboard, .admin-main'); }
  function currentFile(){ return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
  function ico(name){ return `<span class="v77-icon" style="-webkit-mask-image:url('${icon(name)}');mask-image:url('${icon(name)}')"></span>`; }

  function normalizeHeader(){
    // Header público: menu hamburger só no mobile/tablet estreito.
    const apply = () => {
      const show = window.innerWidth <= 900;
      document.querySelectorAll('#mobile-menu-toggle,.mobile-menu-toggle,.menu-toggle,.hamburger,button[aria-label*="menu" i],button[title*="menu" i]').forEach(btn=>{
        btn.style.setProperty('display', show ? 'inline-flex' : 'none', 'important');
      });
    };
    apply(); window.addEventListener('resize', apply, {passive:true});
    document.querySelectorAll('#admin-account-toggle img,.user-menu-trigger img,.header-avatar img,.account-avatar-wrap img,.avatar-button img,.profile-button img').forEach(img=>{
      img.style.borderRadius = '14px'; img.style.objectFit = 'cover';
    });
  }

  function collectAllowed(){
    // Primeiro respeita o que o próprio site já renderizou após consultar permissões.
    const visibleLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => {
      const r = a.getBoundingClientRect();
      const style = getComputedStyle(a);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const href = (a.getAttribute('href') || '').toLowerCase().split('?')[0].split('#')[0].split('/').pop();
      return byHref[href];
    }).map(a => byHref[(a.getAttribute('href') || '').toLowerCase().split('?')[0].split('#')[0].split('/').pop()]);

    const visibleText = Array.from(document.querySelectorAll('.admin-card,.dashboard-card,[data-module-card],button,a')).map(el=>{
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return null;
      return (el.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
    }).filter(Boolean);

    const fromText = modules.filter(m => visibleText.some(t => t.includes(m.label.toLowerCase())));
    let allowed = [...visibleLinks, ...fromText];
    const seen = new Set();
    allowed = allowed.filter(m => m && !seen.has(m.key) && seen.add(m.key));

    // Sempre manter dashboard/visão geral; os outros dependem do que o sistema já mostrou.
    if (!allowed.some(m=>m.key==='dashboard')) allowed.unshift(modules[0]);
    return allowed;
  }

  function buildSidebar(allowed){
    const userImg = document.querySelector('#admin-account-toggle img,.user-menu-trigger img,.header-avatar img,.account-avatar-wrap img')?.src || brand('icon-user-default.svg');
    const userName = document.querySelector('[data-user-name], .admin-user-name, .user-name')?.textContent?.trim() || 'Administrador';
    const logo = brand('logo-header-clara.svg');
    const main = allowed.filter(m=>m.group==='main');
    const config = allowed.filter(m=>m.group==='config');
    const linkHtml = (m) => `<a class="v77-menu-link ${currentFile()===m.href.toLowerCase() ? 'is-active':''}" href="${m.href}">${ico(m.icon)}<span>${m.label}</span><span class="v77-chev">›</span></a>`;
    return `<aside class="v77-admin-sidebar">
      <div class="v77-admin-brand"><img src="${logo}" alt="Ministério Seven"><div><small>Painel Administrativo</small></div></div>
      <div class="v77-admin-user"><img src="${userImg}" alt="Usuário"><div><strong>${userName}</strong><span>Administrador</span></div></div>
      <div class="v77-menu-title">Menu principal</div><nav class="v77-menu">${main.map(linkHtml).join('')}</nav>
      ${config.length ? `<div class="v77-menu-title">Configurações</div><nav class="v77-menu">${config.map(linkHtml).join('')}</nav>` : ''}
      <a class="v77-admin-public-link" href="../index.html">Ver site público ${ico('admin-icon-admin-view-site.svg')}</a>
    </aside>`;
  }

  function dashboardHTML(allowed){
    const shortcuts = allowed.filter(m=>m.key!=='dashboard').slice(0,10);
    const shortcut = (m)=>`<a class="v77-module-link" href="${m.href}">${ico(m.icon)}<span>${m.label}</span><b>→</b></a>`;
    const quicks = allowed.filter(m=>['musicas','musicas-vocal','vocalistas','cifras','programacoes','ensaios','notificacoes','contatos'].includes(m.key)).slice(0,8);
    const quick = (m)=>`<a class="v77-quick" href="${m.href}">${ico(m.icon)}<span>${m.label}</span></a>`;
    return `<div class="v77-admin-topbar"><div class="v77-admin-title"><h1>Dashboard</h1><p>Visão geral do Ministério Seven</p></div><div class="v77-admin-actions"><button class="v77-btn">01/05/2024 - 31/05/2024</button><button class="v77-btn gold">Exportar Relatório</button></div></div>
    <section class="v77-dashboard-grid">
      <div class="v77-kpis">
        ${[
          ['Músicas Públicas','1.248','18% este mês','admin-icon-admin-public-music.svg'],
          ['Músicas Vocal','342','12% este mês','admin-icon-admin-vocal-music.svg'],
          ['Cifras','2.856','21% este mês','admin-icon-admin-chords.svg'],
          ['Usuários','128','8% este mês','admin-icon-admin-users.svg'],
          ['Downloads','18,6K','24% este mês','admin-icon-admin-downloads.svg']
        ].map(([t,n,p,i])=>`<article class="v77-card v77-kpi"><div class="v77-kpi-icon">${ico(i)}</div><div><small>${t}</small><strong>${n}</strong><span>↑ ${p}</span></div></article>`).join('')}
      </div>
      <div class="v77-panels">
        <article class="v77-card v77-panel"><h2>Ações rápidas</h2><div class="v77-quick-grid">${quicks.map(quick).join('')}</div></article>
        <article class="v77-card v77-panel"><h2>Músicas acessadas</h2><div class="v77-chart-line"><svg viewBox="0 0 700 230" preserveAspectRatio="none"><path d="M0 160 C60 80 100 190 150 115 S245 120 300 92 S405 190 460 125 S565 88 620 130 S680 122 700 110" fill="none" stroke="#edc455" stroke-width="4"/><path d="M0 160 C60 80 100 190 150 115 S245 120 300 92 S405 190 460 125 S565 88 620 130 S680 122 700 110 L700 230 L0 230 Z" fill="rgba(237,196,85,.16)"/></svg></div></article>
        <article class="v77-card v77-panel"><h2>Downloads</h2><div class="v77-donut-wrap"><div class="v77-donut"></div><div class="v77-list"><div>● Músicas 62%</div><div>● Cifras 24%</div><div>● Playbacks 14%</div></div></div></article>
      </div>
      <div class="v77-bottom-panels">
        <article class="v77-card v77-panel"><h2>Atividade recente</h2><div class="v77-list">${['Nova música publicada','Cifra atualizada','Programação criada','Ensaio agendado','Contato respondido'].map((t,i)=>`<div class="v77-list-row">${ico('notice-icon-info.svg')}<div><strong>${t}</strong><span>por Ministério Seven</span></div><em>há ${i+1}h</em></div>`).join('')}</div></article>
        <article class="v77-card v77-panel"><h2>Top Músicas</h2><div class="v77-list">${['Bondade de Deus','Teu Amor Não Falha','A Corrida','Santo','Gratidão'].map((t,i)=>`<div class="v77-list-row"><strong>${i+1}</strong><div><strong>${t}</strong><span>Ministério Seven</span></div><em>${(2847-i*321).toLocaleString('pt-BR')}</em></div>`).join('')}</div></article>
        <article class="v77-card v77-panel"><h2>Atalhos de módulos</h2><div class="v77-module-grid">${shortcuts.map(shortcut).join('')}</div></article>
      </div>
    </section>`;
  }

  function userFormEnhance(container){
    // Não altera lógica; só adiciona classes visuais em páginas de usuários/permissões quando existirem formulários.
    if (!/usuarios|admins|permissoes|editar/i.test(currentFile()+document.title)) return;
    container.classList.add('v77-admin-form-page');
    container.querySelectorAll('form, .form-section, .permissions-section, .card').forEach(el=>el.classList.add('v77-form-card','v77-card'));
  }

  function mountAdmin(){
    if(!isAdmin()) return;
    document.body.classList.add('v77-admin-active');
    document.querySelectorAll('.v75-admin-sidebar').forEach(el=>el.remove());

    const allowed = collectAllowed();
    const existingApp = document.querySelector('.v77-admin-app');
    if (existingApp) return;

    const root = document.querySelector('main') || document.querySelector('.admin-main') || document.querySelector('.admin-dashboard') || document.body;
    const original = document.createElement('div');
    original.className = 'v77-original-admin v77-hidden';

    // move current admin content into hidden backup, except script/style and account overlays
    Array.from(root.children).forEach(ch => {
      if (ch.matches && ch.matches('script,style,link')) return;
      original.appendChild(ch);
    });
    root.appendChild(original);

    const app = document.createElement('div');
    app.className = 'v77-admin-app';
    const main = document.createElement('section');
    main.className = 'v77-admin-main';
    main.innerHTML = currentFile()==='index.html' || currentFile()==='' ? dashboardHTML(allowed) : `<div class="v77-admin-topbar"><div class="v77-admin-title"><h1>${document.title.replace(/\|.*$/,'').trim() || 'Painel ADM'}</h1><p>Gerencie este módulo do Ministério Seven.</p></div><div class="v77-admin-actions"><a class="v77-btn" href="index.html">Dashboard</a></div></div>`;

    if (!(currentFile()==='index.html' || currentFile()==='')) {
      // restore original page content below topbar, preserving functionality
      const pageContent = document.createElement('div');
      pageContent.className = 'v77-card v77-panel';
      while (original.firstChild) pageContent.appendChild(original.firstChild);
      original.remove();
      main.appendChild(pageContent);
      userFormEnhance(pageContent);
    }

    app.innerHTML = buildSidebar(allowed);
    app.appendChild(main);
    root.appendChild(app);
  }

  function init(){ normalizeHeader(); setTimeout(mountAdmin, 600); setTimeout(()=>{ if(!document.querySelector('.v77-admin-app')) mountAdmin(); }, 1600); }
  ready(init);
})();
