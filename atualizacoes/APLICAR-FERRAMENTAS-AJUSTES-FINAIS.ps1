# Ministério Seven V4 — Ferramentas ajustes finais
# Corrige acentuação, ícones duplicados, botões foco/tela cheia e Metrônomo.

$ErrorActionPreference = "Stop"
$Root = (Get-Location).Path

function Write-Utf8NoBom($Path, $Content) {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Ensure-Dir($Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

$HtmlFile = Join-Path $Root "ferramentas.html"
if (-not (Test-Path -LiteralPath $HtmlFile)) {
  Write-Warning "ferramentas.html nao encontrado. Rode este comando na raiz do site."
  exit 1
}

# Os arquivos CSS/JS/ícones já são extraídos pelo ZIP nos locais definitivos.
Ensure-Dir (Join-Path $Root "assets\css\pages")
Ensure-Dir (Join-Path $Root "assets\js\pages")
Ensure-Dir (Join-Path $Root "assets\icons\seven-tools")

# Conteúdo principal limpo, com HTML entities para não quebrar acentuação.
$NovoMain = @'
<main class="ferramentas-page">
  <section class="tools-hero ferramentas-container" aria-label="Ferramentas musicais">
    <div class="tools-hero-content">
      <span class="tools-eyebrow">Ferramentas</span>
      <h1>Afinador e <span>Metr&ocirc;nomo</span></h1>
      <p>Recursos para apoiar ensaios, estudos de cifra, prepara&ccedil;&atilde;o vocal e ministra&ccedil;&atilde;o.</p>
    </div>
  </section>

  <section class="tools-grid ferramentas-container">
    <article class="seven-tool-card" data-tool="tuner">
      <div class="tool-card-top">
        <div class="tool-head-text">
          <span class="tool-badge">Ferramenta</span>
          <div class="tool-title-line">
            <span class="tool-round-icon" aria-hidden="true"><span class="tool-svg-icon icon-tuner"></span></span>
            <h2>Afinador</h2>
          </div>
          <p class="tool-description">Use o microfone do aparelho para detectar notas, frequ&ecirc;ncia em Hz e afinar qualquer instrumento cromaticamente.</p>
        </div>
        <div class="tool-head-actions">
          <button type="button" class="tool-expand-btn" aria-expanded="false">Abrir</button>
          <button type="button" class="tool-icon-btn tool-focus-btn" aria-label="Modo foco" title="Modo foco" aria-pressed="false"></button>
          <button type="button" class="tool-icon-btn tool-fullscreen-btn" aria-label="Tela cheia" title="Tela cheia"></button>
        </div>
      </div>

      <div class="tool-body">
        <div class="tuner-panel">
          <div class="tuner-topline">
            <span id="tuner-status">Aguardando in&iacute;cio</span>
            <span id="tuner-hz" class="tuner-hz">-- Hz</span>
          </div>

          <div class="tuner-note-wrap">
            <strong id="tuner-note" class="tuner-note">--</strong>
            <span id="tuner-octave" class="tuner-octave">--</span>
          </div>

          <div class="tuner-meter-wrap">
            <div class="tuner-meter-scale"><span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span></div>
            <div class="tuner-meter">
              <div class="tuner-meter-zones" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
              <div id="tuner-needle" class="tuner-needle" aria-hidden="true"></div>
            </div>
            <div class="tuner-meter-labels"><span>Muito baixo</span><span>Baixo</span><span>Afinado</span><span>Alto</span><span>Muito alto</span></div>
          </div>

          <div class="tool-actions-row">
            <button type="button" id="tuner-start-btn" class="tool-toggle-btn" aria-pressed="false">Iniciar afinador</button>
          </div>

          <div class="tuner-reference">
            <strong>Afina&ccedil;&otilde;es comuns</strong>
            <ul>
              <li>Viol&atilde;o / Guitarra: E A D G B E</li>
              <li>Baixo: E A D G</li>
              <li>Ukulele: G C E A</li>
            </ul>
          </div>
        </div>
      </div>
    </article>

    <article class="seven-tool-card" data-tool="metronome">
      <div class="tool-card-top">
        <div class="tool-head-text">
          <span class="tool-badge">Ferramenta</span>
          <div class="tool-title-line">
            <span class="tool-round-icon" aria-hidden="true"><span class="tool-svg-icon icon-metronome"></span></span>
            <h2>Metr&ocirc;nomo</h2>
          </div>
          <p class="tool-description">Controle o tempo do ensaio com BPM ajust&aacute;vel, compasso e pulso visual com primeira batida destacada.</p>
        </div>
        <div class="tool-head-actions">
          <button type="button" class="tool-expand-btn" aria-expanded="false">Abrir</button>
          <button type="button" class="tool-icon-btn tool-focus-btn" aria-label="Modo foco" title="Modo foco" aria-pressed="false"></button>
          <button type="button" class="tool-icon-btn tool-fullscreen-btn" aria-label="Tela cheia" title="Tela cheia"></button>
        </div>
      </div>

      <div class="tool-body">
        <div class="metronome-panel">
          <div class="metronome-bpm-wrap">
            <button type="button" id="metronome-minus" class="bpm-step-btn" aria-label="Diminuir BPM">&minus;</button>
            <div class="metronome-bpm-main">
              <div id="metronome-bpm-value" class="metronome-bpm-value">72</div>
              <div class="metronome-bpm-label">BPM</div>
            </div>
            <button type="button" id="metronome-plus" class="bpm-step-btn" aria-label="Aumentar BPM">+</button>
          </div>

          <div class="metronome-slider-wrap">
            <input id="metronome-bpm-slider" type="range" min="30" max="240" value="72" aria-label="BPM" />
          </div>

          <div class="metronome-controls-grid">
            <label class="metronome-select-wrap">
              <span>Compasso</span>
              <select id="metronome-time-signature" aria-label="Compasso">
                <option value="2">2/4</option>
                <option value="3">3/4</option>
                <option value="4" selected>4/4</option>
                <option value="5">5/4</option>
                <option value="6">6/8</option>
                <option value="7">7/8</option>
                <option value="9">9/8</option>
                <option value="12">12/8</option>
              </select>
            </label>
            <button type="button" id="metronome-toggle" class="tool-toggle-btn" aria-pressed="false">Iniciar</button>
          </div>

          <div id="metronome-beats" class="metronome-beats" aria-label="Pulsos do compasso"></div>
        </div>
      </div>
    </article>
  </section>
</main>
'@

$Content = Get-Content -LiteralPath $HtmlFile -Raw -Encoding UTF8

# Remover CSS/JS extras de ferramentas que vieram de patches antigos, mantendo só os definitivos.
$Content = [regex]::Replace($Content, '(?is)\s*<link[^>]+href=["''][^"'']*ferramentas-(?!\.css)[^"'']*\.css[^"'']*["''][^>]*>', '')
$Content = [regex]::Replace($Content, '(?is)\s*<script[^>]+src=["''][^"'']*ferramentas-(?!\.js)[^"'']*\.js[^"'']*["''][^>]*>\s*</script>', '')
$Content = [regex]::Replace($Content, '(?is)\s*<link[^>]+href=["''][^"'']*(ferramentas-final|ferramentas-estavel|ferramentas-definitivo|tools-final|tools-estavel)[^"'']*\.css["''][^>]*>', '')
$Content = [regex]::Replace($Content, '(?is)\s*<script[^>]+src=["''][^"'']*(ferramentas-final|ferramentas-estavel|ferramentas-definitivo|tools-final|tools-estavel)[^"'']*\.js["''][^>]*>\s*</script>', '')

# Garantir links corretos.
if ($Content -notmatch 'assets/css/pages/ferramentas\.css') {
  $Content = $Content -replace '</head>', '  <link rel="stylesheet" href="assets/css/pages/ferramentas.css" />' + "`r`n</head>"
}
if ($Content -notmatch 'assets/js/pages/ferramentas\.js') {
  $Content = $Content -replace '</body>', '  <script type="module" src="assets/js/pages/ferramentas.js"></script>' + "`r`n</body>"
}

# Trocar somente o main da página Ferramentas.
if ($Content -match '(?is)<main\b.*?</main>') {
  $Content = [regex]::Replace($Content, '(?is)<main\b.*?</main>', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $NovoMain }, 1)
} else {
  $Content = $Content -replace '</body>', $NovoMain + "`r`n</body>"
}

Write-Utf8NoBom $HtmlFile $Content
Write-Host "Ferramentas ajustado: acentuacao, icones duplicados, botoes e layout limpo. Atualize com Ctrl + F5."
