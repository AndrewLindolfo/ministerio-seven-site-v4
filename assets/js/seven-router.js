/* Ministério Seven — navegação suave pública com cache inteligente
   V4: corrige ativo individual do submenu Downloads (Geral / Por Música). */
(function(){
  const VERSION = "2026-07-06-router-publico-4-downloads-submenu";
  const CACHE_PREFIX = "seven-router-cache:";
  const CACHE_TTL = 1000 * 60 * 30; // 30 minutos para estrutura HTML; conteúdo Firebase continua sendo buscado pelos scripts.
  const memoryCache = new Map();
  let navigating = false;
  let importNonce = 0;

  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  function isAdminPath(url){ return /\/admin(\/|$)/i.test(url.pathname); }
  function isHtmlPath(url){
    const name = url.pathname.split('/').pop() || 'index.html';
    return name === '' || name.endsWith('.html') || !name.includes('.');
  }
  function sameOrigin(url){ return url.origin === location.origin; }
  function normalKey(url){
    const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    return file + url.search;
  }
  function canHandleLink(a){
    if(!a || a.target || a.hasAttribute('download')) return false;
    const href = a.getAttribute('href') || '';
    if(!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;
    let url;
    try{ url = new URL(href, location.href); }catch{ return false; }
    if(!sameOrigin(url) || isAdminPath(url) || !isHtmlPath(url)) return false;
    return true;
  }

  function exactPageFromUrl(url){
    let file = (url.pathname.split('/').pop() || 'index.html').toLowerCase();
    if(file === '' || file === '/') file = 'index.html';
    return file;
  }

  function mainPageFromExact(file){
    const map = {
      'musica.html':'musicas.html',
      'musica-vocal.html':'musicas-vocal.html',
      'cifra.html':'cifras.html',
      'downloads-por-musica.html':'downloads.html'
    };
    return map[file] || file;
  }

  function canonicalPageFromUrl(url){
    return mainPageFromExact(exactPageFromUrl(url));
  }

  function isDownloadsExact(file){
    return file === 'downloads.html' || file === 'downloads-por-musica.html';
  }

  function setProgress(active){
    document.body.classList.toggle('seven-router-loading', !!active);
    let bar = document.getElementById('seven-router-progress');
    if(active && !bar){
      bar = document.createElement('div');
      bar.id = 'seven-router-progress';
      document.body.appendChild(bar);
    }
    if(bar) bar.classList.toggle('is-active', !!active);
  }

  function readStored(key){
    try{
      const raw = sessionStorage.getItem(CACHE_PREFIX + key);
      if(!raw) return null;
      const item = JSON.parse(raw);
      if(item?.version !== VERSION) return null;
      if(!item.html || Date.now() - Number(item.time || 0) > CACHE_TTL) return null;
      return item.html;
    }catch{ return null; }
  }

  function writeStored(key, html){
    memoryCache.set(key, html);
    try{
      sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({version:VERSION, time:Date.now(), html}));
    }catch{}
  }

  function getCached(url){
    const key = normalKey(url);
    return memoryCache.get(key) || readStored(key);
  }

  async function fetchPage(url){
    const response = await fetch(url.href, {
      method:'GET',
      cache:'no-cache',
      credentials:'same-origin',
      headers:{'X-Seven-Router':'1'}
    });
    if(!response.ok) throw new Error('HTTP ' + response.status);
    const html = await response.text();
    writeStored(normalKey(url), html);
    return html;
  }

  function parsePage(html){
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const main = doc.querySelector('main');
    if(!main) throw new Error('Página sem <main>.');
    const title = doc.querySelector('title')?.textContent || document.title;
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const scripts = Array.from(doc.querySelectorAll('script[type="module"][src]'))
      .map(s => s.getAttribute('src'))
      .filter(Boolean)
      .filter(src => !/\/app\.js(\?|$)/.test(src) && !/seven-router\.js(\?|$)/.test(src));
    return {doc, main, title, description, scripts};
  }

  function updateHead(parsed){
    document.title = parsed.title;
    if(parsed.description){
      let meta = document.querySelector('meta[name="description"]');
      if(!meta){
        meta = document.createElement('meta');
        meta.setAttribute('name','description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', parsed.description);
    }
  }

  function resolveLinkExactPage(a, currentUrl){
    const rawHref = (a.getAttribute('href') || '').trim();
    if(!rawHref || rawHref === '#' || rawHref.startsWith('#')) return '';
    try{ return exactPageFromUrl(new URL(rawHref, currentUrl.href)); }
    catch{ return ''; }
  }

  function isDownloadsGroupLink(a){
    const rawHref = (a.getAttribute('href') || '').trim();
    const label = (a.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
    return !!a.closest('.downloads-nav-group') && !a.closest('.downloads-submenu,.mobile-downloads-submenu') ||
      ((!rawHref || rawHref === '#' || rawHref.startsWith('#')) && label.includes('download'));
  }

  function isDownloadsSubmenuLink(a){
    return !!a.closest('.downloads-submenu,.mobile-downloads-submenu,[data-downloads-submenu]');
  }

  function resetActiveElement(el){
    el.classList.remove('is-active','active','current','current-page','nav-active','router-active','selected','is-current');
    el.removeAttribute('aria-current');
    el.removeAttribute('data-active');
    el.dataset.sevenCurrent = 'false';
  }

  function setActiveElement(el){
    el.classList.add('is-active','active');
    el.setAttribute('aria-current','page');
    el.dataset.sevenCurrent = 'true';
  }

  function updateActiveMenu(url){
    const exactTarget = exactPageFromUrl(url);
    const mainTarget = mainPageFromExact(exactTarget);
    const currentKey = mainTarget.replace(/\.html$/,'');
    document.documentElement.dataset.sevenCurrentPage = currentKey;
    document.documentElement.dataset.sevenCurrentExactPage = exactTarget.replace(/\.html$/,'');
    document.body.dataset.sevenCurrentPage = currentKey;
    document.body.dataset.sevenCurrentExactPage = exactTarget.replace(/\.html$/,'');

    // Fecha submenus presos ao navegar para outra página.
    document.querySelectorAll('[data-downloads-submenu], .downloads-submenu, .mobile-downloads-submenu').forEach(menu => menu.classList.add('hidden'));
    document.querySelectorAll('.downloads-nav-group > a, .mobile-menu-panel [data-submenu-toggle="1"]').forEach(item => item.setAttribute('aria-expanded','false'));
    document.querySelectorAll('.downloads-nav-group').forEach(group => {
      group.classList.remove('is-active','active','current','current-page','nav-active','router-active','selected','is-current');
      group.removeAttribute('aria-current');
      group.dataset.sevenCurrent = 'false';
    });

    const navLinks = document.querySelectorAll('.site-header a[href], .site-nav a[href], .header-nav a[href], .main-nav a[href], .mobile-menu a[href], .mobile-menu-panel a[href], .downloads-submenu a[href], .mobile-downloads-submenu a[href], [data-downloads-submenu] a[href]');
    navLinks.forEach(a => {
      resetActiveElement(a);
      let active = false;

      if(isDownloadsGroupLink(a)){
        active = isDownloadsExact(exactTarget);
      }else{
        const exactLink = resolveLinkExactPage(a, url);
        if(exactLink){
          if(isDownloadsSubmenuLink(a)){
            // Aqui precisa ser exato: Geral só em downloads.html; Por Música só em downloads-por-musica.html.
            active = exactLink === exactTarget;
          }else{
            active = mainPageFromExact(exactLink) === mainTarget;
          }
        }
      }

      if(active){
        setActiveElement(a);
        const group = a.closest('.downloads-nav-group');
        if(group && isDownloadsExact(exactTarget)){
          group.classList.add('is-active','active');
          group.dataset.sevenCurrent = 'true';
        }
      }
    });
  }

  function enforceActiveMenu(url){
    updateActiveMenu(url);
    requestAnimationFrame(() => updateActiveMenu(url));
    setTimeout(() => updateActiveMenu(url), 80);
    setTimeout(() => updateActiveMenu(url), 260);
    setTimeout(() => updateActiveMenu(url), 700);
  }

  function closeOverlays(){
    document.getElementById('mobile-menu')?.setAttribute('aria-hidden','true');
    document.getElementById('mobile-menu')?.classList.remove('active','open','is-open');
    document.body.classList.remove('menu-open','mobile-menu-open','search-open');
    document.getElementById('search-modal')?.classList.add('hidden');
    document.getElementById('search-modal')?.setAttribute('aria-hidden','true');
    document.querySelectorAll('[data-downloads-submenu], .downloads-submenu, .mobile-downloads-submenu').forEach(menu => menu.classList.add('hidden'));
    document.querySelectorAll('.downloads-nav-group > a, .mobile-menu-panel [data-submenu-toggle="1"]').forEach(item => item.setAttribute('aria-expanded','false'));
  }

  async function runPageScripts(scripts, destinationUrl){
    if(!scripts.length) return;
    const captured = [];
    const originalAdd = document.addEventListener.bind(document);
    document.addEventListener = function(type, listener, options){
      if(type === 'DOMContentLoaded' && typeof listener === 'function'){
        captured.push({listener, options});
        return;
      }
      return originalAdd(type, listener, options);
    };
    try{
      for(const src of scripts){
        const moduleUrl = new URL(src, destinationUrl.href);
        moduleUrl.searchParams.set('__seven_router_run', String(++importNonce));
        await import(moduleUrl.href);
      }
    } finally {
      document.addEventListener = originalAdd;
    }
    const evt = new Event('DOMContentLoaded', {bubbles:false, cancelable:false});
    for(const item of captured){
      try{ item.listener.call(document, evt); }catch(error){ console.error('Erro ao iniciar script da página:', error); }
    }
  }

  async function swapTo(url, html, push){
    const parsed = parsePage(html);
    try{ window.dispatchEvent(new Event('beforeunload')); }catch{}

    const currentMain = document.querySelector('main');
    if(!currentMain) { location.href = url.href; return; }
    updateHead(parsed);
    closeOverlays();
    currentMain.replaceWith(parsed.main);
    if(push) history.pushState({sevenRouter:true, url:url.href}, '', url.href);
    enforceActiveMenu(url);
    window.scrollTo({top:0, left:0, behavior:'instant' in window ? 'instant' : 'auto'});
    document.dispatchEvent(new CustomEvent('seven:page-swapped', {detail:{url:url.href}}));
    await runPageScripts(parsed.scripts, url);
    // Alguns scripts globais antigos reativam links depois do carregamento. Corrige de novo no final.
    enforceActiveMenu(url);
    document.dispatchEvent(new CustomEvent('seven:page-ready', {detail:{url:url.href}}));
  }

  async function navigate(url, push=true){
    if(navigating) return;
    if(normalKey(url) === normalKey(new URL(location.href))) {
      enforceActiveMenu(url);
      return;
    }
    navigating = true;
    setProgress(true);
    try{
      const cached = getCached(url);
      if(cached){
        await swapTo(url, cached, push);
        fetchPage(url).catch(()=>{});
      }else{
        const html = await fetchPage(url);
        await swapTo(url, html, push);
      }
    }catch(error){
      console.warn('Navegação suave falhou; carregando página normal.', error);
      location.href = url.href;
    }finally{
      navigating = false;
      setProgress(false);
    }
  }

  function prefetch(url){
    if(getCached(url)) return;
    fetchPage(url).catch(()=>{});
  }

  ready(() => {
    document.documentElement.classList.add('seven-router-enabled');
    writeStored(normalKey(new URL(location.href)), document.documentElement.outerHTML);
    enforceActiveMenu(new URL(location.href));

    document.addEventListener('click', (event) => {
      if(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const a = event.target.closest?.('a[href]');
      if(!canHandleLink(a)) return;
      const url = new URL(a.getAttribute('href'), location.href);
      event.preventDefault();
      navigate(url, true);
    });

    document.addEventListener('mouseover', (event) => {
      const a = event.target.closest?.('a[href]');
      if(!canHandleLink(a)) return;
      prefetch(new URL(a.getAttribute('href'), location.href));
    }, {passive:true});

    document.addEventListener('touchstart', (event) => {
      const a = event.target.closest?.('a[href]');
      if(!canHandleLink(a)) return;
      prefetch(new URL(a.getAttribute('href'), location.href));
    }, {passive:true});

    window.addEventListener('popstate', () => navigate(new URL(location.href), false));
    window.addEventListener('pageshow', () => enforceActiveMenu(new URL(location.href)));
  });
})();
