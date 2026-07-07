
# Ministério Seven V4 — Correção Final Afinador/Metrônomo
# Execute na raiz do projeto.

$ErrorActionPreference = "Stop"

function Set-ContentUtf8($Path, $Content) {
  Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
}

$root = (Get-Location).Path
$htmlFiles = Get-ChildItem -Path $root -Filter *.html -File

if (-not (Test-Path (Join-Path $root "ferramentas.html"))) {
  Write-Host "ERRO: ferramentas.html não encontrado. Rode este comando na raiz do site." -ForegroundColor Red
  exit 1
}

foreach ($item in $htmlFiles) {
  $file = $item.FullName
  $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8
  $original = $content

  # Remove ajustes antigos que estavam conflitantes.
  $removePatterns = @(
    '(?is)\s*<link[^>]+href=["'']assets/css/ferramentas-restaurar-v4\.css["''][^>]*>',
    '(?is)\s*<link[^>]+href=["'']assets/css/seven-ferramentas-fix-v3\.css["''][^>]*>',
    '(?is)\s*<script[^>]+src=["'']assets/js/seven-ferramentas-fix-v3\.js["''][^>]*>\s*</script>',
    '(?is)\s*<link[^>]+href=["'']assets/css/ferramentas-final-correto\.css["''][^>]*>',
    '(?is)\s*<script[^>]+src=["'']assets/js/ferramentas-final-correto\.js["''][^>]*>\s*</script>'
  )
  foreach ($pattern in $removePatterns) {
    $content = [regex]::Replace($content, $pattern, '')
  }

  $cssLine = '  <link rel="stylesheet" href="assets/css/ferramentas-final-correto.css" />'
  $jsLine  = '  <script src="assets/js/ferramentas-final-correto.js"></script>'

  if ($content -match '</head>') {
    $content = $content -replace '</head>', ($cssLine + "`r`n</head>")
  }
  if ($content -match '</body>') {
    $content = $content -replace '</body>', ($jsLine + "`r`n</body>")
  }

  if ($content -ne $original) {
    Set-ContentUtf8 $file $content
    Write-Host "Atualizado: $($item.Name)" -ForegroundColor Green
  } else {
    Write-Host "Sem alteração: $($item.Name)" -ForegroundColor Yellow
  }
}

# Remove arquivos antigos de conflito se existirem.
$oldFiles = @(
  "assets/css/ferramentas-restaurar-v4.css",
  "assets/css/seven-ferramentas-fix-v3.css",
  "assets/js/seven-ferramentas-fix-v3.js"
)
foreach ($old in $oldFiles) {
  $path = Join-Path $root $old
  if (Test-Path $path) { Remove-Item -LiteralPath $path -Force }
}

Write-Host "Correção final aplicada: Afinador/Metrônomo, ícones e Compasso. Atualize com Ctrl + F5." -ForegroundColor Cyan
