# Ministério Seven V4 — Correção Afinador/Metrônomo V3
# Execute na raiz do projeto.

$ErrorActionPreference = "Stop"

function Set-ContentUtf8($Path, $Content) {
  Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
}

$root = (Get-Location).Path
$target = Join-Path $root "ferramentas.html"

if (-not (Test-Path $target)) {
  Write-Host "ERRO: ferramentas.html não encontrado. Rode este comando na raiz do site." -ForegroundColor Red
  exit 1
}

$content = Get-Content -LiteralPath $target -Raw -Encoding UTF8
$original = $content

# Remove versões repetidas deste mesmo ajuste, caso o patch seja aplicado mais de uma vez.
$content = [regex]::Replace($content, '(?is)\s*<link[^>]+href=["'']assets/css/seven-ferramentas-fix-v3\.css["''][^>]*>', '')
$content = [regex]::Replace($content, '(?is)\s*<script[^>]+src=["'']assets/js/seven-ferramentas-fix-v3\.js["''][^>]*>\s*</script>', '')

$cssLine = '  <link rel="stylesheet" href="assets/css/seven-ferramentas-fix-v3.css" />'
$jsLine  = '  <script src="assets/js/seven-ferramentas-fix-v3.js"></script>'

# CSS depois do CSS da página, para ter prioridade.
if ($content -match '</head>') {
  $content = $content -replace '</head>', ($cssLine + "`r`n</head>")
}

# JS depois dos scripts principais, para normalizar após o carregamento da página.
if ($content -match '</body>') {
  $content = $content -replace '</body>', ($jsLine + "`r`n</body>")
}

if ($content -ne $original) {
  Set-ContentUtf8 $target $content
  Write-Host "Atualizado: ferramentas.html" -ForegroundColor Green
} else {
  Write-Host "Sem alteração em ferramentas.html" -ForegroundColor Yellow
}

Write-Host "Correção aplicada: ícone duplicado removido e compasso corrigido no modo escuro. Atualize com Ctrl + F5." -ForegroundColor Cyan
