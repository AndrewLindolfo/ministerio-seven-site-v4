/* Ministério Seven — ícones de conteúdo sem duplicidade
   Corrige Músicas, Músicas Vocal, Cifras e páginas internas. */
(function(){
  const scriptUrl = document.currentScript?.src || import.meta?.url || '';
  const iconBase = (() => {
    try { return new URL('../icons/seven-content/', scriptUrl).href; }
    catch { return 'assets/icons/seven-content/'; }
  })();
  const icon = (name) => `${iconBase}${name}`;
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  let running = false;

  function makeIcon(name, cls=''){
    const span = document.createElement('span');
    span.className = `seven-svg-icon ${cls}`.trim();
    span.setAttribute('aria-hidden','true');
    span.style.setProperty('--seven-icon-url', `url("${icon(name)}")`);
    return span;
  }

  function iconBox(name, cls=''){
    const box = document.createElement('span');
    box.className = cls;
    box.dataset.sevenIconName = name;
    box.setAttribute('aria-hidden','true');
    box.appendChild(makeIcon(name));
    return box;
  }

  function pageKind(){
    if(path.includes('musica-vocal') || path.includes('musicas-vocal')) return 'vocal';
    if(path.includes('cifra') || path.includes('cifras')) return 'cifra';
    if(path.includes('musica') || path.includes('musicas')) return 'musica';
    return '';
  }

  function iconForKind(kind){
    if(kind === 'vocal') return 'icon-microphone.svg';
    if(kind === 'cifra') return 'icon-chord-sheet.svg';
    return 'icon-music.svg';
  }

  function iconForHomeCard(card){
    const href = String(card.getAttribute('href') || card.href || '').toLowerCase();
    const titleEl = card.querySelector('h2,h3,strong,.card-title,.title');
    const title = String(titleEl?.textContent || card.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
    if(href.includes('ferramentas') || /^ferramentas\b/.test(title)) return 'icon-tools.svg';
    if(href.includes('agenda') || /^agenda\b/.test(title)) return 'icon-calendar.svg';
    if(href.includes('cifra') || /^cifras?\b/.test(title)) return 'icon-chord.svg';
    if(href.includes('musica') || /^m[uú]sicas?\b/.test(title)) return 'icon-music.svg';
    return '';
  }

  function resetBox(box, iconName){
    if(!box) return;
    if(box.dataset.sevenIconName === iconName && box.querySelector('.seven-svg-icon')) return;
    box.innerHTML = '';
    box.dataset.sevenIconName = iconName;
    box.appendChild(makeIcon(iconName));
  }

  function enhanceListIcons(){
    const kind = pageKind();
    if(!kind) return;
    const iconName = iconForKind(kind);

    document.querySelectorAll('.music-list-item').forEach((item) => {
      const link = item.querySelector('.music-list-link, a[href*="musica"], a[href*="cifra"]');
      if(!link) return;

      item.classList.add('seven-has-leading-icon');
      const icons = Array.from(item.querySelectorAll(':scope > .seven-list-leading-icon'));
      let leading = icons[0];
      icons.slice(1).forEach((el) => el.remove());

      if(!leading){
        leading = iconBox(iconName, 'seven-list-leading-icon');
        item.insertBefore(leading, item.firstChild);
      }else{
        resetBox(leading, iconName);
        if(item.firstElementChild !== leading) item.insertBefore(leading, item.firstChild);
      }

      // Remove qualquer ícone decorativo antigo que esteja fisicamente antes do link.
      let node = leading.nextElementSibling;
      while(node && node !== link && !node.contains(link)){
        const next = node.nextElementSibling;
        const cls = String(node.className || '');
        const text = (node.textContent || '').replace(/\s+/g,'').trim();
        const isPersonal = node.matches?.('.personal-action-group,[data-favorite-button],[data-playlist-button],button,a,input,label');
        const looksOldIcon = !isPersonal && (
          /(^|\s)(icon|.*-icon|music-icon|song-icon|item-icon|card-icon|letter-icon|badge-icon|symbol|glyph)(\s|$)/i.test(cls) ||
          (text.length > 0 && text.length <= 3 && !node.querySelector('button,a,input'))
        );
        if(looksOldIcon) node.remove();
        node = next;
      }
    });
  }

  function enhanceTitleIcon(){
    const kind = pageKind();
    if(!kind) return;
    const title = document.getElementById('musica-titulo') || document.getElementById('cifra-titulo');
    if(!title) return;

    let row = document.getElementById('musica-title-row') || document.getElementById('cifra-title-row') || title.closest('.page-title-row');
    if(!row){
      row = document.createElement('div');
      row.className = 'page-title-row';
      row.id = kind === 'cifra' ? 'cifra-title-row' : 'musica-title-row';
      title.insertAdjacentElement('beforebegin', row);
      row.appendChild(title);
    }

    const section = title.closest('section.container') || title.closest('main') || document.body;
    const allTitleIcons = Array.from(section.querySelectorAll('.seven-page-title-icon'));
    const correctInRow = allTitleIcons.filter((el) => el.parentElement === row);
    const outside = allTitleIcons.filter((el) => el.parentElement !== row);
    outside.forEach((el) => el.remove());

    let box = correctInRow[0];
    correctInRow.slice(1).forEach((el) => el.remove());

    const iconName = iconForKind(kind);
    if(!box){
      box = iconBox(iconName, 'seven-page-title-icon');
      row.insertBefore(box, row.firstChild);
    }else{
      resetBox(box, iconName);
      if(row.firstElementChild !== box) row.insertBefore(box, row.firstChild);
    }

    row.classList.add('seven-title-icon-normalized');
  }

  function replaceTextIconInside(anchor, iconName, label){
    if(!anchor) return;
    anchor.querySelectorAll('.seven-link-inline-icon').forEach((el, idx) => { if(idx > 0) el.remove(); });
    const oldSpan = anchor.querySelector('span[aria-hidden="true"]:not(.seven-svg-icon):not(.seven-link-inline-icon)');
    if(oldSpan) oldSpan.remove();
    let ic = anchor.querySelector('.seven-link-inline-icon');
    if(!ic){
      ic = makeIcon(iconName, 'seven-link-inline-icon');
      if(label === 'before') anchor.insertBefore(ic, anchor.firstChild);
      else anchor.appendChild(ic);
    }else{
      ic.style.setProperty('--seven-icon-url', `url("${icon(iconName)}")`);
    }
  }

  function enhanceCrossLinks(){
    replaceTextIconInside(document.querySelector('.v7-hero-actions a.secondary[href*="cifra"]'), 'icon-chord-sheet.svg');
    replaceTextIconInside(document.getElementById('ver-cifra-link'), 'icon-chord-sheet.svg', 'before');
    replaceTextIconInside(document.getElementById('ver-letra-link'), 'icon-lyrics.svg', 'before');
  }

  function enhanceHomeCards(){
    document.querySelectorAll('.v7-home-quick-card').forEach((card) => {
      const iconName = iconForHomeCard(card);
      if(!iconName) return;
      let holder = card.querySelector(':scope > .icon');
      if(!holder){
        holder = document.createElement('span');
        holder.className = 'icon';
        card.insertBefore(holder, card.firstChild);
      }
      if(holder.dataset.sevenHomeIcon !== iconName || !holder.querySelector('.seven-svg-icon')){
        holder.textContent = '';
        holder.innerHTML = '';
        holder.appendChild(makeIcon(iconName));
        holder.dataset.sevenHomeIcon = iconName;
      }
    });
  }

  function enhanceToolCards(){
    const tools = [
      ['tool-card-afinador', 'icon-tuner.svg'],
      ['tool-card-metronomo', 'icon-metronome.svg']
    ];
    tools.forEach(([id, iconName]) => {
      const card = document.getElementById(id);
      if(!card) return;
      const h2 = card.querySelector('h2');
      if(!h2) return;
      let wrap = h2.closest('.seven-tool-title-wrap');
      if(!wrap){
        wrap = document.createElement('div');
        wrap.className = 'seven-tool-title-wrap';
        h2.insertAdjacentElement('beforebegin', wrap);
        wrap.appendChild(h2);
      }
      let iconHolder = wrap.querySelector(':scope > .seven-tool-title-icon');
      if(!iconHolder){
        iconHolder = iconBox(iconName, 'seven-tool-title-icon');
        wrap.insertBefore(iconHolder, h2);
      }else{
        resetBox(iconHolder, iconName);
      }
    });
  }

  function run(){
    if(running) return;
    running = true;
    try{
      enhanceListIcons();
      enhanceTitleIcon();
      enhanceCrossLinks();
      enhanceHomeCards();
      enhanceToolCards();
    }finally{
      running = false;
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  window.addEventListener('load', () => { run(); setTimeout(run, 250); setTimeout(run, 900); });

  try{
    let pending = false;
    const obs = new MutationObserver(() => {
      if(pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; run(); });
    });
    obs.observe(document.body, { childList:true, subtree:true });
  }catch{}
})();
