/* Ministério Seven V4 — Ferramentas limpo e estável */
(function(){
  let cleanupFns = [];
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function safeCleanup(){
    cleanupFns.forEach((fn) => { try{ fn(); }catch{} });
    cleanupFns = [];
    document.body.classList.remove('tools-focus-mode');
  }

  function setIcon(button, name){
    if(!button) return;
    button.innerHTML = `<span class="tool-svg-icon ${name}" aria-hidden="true"></span>`;
  }

  function fixStaticTexts(root = document){
    const title = qs('[data-tool="metronome"] .tool-title-line h2', root);
    if(title) title.textContent = 'Metr\u00f4nomo';
    const meterDesc = qs('[data-tool="metronome"] .tool-description', root);
    if(meterDesc) meterDesc.textContent = 'Controle o tempo do ensaio com BPM ajust\u00e1vel, compasso e pulso visual com primeira batida destacada.';
    const tunerDesc = qs('[data-tool="tuner"] .tool-description', root);
    if(tunerDesc) tunerDesc.textContent = 'Use o microfone do aparelho para detectar notas, frequ\u00eancia em Hz e afinar qualquer instrumento cromaticamente.';
    const refTitle = qs('.tuner-reference strong', root);
    if(refTitle) refTitle.textContent = 'Afina\u00e7\u00f5es comuns';
    const minus = qs('#metronome-minus', root);
    const plus = qs('#metronome-plus', root);
    if(minus) minus.textContent = '\u2212';
    if(plus) plus.textContent = '+';
  }

  function removeDuplicateTitleIcons(card){
    qsa('.tool-title-line', card).forEach((line) => {
      const icons = qsa('.tool-round-icon', line);
      icons.forEach((icon, index) => { if(index > 0) icon.remove(); });
      qsa(':scope > .tool-svg-icon, :scope > img', line).forEach((el) => {
        if(!el.closest('.tool-round-icon')) el.remove();
      });
    });
  }

  function configureCards(){
    qsa('.seven-tool-card').forEach((card) => {
      removeDuplicateTitleIcons(card);
      const toggle = qs('.tool-expand-btn', card);
      const focus = qs('.tool-focus-btn', card);
      const full = qs('.tool-fullscreen-btn', card);

      if(focus) setIcon(focus, 'icon-eye');
      if(full) setIcon(full, 'icon-fullscreen');

      const setOpen = (open) => {
        card.classList.toggle('is-open', open);
        if(toggle){
          toggle.textContent = open ? 'Fechar' : 'Abrir';
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
      };

      setOpen(false);

      const toggleHandler = () => setOpen(!card.classList.contains('is-open'));
      toggle?.addEventListener('click', toggleHandler);
      cleanupFns.push(() => toggle?.removeEventListener('click', toggleHandler));

      const focusHandler = () => {
        const enabled = !card.classList.contains('is-focused');
        qsa('.seven-tool-card').forEach((item) => item.classList.remove('is-focused'));
        qsa('.tool-focus-btn').forEach((btn) => btn.setAttribute('aria-pressed','false'));
        document.body.classList.toggle('tools-focus-mode', enabled);
        if(enabled){
          card.classList.add('is-focused');
          focus.setAttribute('aria-pressed','true');
          setOpen(true);
          card.scrollIntoView({behavior:'smooth', block:'center'});
        }
      };
      focus?.addEventListener('click', focusHandler);
      cleanupFns.push(() => focus?.removeEventListener('click', focusHandler));

      const fullHandler = async () => {
        try{
          setOpen(true);
          if(document.fullscreenElement){
            await document.exitFullscreen();
          }else if(card.requestFullscreen){
            await card.requestFullscreen();
          }
        }catch(error){
          console.warn('Tela cheia indispon\u00edvel:', error);
        }
      };
      full?.addEventListener('click', fullHandler);
      cleanupFns.push(() => full?.removeEventListener('click', fullHandler));
    });

    const updateFullscreenIcons = () => {
      qsa('.tool-fullscreen-btn').forEach((btn) => setIcon(btn, 'icon-fullscreen'));
      const activeCard = document.fullscreenElement?.classList?.contains('seven-tool-card') ? document.fullscreenElement : null;
      if(activeCard) setIcon(qs('.tool-fullscreen-btn', activeCard), 'icon-fullscreen-exit');
    };
    document.addEventListener('fullscreenchange', updateFullscreenIcons);
    cleanupFns.push(() => document.removeEventListener('fullscreenchange', updateFullscreenIcons));
  }

  function initTuner(){
    const startBtn = qs('#tuner-start-btn');
    if(!startBtn) return;

    const statusEl = qs('#tuner-status');
    const hzEl = qs('#tuner-hz');
    const noteEl = qs('#tuner-note');
    const octaveEl = qs('#tuner-octave');
    const needle = qs('#tuner-needle');
    const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

    let audioContext = null;
    let analyser = null;
    let stream = null;
    let raf = 0;
    let running = false;

    function resetDisplay(message = 'Afinador parado'){
      if(statusEl) statusEl.textContent = message;
      if(hzEl) hzEl.textContent = '-- Hz';
      if(noteEl) noteEl.textContent = '--';
      if(octaveEl) octaveEl.textContent = '--';
      if(needle) needle.style.left = '50%';
    }

    function frequencyToNote(freq){
      const noteNum = 12 * (Math.log(freq / 440) / Math.log(2)) + 69;
      const rounded = Math.round(noteNum);
      const cents = Math.floor((noteNum - rounded) * 100);
      const name = noteNames[((rounded % 12) + 12) % 12];
      const octave = Math.floor(rounded / 12) - 1;
      return { name, octave, cents };
    }

    function autoCorrelate(buffer, sampleRate){
      const size = buffer.length;
      let rms = 0;
      for(let i=0;i<size;i++) rms += buffer[i] * buffer[i];
      rms = Math.sqrt(rms / size);
      if(rms < 0.01) return -1;

      let r1 = 0, r2 = size - 1;
      const threshold = 0.2;
      for(let i=0;i<size/2;i++){
        if(Math.abs(buffer[i]) < threshold){ r1 = i; break; }
      }
      for(let i=1;i<size/2;i++){
        if(Math.abs(buffer[size - i]) < threshold){ r2 = size - i; break; }
      }
      buffer = buffer.slice(r1, r2);

      const newSize = buffer.length;
      const c = new Array(newSize).fill(0);
      for(let i=0;i<newSize;i++){
        for(let j=0;j<newSize-i;j++) c[i] += buffer[j] * buffer[j+i];
      }
      let d = 0;
      while(c[d] > c[d+1]) d++;
      let maxVal = -1, maxPos = -1;
      for(let i=d;i<newSize;i++){
        if(c[i] > maxVal){ maxVal = c[i]; maxPos = i; }
      }
      if(maxPos <= 0) return -1;
      return sampleRate / maxPos;
    }

    function tick(){
      if(!running || !analyser || !audioContext) return;
      const buffer = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buffer);
      const freq = autoCorrelate(buffer, audioContext.sampleRate);
      if(freq > 40 && freq < 1600){
        const note = frequencyToNote(freq);
        if(statusEl) statusEl.textContent = Math.abs(note.cents) <= 6 ? 'Afinado' : (note.cents < 0 ? 'Muito baixo' : 'Muito alto');
        if(hzEl) hzEl.textContent = `${freq.toFixed(1)} Hz`;
        if(noteEl) noteEl.textContent = note.name;
        if(octaveEl) octaveEl.textContent = String(note.octave);
        if(needle) needle.style.left = `${clamp(50 + note.cents, 0, 100)}%`;
      }else{
        if(statusEl) statusEl.textContent = 'Aguardando som';
      }
      raf = requestAnimationFrame(tick);
    }

    async function start(){
      try{
        stream = await navigator.mediaDevices.getUserMedia({audio:true});
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        running = true;
        startBtn.textContent = 'Parar afinador';
        startBtn.classList.add('is-running');
        startBtn.setAttribute('aria-pressed','true');
        if(statusEl) statusEl.textContent = 'Ouvindo microfone';
        tick();
      }catch(error){
        console.warn('Erro no afinador:', error);
        resetDisplay('Microfone n\u00e3o liberado');
      }
    }

    function stop(){
      running = false;
      cancelAnimationFrame(raf);
      stream?.getTracks?.().forEach((track) => track.stop());
      stream = null;
      analyser = null;
      try{ audioContext?.close?.(); }catch{}
      audioContext = null;
      startBtn.textContent = 'Iniciar afinador';
      startBtn.classList.remove('is-running');
      startBtn.setAttribute('aria-pressed','false');
      resetDisplay('Afinador parado');
    }

    const startHandler = () => running ? stop() : start();
    startBtn.addEventListener('click', startHandler);
    cleanupFns.push(() => startBtn.removeEventListener('click', startHandler));
    cleanupFns.push(stop);
    resetDisplay('Aguardando in\u00edcio');
  }

  function initMetronome(){
    const bpmValue = qs('#metronome-bpm-value');
    const slider = qs('#metronome-bpm-slider');
    const minus = qs('#metronome-minus');
    const plus = qs('#metronome-plus');
    const select = qs('#metronome-time-signature');
    const toggle = qs('#metronome-toggle');
    const beatsBox = qs('#metronome-beats');
    if(!bpmValue || !slider || !minus || !plus || !select || !toggle || !beatsBox) return;

    minus.textContent = '\u2212';
    plus.textContent = '+';

    let bpm = Number(slider.value || 72);
    let beats = Number(select.value || 4);
    let currentBeat = 0;
    let timer = 0;
    let audioContext = null;

    function drawBeats(){
      beatsBox.innerHTML = '';
      for(let i=0;i<beats;i++){
        const dot = document.createElement('span');
        dot.className = 'metronome-beat' + (i === 0 ? ' is-first' : '');
        beatsBox.appendChild(dot);
      }
    }

    function updateBpm(value){
      bpm = clamp(Number(value || bpm), 30, 240);
      slider.value = String(bpm);
      bpmValue.textContent = String(bpm);
      if(timer){ stop(); start(); }
    }

    function playClick(strong){
      try{
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.frequency.value = strong ? 980 : 660;
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(strong ? 0.22 : 0.13, audioContext.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.075);
        osc.connect(gain).connect(audioContext.destination);
        osc.start();
        osc.stop(audioContext.currentTime + 0.085);
      }catch{}
    }

    function pulse(){
      const dots = qsa('.metronome-beat', beatsBox);
      dots.forEach((dot) => dot.classList.remove('is-active'));
      dots[currentBeat]?.classList.add('is-active');
      playClick(currentBeat === 0);
      currentBeat = (currentBeat + 1) % beats;
    }

    function start(){
      if(timer) return;
      currentBeat = 0;
      toggle.textContent = 'Parar';
      toggle.classList.add('is-running');
      toggle.setAttribute('aria-pressed','true');
      pulse();
      timer = setInterval(pulse, 60000 / bpm);
    }

    function stop(){
      clearInterval(timer);
      timer = 0;
      toggle.textContent = 'Iniciar';
      toggle.classList.remove('is-running');
      toggle.setAttribute('aria-pressed','false');
      qsa('.metronome-beat', beatsBox).forEach((dot) => dot.classList.remove('is-active'));
    }

    const minusHandler = () => updateBpm(bpm - 1);
    const plusHandler = () => updateBpm(bpm + 1);
    const sliderHandler = () => updateBpm(slider.value);
    const selectHandler = () => {
      beats = Number(select.value || 4);
      currentBeat = 0;
      drawBeats();
      if(timer){ stop(); start(); }
    };
    const toggleHandler = () => timer ? stop() : start();

    minus.addEventListener('click', minusHandler);
    plus.addEventListener('click', plusHandler);
    slider.addEventListener('input', sliderHandler);
    select.addEventListener('change', selectHandler);
    toggle.addEventListener('click', toggleHandler);

    cleanupFns.push(() => {
      minus.removeEventListener('click', minusHandler);
      plus.removeEventListener('click', plusHandler);
      slider.removeEventListener('input', sliderHandler);
      select.removeEventListener('change', selectHandler);
      toggle.removeEventListener('click', toggleHandler);
      stop();
      try{ audioContext?.close?.(); }catch{}
      audioContext = null;
    });

    drawBeats();
    updateBpm(bpm);
  }

  function initFerramentas(){
    const page = qs('.ferramentas-page');
    if(!page) return;
    if(page.dataset.ferramentasLimpo === '1') return;
    safeCleanup();
    page.dataset.ferramentasLimpo = '1';
    fixStaticTexts(page);
    configureCards();
    initTuner();
    initMetronome();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFerramentas);
  else initFerramentas();
  document.addEventListener('seven:page-ready', initFerramentas);
  document.addEventListener('seven:page-swapped', initFerramentas);
  window.addEventListener('beforeunload', safeCleanup);
})();
