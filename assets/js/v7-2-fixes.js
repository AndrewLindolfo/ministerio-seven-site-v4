/* Ministério Seven V7.2 — ajustes finos de hero, logo e auto-rolagem */
(function(){
  function isInteractive(target){
    return !!target.closest('button, a, input, select, textarea, label, [role="button"], .scroll-bubble-close');
  }

  function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function prepareBubble(bubble){
    if (!bubble || bubble.dataset.v72Prepared === '1') return;
    bubble.dataset.v72Prepared = '1';
    bubble.classList.add('v72-scroll-bubble-compact');

    if (!bubble.querySelector('.v72-scroll-drag-handle')) {
      const handle = document.createElement('span');
      handle.className = 'v72-scroll-drag-handle';
      handle.setAttribute('aria-hidden', 'true');
      handle.title = 'Arrastar painel';
      bubble.insertBefore(handle, bubble.firstChild);
    }

    bubble.querySelectorAll('input[type="range"], button, a, select, textarea').forEach((el) => {
      ['pointerdown','mousedown','touchstart'].forEach((eventName) => {
        el.addEventListener(eventName, (ev) => ev.stopPropagation(), { capture:false, passive:true });
      });
    });

    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let dragging = false;

    function onMove(ev){
      if (!dragging) return;
      const pointer = ev.touches ? ev.touches[0] : ev;
      const rect = bubble.getBoundingClientRect();
      const nextLeft = clamp(startLeft + pointer.clientX - startX, 8, window.innerWidth - rect.width - 8);
      const nextTop = clamp(startTop + pointer.clientY - startY, 8, window.innerHeight - rect.height - 8);
      bubble.classList.add('v72-positioned');
      bubble.style.setProperty('left', `${nextLeft}px`, 'important');
      bubble.style.setProperty('top', `${nextTop}px`, 'important');
      bubble.style.setProperty('right', 'auto', 'important');
      bubble.style.setProperty('bottom', 'auto', 'important');
      ev.preventDefault();
    }

    function onEnd(){
      if (!dragging) return;
      dragging = false;
      bubble.classList.remove('v72-dragging');
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      window.removeEventListener('touchmove', onMove, true);
      window.removeEventListener('touchend', onEnd, true);
    }

    bubble.addEventListener('pointerdown', (ev) => {
      if (isInteractive(ev.target)) return;
      const rect = bubble.getBoundingClientRect();
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      bubble.classList.add('v72-dragging');
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onEnd, true);
      ev.preventDefault();
    }, true);

    bubble.addEventListener('touchstart', (ev) => {
      if (isInteractive(ev.target)) return;
      const touch = ev.touches[0];
      if (!touch) return;
      const rect = bubble.getBoundingClientRect();
      dragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      bubble.classList.add('v72-dragging');
      window.addEventListener('touchmove', onMove, true);
      window.addEventListener('touchend', onEnd, true);
      ev.preventDefault();
    }, { capture:true, passive:false });
  }

  function compactAutoScrollBubbles(){
    const selectors = [
      '#scroll-bubble',
      '#musica-scroll-bubble',
      '.scroll-bubble',
      '.musica-scroll-bubble',
      '[class*="scroll-bubble"]',
      '[id*="scroll-bubble"]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(prepareBubble);
  }

  function fixAutoButton(){
    document.querySelectorAll('#scroll-panel-toggle, .scroll-panel-toggle-btn').forEach((btn) => {
      btn.setAttribute('title', 'Auto-rolagem');
      btn.setAttribute('aria-label', 'Auto-rolagem');
      btn.classList.add('v72-auto-btn-fixed');
    });
  }

  function tuneHomeHero(){
    const hero = document.querySelector('.home-page .hero-banner, .hero-banner');
    if (!hero) return;
    hero.classList.add('v72-home-hero-fixed');
  }

  function run(){
    document.body.classList.add('v7-layout-v72');
    compactAutoScrollBubbles();
    fixAutoButton();
    tuneHomeHero();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  window.addEventListener('load', () => setTimeout(run, 80));
  const observer = new MutationObserver(() => compactAutoScrollBubbles());
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
