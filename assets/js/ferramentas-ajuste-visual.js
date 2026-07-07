
/* Ministério Seven V4 — Ajuste visual Afinador/Metrônomo
   Não altera a lógica do afinador/metrônomo; apenas corrige texto/ícones/estado visual. */
(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function isToolsPage(){ return !!qs('.ferramentas-page'); }

  function applyToolVisualFixes(){
    if(!isToolsPage()) return;
    qsa('.tool-card').forEach(card => {
      const tool = card.dataset.tool || '';
      const expand = qs('.tool-expand-btn', card);
      const body = qs('.tool-body', card);
      const fullscreen = qs('.tool-fullscreen-btn', card);
      const focus = qs('.tool-focus-btn', card);

      // Remove caracteres antigos/emoji visíveis nos botões de ícone.
      if(focus){ focus.textContent = ''; focus.title = 'Modo foco'; focus.setAttribute('aria-label','Modo foco'); }
      if(fullscreen){ fullscreen.textContent = ''; fullscreen.title = fullscreen.classList.contains('is-active') ? 'Sair da tela cheia' : 'Tela cheia'; fullscreen.setAttribute('aria-label','Tela cheia'); }

      // O botão principal acompanha o estado real do corpo da ferramenta.
      if(expand && body){
        const opened = !body.classList.contains('hidden');
        expand.textContent = opened ? 'Fechar' : 'Abrir';
        expand.setAttribute('aria-expanded', opened ? 'true' : 'false');
        expand.setAttribute('aria-label', `${opened ? 'Fechar' : 'Abrir'} ${tool === 'metronomo' ? 'metrônomo' : 'afinador'}`);
      }

      // Esconde botões antigos de fechar dentro do corpo para não duplicar.
      qsa('.tool-inline-actions .tool-collapse-btn', card).forEach(btn => {
        btn.setAttribute('aria-hidden','true');
        btn.tabIndex = -1;
      });
    });
  }

  function patchListeners(){
    if(!isToolsPage()) return;
    qsa('.tool-expand-btn,.tool-collapse-btn,.tool-focus-btn,.tool-fullscreen-btn').forEach(btn => {
      if(btn.dataset.sevenToolsVisualBound === '1') return;
      btn.dataset.sevenToolsVisualBound = '1';
      btn.addEventListener('click', () => setTimeout(applyToolVisualFixes, 20));
    });
    document.addEventListener('fullscreenchange', () => setTimeout(applyToolVisualFixes, 20));
  }

  function init(){
    applyToolVisualFixes();
    patchListeners();
    setTimeout(applyToolVisualFixes, 200);
    setTimeout(applyToolVisualFixes, 700);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
  document.addEventListener('seven:page-ready', init);
  document.addEventListener('seven:page-swapped', () => setTimeout(init, 40));
})();
