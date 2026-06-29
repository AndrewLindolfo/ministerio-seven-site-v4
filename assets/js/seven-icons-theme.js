
/* Ministério Seven — Logos e ícones oficiais com troca por tema */
(function(){
  const scriptUrl = document.currentScript?.src || '';
  const asset = (path) => {
    try { return new URL(path, scriptUrl).href; }
    catch { return path; }
  };
  const icon = (name) => asset(`../icons/seven-site/${name}`);
  const brand = (name) => asset(`../img/seven-brand/${name}`);
  const isAdmin = /\/admin(\/|$)/i.test(location.pathname);
  let applying = false;

  const navIconByText = [
    [/^in[ií]cio$/i, 'icon-home.svg'],
    [/m[uú]sicas\s+vocal/i, 'icon-microphone.svg'],
    [/m[uú]sicas/i, 'icon-music.svg'],
    [/cifras/i, 'icon-chord.svg'],
    [/agenda/i, 'icon-calendar.svg'],
    [/fotos|[aá]lbuns/i, 'icon-photo.svg'],
    [/downloads/i, 'icon-download.svg'],
    [/ferramentas/i, 'icon-tools.svg'],
    [/contato/i, 'icon-contact.svg'],
    [/notifica/i, 'icon-bell.svg'],
    [/favoritos/i, 'icon-star.svg'],
    [/playlists/i, 'icon-playlist.svg'],
    [/minha\s+conta|conta/i, 'icon-user.svg'],
    [/sair/i, 'icon-logout.svg'],
  ];

  const actionIconByText = [
    [/^nova|^novo|adicionar|criar/i, 'icon-add.svg'],
    [/editar/i, 'icon-edit.svg'],
    [/salvar/i, 'icon-save.svg'],
    [/excluir|remover|apagar/i, 'icon-trash.svg'],
    [/cancelar|fechar/i, 'icon-close.svg'],
    [/upload|enviar arquivo|subir/i, 'icon-upload.svg'],
    [/exportar/i, 'icon-export.svg'],
    [/importar|restaurar|recuperar/i, 'icon-import.svg'],
    [/backup/i, 'icon-admin-backup.svg'],
    [/selecionar todos/i, 'icon-checklist.svg'],
    [/ativo/i, 'icon-active.svg'],
    [/inativo/i, 'icon-inactive.svg'],
  ];

  function cleanText(el){ return (el?.textContent || '').replace(/\s+/g,' ').trim(); }
  function iconSpan(file, extra='seven-icon'){
    const span = document.createElement('span');
    span.className = extra;
    span.setAttribute('aria-hidden','true');
    span.style.setProperty('--seven-icon-url', `url("${icon(file)}")`);
    return span;
  }
  function ensureIcon(el, file, extra='seven-icon', prepend=true){
    if(!el || el.querySelector(':scope > .seven-icon, :scope > .site-icon, :scope > .admin-icon-svg, :scope > .seven-action-icon')) return;
    const span = iconSpan(file, extra);
    if(prepend) el.insertBefore(span, el.firstChild);
    else el.appendChild(span);
    el.classList.add('seven-icon-applied');
  }
  function setIconButton(btn, file, label){
    if(!btn) return;
    const txt = label || btn.getAttribute('aria-label') || cleanText(btn) || '';
    btn.innerHTML = '';
    btn.appendChild(iconSpan(file));
    if(txt){
      const sr = document.createElement('span');
      sr.className = 'seven-icon-sr';
      sr.textContent = txt;
      btn.appendChild(sr);
      btn.setAttribute('aria-label', txt);
    }
    btn.classList.add('seven-icon-only','seven-icon-applied');
  }
  function setLabeledButton(btn, file, label){
    if(!btn) return;
    btn.innerHTML = '';
    btn.appendChild(iconSpan(file));
    const span = document.createElement('span');
    span.textContent = label;
    btn.appendChild(span);
    btn.classList.add('seven-icon-applied');
  }
  function currentTheme(){ return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  function updateLogos(){
    const light = currentTheme() === 'light';
    const headerLogo = document.getElementById('header-v7-logo');
    if(headerLogo){
      headerLogo.src = light ? brand('header/logo-header-escura.svg') : brand('header/logo-header-clara.svg');
      headerLogo.alt = 'Ministério Seven';
      headerLogo.classList.add('seven-theme-logo');
    }
    const footerLogo = document.getElementById('footer-logo');
    if(footerLogo){
      footerLogo.src = light ? brand('ministerio-seven/ministerio-seven-escura.svg') : brand('ministerio-seven/ministerio-seven-clara.svg');
      footerLogo.alt = 'Ministério Seven';
      footerLogo.classList.add('seven-theme-footer-logo');
    }
    document.querySelectorAll('.admin-brand-logo').forEach((img) => {
      img.src = light ? brand('v7/v7-escura.svg') : brand('v7/v7-clara.svg');
      img.alt = 'V7';
    });
    document.querySelectorAll('img[src*="assets/img/v7/icon_120"],img[src*="assets/img/v7/icon_dark"],img[src*="assets/img/v7/icon_light"]').forEach((img) => {
      if(img.id === 'header-v7-logo') return;
      if(img.id === 'conta-photo' || img.id === 'admin-user-photo' || img.classList.contains('admin-user-photo')) return;
      img.src = light ? brand('v7/v7-escura.svg') : brand('v7/v7-clara.svg');
    });
    document.querySelectorAll('link[rel~="icon"]').forEach((link) => { link.href = brand('favicon/favicon.svg'); });
  }

  function updateThemeButtons(){
    const light = currentTheme() === 'light';
    document.querySelectorAll('#theme-toggle').forEach((btn) => {
      if(isAdmin || btn.classList.contains('admin-side-button')) setLabeledButton(btn, light ? 'icon-moon.svg' : 'icon-sun.svg', 'Alternar tema');
      else setIconButton(btn, light ? 'icon-moon.svg' : 'icon-sun.svg', 'Alternar tema');
    });
  }

  function applyGlobalButtons(){
    setIconButton(document.getElementById('search-toggle'), 'icon-search.svg', 'Buscar');
    setIconButton(document.getElementById('mobile-menu-toggle'), 'icon-menu.svg', 'Abrir menu');
    setIconButton(document.getElementById('mobile-menu-close'), 'icon-close.svg', 'Fechar menu');
    setIconButton(document.getElementById('search-modal-close'), 'icon-close.svg', 'Fechar busca');
    document.querySelectorAll('.public-auth-modal__close,[data-close-public-auth="1"]').forEach((btn) => {
      if(btn.tagName === 'BUTTON') setIconButton(btn, 'icon-close.svg', 'Fechar');
    });
  }

  function applyNavIcons(){
    document.querySelectorAll('.main-nav a, .mobile-nav-link, .public-user-menu a').forEach((a) => {
      const txt = cleanText(a);
      const href = (a.getAttribute('href') || '').toLowerCase();
      let found = navIconByText.find(([rx]) => rx.test(txt));
      if(!found){
        if(href.includes('musicas-vocal')) found = [null,'icon-microphone.svg'];
        else if(href.includes('musicas')) found = [null,'icon-music.svg'];
        else if(href.includes('cifras')) found = [null,'icon-chord.svg'];
        else if(href.includes('agenda')) found = [null,'icon-calendar.svg'];
        else if(href.includes('fotos')) found = [null,'icon-photo.svg'];
        else if(href.includes('downloads')) found = [null,'icon-download.svg'];
        else if(href.includes('ferramentas')) found = [null,'icon-tools.svg'];
        else if(href.includes('contato')) found = [null,'icon-contact.svg'];
        else if(href.includes('favoritos')) found = [null,'icon-star.svg'];
        else if(href.includes('playlists')) found = [null,'icon-playlist.svg'];
        else if(href.includes('conta')) found = [null,'icon-user.svg'];
      }
      if(found) ensureIcon(a, found[1]);
    });
  }

  function applyCifraControls(){
    const map = [
      ['transpose-down','icon-transpose-down.svg','Tom menos'],
      ['transpose-up','icon-transpose-up.svg','Tom mais'],
      ['font-down','icon-font-minus.svg','Fonte menor'],
      ['font-up','icon-font-plus.svg','Fonte maior'],
      ['focus-toggle','icon-eye.svg','Modo foco'],
      ['fullscreen-toggle','icon-fullscreen.svg','Tela cheia'],
      ['scroll-panel-toggle','icon-auto-scroll.svg','Auto-rolagem'],
      ['pdf-toggle','icon-pdf-download.svg','Baixar PDF'],
      ['scroll-bubble-close','icon-close.svg','Fechar auto-rolagem'],
      ['scroll-slower','icon-minus.svg','Diminuir velocidade'],
      ['scroll-faster','icon-plus.svg','Aumentar velocidade'],
    ];
    map.forEach(([id,file,label]) => {
      const el = document.getElementById(id);
      if(!el) return;
      if(id === 'pdf-toggle') setLabeledButton(el, file, 'PDF');
      else if(id === 'font-down') setLabeledButton(el, file, 'A-');
      else if(id === 'font-up') setLabeledButton(el, file, 'A+');
      else setIconButton(el, file, label);
    });
    const scrollToggle = document.getElementById('scroll-toggle');
    if(scrollToggle){
      const isPlaying = /pause|pausar|❚|⏸/i.test(scrollToggle.getAttribute('aria-label') || scrollToggle.textContent || '') || scrollToggle.classList.contains('is-playing');
      setIconButton(scrollToggle, isPlaying ? 'icon-pause.svg' : 'icon-play.svg', 'Iniciar ou pausar rolagem');
    }
    document.querySelectorAll('.page-cross-link a').forEach((a)=>{
      const txt = cleanText(a);
      if(/cifra/i.test(txt)) ensureIcon(a,'icon-chord-sheet.svg');
      else if(/letra/i.test(txt)) ensureIcon(a,'icon-lyrics.svg');
    });
    document.querySelectorAll('.tool-fullscreen-btn').forEach((btn)=> ensureIcon(btn,'icon-fullscreen.svg','seven-icon seven-action-icon'));
  }

  function applyFavoritePlaylistIcons(){
    document.querySelectorAll('[data-favorite-button],.favorite-button,.personal-favorite-btn').forEach((btn)=>{
      const active = btn.classList.contains('is-active') || btn.getAttribute('aria-pressed') === 'true' || /remover|favorito/i.test(btn.getAttribute('aria-label')||'');
      ensureIcon(btn, active ? 'icon-star-filled.svg' : 'icon-star-outline.svg','seven-icon seven-action-icon');
    });
    document.querySelectorAll('[data-playlist-button],.playlist-button,.personal-playlist-add,#new-playlist-page-button').forEach((btn)=> ensureIcon(btn,'icon-playlist-add.svg','seven-icon seven-action-icon'));
    document.querySelectorAll('[data-delete-playlist],.personal-playlist-delete').forEach((btn)=> ensureIcon(btn,'icon-trash.svg','seven-icon seven-action-icon'));
    document.querySelectorAll('[data-remove-item],.personal-playlist-remove').forEach((btn)=> ensureIcon(btn,'icon-remove.svg','seven-icon seven-action-icon'));
    document.querySelectorAll('.personal-library-empty').forEach((box)=> ensureIcon(box,'icon-empty-playlist.svg','seven-icon seven-action-icon'));
  }

  function applyActionIcons(){
    const selectors = '.button-primary,.button-outline,.button-danger,.admin-toolbar a,.admin-toolbar button,.admin-list-actions a,.admin-list-actions button,.admin-form-actions a,.admin-form-actions button,.backup-modal button,.admin-modal button,.contact-form button,.account-form-actions button,#conta-login-button,#public-google-login-button';
    document.querySelectorAll(selectors).forEach((el) => {
      if(el.querySelector(':scope > .seven-icon')) return;
      const txt = cleanText(el);
      const found = actionIconByText.find(([rx]) => rx.test(txt));
      if(found) ensureIcon(el, found[1], 'seven-icon seven-action-icon');
    });
    document.querySelectorAll('#public-google-login-button, #conta-login-button').forEach((btn)=>{
      if(/google/i.test(cleanText(btn)) && !btn.querySelector(':scope > .seven-icon')) ensureIcon(btn,'logo-google.svg','seven-icon seven-action-icon');
    });
  }

  function applyAdminExtras(){
    document.querySelectorAll('.admin-public-link').forEach((a)=> ensureIcon(a,'icon-admin-view-site.svg','seven-icon seven-action-icon'));
    document.querySelectorAll('#admin-logout-button').forEach((btn)=> ensureIcon(btn,'icon-admin-logout.svg','seven-icon seven-action-icon'));
    document.querySelectorAll('.admin-card').forEach((card)=>{
      const txt = cleanText(card);
      if(card.querySelector(':scope > .admin-kpi-icon, :scope > .seven-icon')) return;
      const found = navIconByText.find(([rx]) => rx.test(txt));
      if(found) ensureIcon(card, found[1], 'seven-icon seven-action-icon');
    });
  }

  function applyAll(){
    if(applying) return;
    applying = true;
    try{
      updateLogos();
      updateThemeButtons();
      applyGlobalButtons();
      applyNavIcons();
      applyCifraControls();
      applyFavoritePlaylistIcons();
      applyActionIcons();
      applyAdminExtras();
    } finally { applying = false; }
  }

  function schedule(){
    clearTimeout(schedule._t);
    schedule._t = setTimeout(applyAll, 60);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyAll, {once:true});
  else applyAll();
  window.addEventListener('load', () => { applyAll(); setTimeout(applyAll, 300); setTimeout(applyAll, 1200); }, {once:true});
  try{
    new MutationObserver((mutations)=>{
      if(mutations.some(m => m.type === 'attributes' && m.attributeName === 'data-theme')) applyAll();
      else schedule();
    }).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    new MutationObserver(schedule).observe(document.body, {childList:true, subtree:true});
  }catch{}
})();
