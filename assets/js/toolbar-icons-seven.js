/* Ministério Seven — ícones oficiais nas barras de ferramentas de música/cifra V2 */
(function(){
  const scriptUrl = document.currentScript?.src || '';
  function asset(name){
    try { return new URL(`../icons/seven-toolbar/${name}`, scriptUrl).href; }
    catch { return `assets/icons/seven-toolbar/${name}`; }
  }

  function iconSpan(name){
    const url = asset(name);
    return `<span class="ms-tool-icon" aria-hidden="true" style="-webkit-mask-image:url('${url}');mask-image:url('${url}')"></span>`;
  }

  function setButton(button, icon, label, title){
    if(!button) return;
    const labelText = label || '';
    button.dataset.msToolbarIcon = icon;
    button.classList.add('ms-toolbar-clean');
    button.innerHTML = `${iconSpan(icon)}${labelText ? `<span class="ms-tool-label">${labelText}</span>` : ''}`;
    if(title){
      button.setAttribute('title', title);
      button.setAttribute('aria-label', title);
    }
  }

  function pressed(el){
    if(!el) return false;
    const aria = String(el.getAttribute('aria-pressed') || '').toLowerCase();
    const state = String(el.dataset.state || '').toLowerCase();
    const text = String(el.textContent || '');
    return aria === 'true' || state === 'pause' || /pause|pausar|⏸|❚❚|Ⅱ/i.test(text) || el.classList.contains('is-running') || el.classList.contains('is-active') || el.classList.contains('active');
  }

  function fullscreenActive(){
    return !!document.fullscreenElement || document.documentElement.classList.contains('is-fullscreen') || document.body.classList.contains('is-fullscreen');
  }

  function applyCifraToolbar(){
    setButton(document.getElementById('transpose-down'), 'icon-transpose-down.svg', '', 'Tom menos');
    setButton(document.getElementById('transpose-up'), 'icon-transpose-up.svg', '', 'Tom mais');
    setButton(document.getElementById('font-down'), 'icon-font-minus.svg', '', 'Fonte menor');
    setButton(document.getElementById('font-up'), 'icon-font-plus.svg', '', 'Fonte maior');
    setButton(document.getElementById('focus-toggle'), 'icon-eye.svg', '', 'Modo foco');

    const fullscreen = document.getElementById('fullscreen-toggle');
    if(fullscreen){
      const active = fullscreenActive();
      setButton(fullscreen, active ? 'icon-fullscreen-exit.svg' : 'icon-fullscreen.svg', '', active ? 'Sair da tela cheia' : 'Tela cheia');
    }

    setButton(document.getElementById('scroll-panel-toggle'), 'icon-auto-scroll.svg', '', 'Auto-rolagem');

    const metronomeFloating = document.getElementById('mini-metronome-floating-toggle');
    if(metronomeFloating){
      setButton(metronomeFloating, pressed(metronomeFloating) ? 'icon-pause.svg' : 'icon-metronome.svg', '', 'Iniciar ou pausar metrônomo');
    }

    const miniMetronome = document.getElementById('cifra-mini-metronome-toggle');
    if(miniMetronome){
      setButton(miniMetronome, pressed(miniMetronome) ? 'icon-pause.svg' : 'icon-play.svg', '', pressed(miniMetronome) ? 'Pausar metrônomo' : 'Iniciar metrônomo');
    }

    const pdf = document.getElementById('pdf-toggle');
    if(pdf) setButton(pdf, 'icon-pdf-download.svg', '', 'Baixar PDF');
  }

  function applyMusicaToolbar(){
    // Página de música/música vocal usa IDs próprios criados pelo módulo musica-controls.js.
    setButton(document.getElementById('musica-font-down'), 'icon-font-minus.svg', '', 'Fonte menor');
    setButton(document.getElementById('musica-font-up'), 'icon-font-plus.svg', '', 'Fonte maior');
    setButton(document.getElementById('musica-focus-toggle'), 'icon-eye.svg', '', 'Modo foco');

    const fullscreen = document.getElementById('musica-fullscreen-toggle');
    if(fullscreen){
      const active = fullscreenActive();
      setButton(fullscreen, active ? 'icon-fullscreen-exit.svg' : 'icon-fullscreen.svg', '', active ? 'Sair da tela cheia' : 'Tela cheia');
    }

    setButton(document.getElementById('musica-scroll-panel-toggle'), 'icon-auto-scroll.svg', '', 'Auto-rolagem');
    setButton(document.getElementById('musica-pdf-toggle'), 'icon-pdf-download.svg', '', 'Baixar PDF');

    setButton(document.getElementById('musica-scroll-bubble-close'), 'icon-close.svg', '', 'Fechar auto-rolagem');
    const scrollToggle = document.getElementById('musica-scroll-toggle');
    if(scrollToggle){
      setButton(scrollToggle, pressed(scrollToggle) ? 'icon-pause.svg' : 'icon-play.svg', '', pressed(scrollToggle) ? 'Pausar rolagem' : 'Iniciar rolagem');
    }
  }

  function applyScrollBubble(){
    setButton(document.getElementById('scroll-bubble-close'), 'icon-close.svg', '', 'Fechar auto-rolagem');
    setButton(document.getElementById('scroll-slower'), 'icon-minus.svg', '', 'Diminuir velocidade');

    const scrollToggle = document.getElementById('scroll-toggle');
    if(scrollToggle){
      setButton(scrollToggle, pressed(scrollToggle) ? 'icon-pause.svg' : 'icon-play.svg', '', pressed(scrollToggle) ? 'Pausar rolagem' : 'Iniciar rolagem');
    }

    setButton(document.getElementById('scroll-faster'), 'icon-plus.svg', '', 'Aumentar velocidade');

    document.querySelectorAll('.v74-scroll-panel button').forEach((btn) => {
      const raw = `${btn.id || ''} ${btn.className || ''} ${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''} ${btn.textContent || ''}`.toLowerCase();
      if(/close|fechar|×|x/.test(raw)) setButton(btn, 'icon-close.svg', '', 'Fechar auto-rolagem');
      else if(/slower|menos|diminuir|-/.test(raw)) setButton(btn, 'icon-minus.svg', '', 'Diminuir velocidade');
      else if(/faster|mais|aumentar|\+/.test(raw)) setButton(btn, 'icon-plus.svg', '', 'Aumentar velocidade');
      else if(/play|pause|iniciar|pausar|rolagem/.test(raw)) setButton(btn, pressed(btn) ? 'icon-pause.svg' : 'icon-play.svg', '', pressed(btn) ? 'Pausar rolagem' : 'Iniciar rolagem');
    });
  }

  function applyToolbarIcons(){
    applyCifraToolbar();
    applyMusicaToolbar();
    applyScrollBubble();
  }

  let scheduled = false;
  function scheduleApply(){
    if(scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scheduled = false;
        applyToolbarIcons();
      });
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleApply);
  else scheduleApply();

  window.addEventListener('load', scheduleApply);
  document.addEventListener('fullscreenchange', () => { setTimeout(scheduleApply, 30); setTimeout(scheduleApply, 220); });
  document.addEventListener('click', (event) => {
    if(event.target.closest('#fullscreen-toggle,#musica-fullscreen-toggle,#scroll-toggle,#musica-scroll-toggle,#mini-metronome-floating-toggle,#cifra-mini-metronome-toggle,.v74-scroll-panel button,#scroll-panel-toggle,#musica-scroll-panel-toggle')){
      setTimeout(scheduleApply, 60);
      setTimeout(scheduleApply, 240);
    }
  }, true);

  try{
    const observer = new MutationObserver((mutations) => {
      if(mutations.some(m => Array.from(m.addedNodes || []).some(n => n.nodeType === 1 && (
        n.matches?.('.cifra-top-controls,.musica-top-controls,.v74-scroll-panel,#scroll-bubble,#musica-scroll-bubble') ||
        n.querySelector?.('.cifra-top-controls,.musica-top-controls,.v74-scroll-panel,#scroll-bubble,#musica-scroll-bubble')
      )))){
        scheduleApply();
      }
    });
    observer.observe(document.body || document.documentElement, {childList:true, subtree:true});
  }catch{}
})();
