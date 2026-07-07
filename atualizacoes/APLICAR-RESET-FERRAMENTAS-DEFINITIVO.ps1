
# Ministério Seven V4 — reset estável definitivo de Ferramentas
# Execute na raiz do site.
$ErrorActionPreference = "Continue"

function Set-ContentWithRetry($file, $content) {
  for ($i = 1; $i -le 5; $i++) {
    try {
      Set-Content -LiteralPath $file -Value $content -Encoding UTF8
      return $true
    } catch {
      if ($i -lt 5) { Start-Sleep -Milliseconds 350 }
      else {
        Write-Warning "Nao foi possivel atualizar: $file. Feche Live Server/VS Code/navegador e rode novamente."
        return $false
      }
    }
  }
}

$file = Join-Path (Get-Location) "ferramentas.html"
if (-not (Test-Path $file)) {
  Write-Warning "ferramentas.html nao encontrado. Rode este script na raiz do site."
  exit
}

$content = Get-Content -LiteralPath $file -Raw -Encoding UTF8
$original = $content

# Remove referências antigas que conflitam com Ferramentas.
$patterns = @(
  '(?is)\s*<link[^>]+href=["''][^"'']*ferramentas-ajuste-visual\.css[^"'']*["''][^>]*>',
  '(?is)\s*<script[^>]+src=["''][^"'']*ferramentas-ajuste-visual\.js[^"'']*["''][^>]*>\s*</script>',
  '(?is)\s*<link[^>]+href=["''][^"'']*seven-ferramentas-fix-v3\.css[^"'']*["''][^>]*>',
  '(?is)\s*<script[^>]+src=["''][^"'']*seven-ferramentas-fix-v3\.js[^"'']*["''][^>]*>\s*</script>',
  '(?is)\s*<link[^>]+href=["''][^"'']*ferramentas-restaurar-v4\.css[^"'']*["''][^>]*>',
  '(?is)\s*<link[^>]+href=["''][^"'']*ferramentas-final-correto\.css[^"'']*["''][^>]*>',
  '(?is)\s*<script[^>]+src=["''][^"'']*ferramentas-final-correto\.js[^"'']*["''][^>]*>\s*</script>'
)
foreach ($pattern in $patterns) {
  $content = [regex]::Replace($content, $pattern, '')
}

# Garante que o CSS/JS principal da página estejam presentes.
if ($content -notmatch 'assets/css/pages/ferramentas\.css') {
  $content = $content.Replace('</head>', '  <link rel="stylesheet" href="assets/css/pages/ferramentas.css" />' + "`r`n</head>")
}
if ($content -notmatch 'assets/js/pages/ferramentas\.js') {
  $content = $content.Replace('</body>', '  <script type="module" src="assets/js/pages/ferramentas.js"></script>' + "`r`n</body>")
}

$newMain = @'
<main class="ferramentas-page">
  <section class="container">
    <div class="ferramentas-head">
      <h1>Ferramentas</h1>
      <p class="ferramentas-subtitle">Recursos úteis para estudo, ensaio e afinação.</p>
    </div>

    <div class="ferramentas-grid">
      <article class="tool-card" id="tool-card-afinador" data-tool="afinador">
        <div class="tool-card-head">
          <div>
            <span class="tool-chip">Ferramenta</span>
            <h2>Afinador</h2>
            <p>Use o microfone do aparelho para detectar notas, frequência em Hz e afinar qualquer instrumento cromaticamente.</p>
          </div>
          <div class="tool-head-actions">
            <button type="button" class="tool-expand-btn" data-target="afinador" aria-expanded="false">Abrir</button>
            <button type="button" class="tool-focus-btn tool-icon-btn" data-target="afinador" aria-pressed="false" aria-label="Modo foco" title="Modo foco">Foco</button>
            <button type="button" class="tool-fullscreen-btn tool-icon-btn" data-target="afinador" aria-pressed="false" aria-label="Tela cheia" title="Tela cheia">Tela</button>
          </div>
        </div>

        <div class="tool-body hidden" id="tool-body-afinador">
          <div class="tuner-panel">
            <div class="tuner-topline">
              <span class="tuner-status" id="tuner-status">Aguardando início</span>
              <span class="tuner-hz" id="tuner-hz">-- Hz</span>
            </div>

            <div class="tuner-note-wrap">
              <div class="tuner-note" id="tuner-note">--</div>
              <div class="tuner-octave" id="tuner-octave">--</div>
            </div>

            <div class="tuner-meter-wrap">
              <div class="tuner-meter-scale"><span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span></div>
              <div class="tuner-meter">
                <div class="tuner-meter-zones"><span class="zone-red"></span><span class="zone-yellow"></span><span class="zone-green"></span><span class="zone-yellow"></span><span class="zone-red"></span></div>
                <div class="tuner-needle" id="tuner-needle"></div>
              </div>
              <div class="tuner-meter-labels"><span>Muito baixo</span><span>Baixo</span><span>Afinado</span><span>Alto</span><span>Muito alto</span></div>
            </div>

            <div class="tool-actions-row"><button type="button" id="tuner-start-btn" class="button-primary tool-toggle-btn is-stopped" aria-pressed="false">Iniciar afinador</button></div>

            <div class="tuner-reference">
              <strong>Afinações comuns</strong>
              <ul><li>Violão / Guitarra: E A D G B E</li><li>Baixo: E A D G</li><li>Ukulele: G C E A</li></ul>
            </div>
          </div>
        </div>
      </article>

      <article class="tool-card" id="tool-card-metronomo" data-tool="metronomo">
        <div class="tool-card-head">
          <div>
            <span class="tool-chip">Ferramenta</span>
            <h2>Metrônomo</h2>
            <p>Controle o tempo do ensaio com BPM ajustável, compasso e pulso visual com primeira batida destacada.</p>
          </div>
          <div class="tool-head-actions">
            <button type="button" class="tool-expand-btn" data-target="metronomo" aria-expanded="false">Abrir</button>
            <button type="button" class="tool-focus-btn tool-icon-btn" data-target="metronomo" aria-pressed="false" aria-label="Modo foco" title="Modo foco">Foco</button>
            <button type="button" class="tool-fullscreen-btn tool-icon-btn" data-target="metronomo" aria-pressed="false" aria-label="Tela cheia" title="Tela cheia">Tela</button>
          </div>
        </div>

        <div class="tool-body hidden" id="tool-body-metronomo">
          <div class="metronome-panel">
            <div class="metronome-bpm-wrap">
              <button type="button" id="metronome-minus" class="bpm-step-btn" aria-label="Diminuir BPM">−</button>
              <div class="metronome-bpm-main"><div class="metronome-bpm-value" id="metronome-bpm-value">72</div><div class="metronome-bpm-label">BPM</div></div>
              <button type="button" id="metronome-plus" class="bpm-step-btn" aria-label="Aumentar BPM">+</button>
            </div>

            <div class="metronome-slider-wrap"><input type="range" id="metronome-bpm-slider" min="30" max="240" step="1" value="72" aria-label="BPM" /></div>

            <div class="metronome-controls-grid">
              <label class="metronome-select-wrap"><span>Compasso</span><select id="metronome-time-signature"><option value="2">2/4</option><option value="3">3/4</option><option value="4" selected>4/4</option><option value="5">5/4</option><option value="6">6/8</option><option value="7">7/8</option><option value="9">9/8</option><option value="12">12/8</option></select></label>
              <button type="button" id="metronome-toggle" class="button-primary tool-toggle-btn is-stopped" aria-pressed="false">Iniciar</button>
            </div>

            <div class="metronome-beats" id="metronome-beats" aria-label="Pulso visual"></div>
          </div>
        </div>
      </article>
    </div>
  </section>
</main>
'@

if ($content -match '(?is)<main\s+class=["'']ferramentas-page["''][\s\S]*?</main>') {
  $content = [regex]::Replace($content, '(?is)<main\s+class=["'']ferramentas-page["''][\s\S]*?</main>', $newMain, 1)
} else {
  $content = $content.Replace('</header>', '</header>' + "`r`n" + $newMain)
}

if (Set-ContentWithRetry $file $content) {
  Write-Host "Ferramentas restaurado e estabilizado: ferramentas.html"
}

Write-Host ""
Write-Host "Reset definitivo de Ferramentas aplicado. Atualize com Ctrl + F5."
