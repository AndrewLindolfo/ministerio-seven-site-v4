/* Ministério Seven V7.1 — correções de layout do redesign */
(function(){
  const pageName = (window.location.pathname || '').split('/').pop() || 'index.html';
  const pageClass = `v7-page-${pageName.replace(/\.html$/,'').replace(/[^a-z0-9-]/gi,'-')}`;

  function direct(section, selector){
    try { return section.querySelector(`:scope > ${selector}`); }
    catch { return section.querySelector(selector); }
  }

  function firstDirect(section, selectors){
    for (const selector of selectors){
      const found = direct(section, selector);
      if (found) return found;
    }
    return null;
  }

  function wrapPageHero(){
    const main = document.querySelector('main');
    if (!main || main.classList.contains('home-page')) return;

    const section = direct(main, 'section.container') || document.querySelector('main > section.container');
    if (!section || direct(section, '.v7-page-hero-v71')) return;

    const h1 = firstDirect(section, ['h1', '.ferramentas-head']);
    if (!h1) return;

    const insertBefore = direct(section, '.v7-page-kicker') || h1;
    const hero = document.createElement('div');
    hero.className = 'v7-page-hero-v71';
    section.insertBefore(hero, insertBefore);

    const kicker = direct(section, '.v7-page-kicker');
    const title = direct(section, 'h1') || h1.querySelector?.('h1') || h1;
    const desc = direct(section, '.v7-page-description');
    const pageSubtitle = firstDirect(section, ['.page-subtitle', '.agenda-subtitle', '.ferramentas-subtitle']);
    const meta = direct(section, '.meta-line');
    const cross = direct(section, '.page-cross-link');

    [kicker, title, desc, meta, cross].forEach((node) => {
      if (node && node.parentNode === section) hero.appendChild(node);
    });

    if (pageSubtitle && pageSubtitle.parentNode === section) {
      if (desc) {
        pageSubtitle.classList.add('v7-hidden-original-subtitle');
      } else {
        hero.appendChild(pageSubtitle);
      }
    }

    if (h1.classList && h1.classList.contains('ferramentas-head') && h1.parentNode === section) {
      hero.appendChild(h1);
    }
  }

  function normalizeToolbars(){
    const labels = {
      'transpose-down': 'Diminuir tom',
      'transpose-up': 'Aumentar tom',
      'font-down': 'Diminuir fonte',
      'font-up': 'Aumentar fonte',
      'focus-toggle': 'Modo foco',
      'fullscreen-toggle': 'Tela cheia',
      'scroll-panel-toggle': 'Auto-rolagem',
      'mini-metronome-floating-toggle': 'Metrônomo',
      'pdf-toggle': 'Baixar PDF'
    };

    Object.entries(labels).forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('title', label);
      el.setAttribute('aria-label', label);
      el.classList.add('v71-tool-fixed');
    });

    document.querySelectorAll('.cifra-top-controls, .musica-top-controls, .vocal-top-controls, .lyrics-top-controls').forEach((bar) => {
      bar.classList.add('v71-toolbar-fixed');
    });
  }

  function simplifyEmptyText(container, title, subtitle){
    if (!container || container.dataset.v71EmptyFixed === '1') return;
    const hasRealChildren = Array.from(container.children || []).some((child) => !child.classList.contains('hidden'));
    const text = (container.textContent || '').trim();
    if (hasRealChildren || !text || !/nenhum|nenhuma|encontrad|disponível|configurada/i.test(text)) return;
    container.dataset.v71EmptyFixed = '1';
    container.innerHTML = `<div class="v7-empty-state"><strong>${title}</strong><small>${subtitle || text}</small></div>`;
  }

  function enhanceEmptyStates(){
    simplifyEmptyText(document.getElementById('albuns-grid'), 'Nenhum álbum disponível.', 'Quando houver álbuns cadastrados, eles aparecerão aqui.');
    simplifyEmptyText(document.getElementById('downloads-grid'), 'Nenhum download disponível.', 'Quando houver materiais cadastrados, eles aparecerão aqui.');
    simplifyEmptyText(document.getElementById('downloads-music-lista-alfabetica'), 'Nenhum download por música encontrado.', 'Use a busca ou cadastre materiais vinculados às músicas.');
  }

  function observeDynamicEmptyStates(){
    const ids = ['albuns-grid', 'downloads-grid', 'downloads-music-lista-alfabetica'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.v71Observed === '1') return;
      el.dataset.v71Observed = '1';
      const observer = new MutationObserver(() => {
        el.dataset.v71EmptyFixed = '0';
        setTimeout(enhanceEmptyStates, 30);
      });
      observer.observe(el, { childList: true, subtree: false, characterData: true });
    });
  }

  function run(){
    document.body.classList.add('v7-layout-v71', pageClass);
    wrapPageHero();
    normalizeToolbars();
    enhanceEmptyStates();
    observeDynamicEmptyStates();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  window.addEventListener('load', () => setTimeout(run, 120));
})();
