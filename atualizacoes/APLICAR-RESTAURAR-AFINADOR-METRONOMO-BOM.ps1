# Ministério Seven V4 — Restaurar Afinador/Metrônomo para a versão boa
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

# Remove o patch V3 que bagunçou a página.
$content = [regex]::Replace($content, '(?is)\s*<link[^>]+href=["'']assets/css/seven-ferramentas-fix-v3\.css["''][^>]*>', '')
$content = [regex]::Replace($content, '(?is)\s*<script[^>]+src=["'']assets/js/seven-ferramentas-fix-v3\.js["''][^>]*>\s*</script>', '')

# Remove versões repetidas deste ajuste, caso rode mais de uma vez.
$content = [regex]::Replace($content, '(?is)\s*<link[^>]+href=["'']assets/css/ferramentas-restaurar-v4\.css["''][^>]*>', '')

$cssLine = '  <link rel="stylesheet" href="assets/css/ferramentas-restaurar-v4.css" />'

# Coloca o ajuste depois do CSS da página Ferramentas para ter prioridade.
if ($content -match 'assets/css/pages/ferramentas\.css') {
  $content = [regex]::Replace(
    $content,
    '(<link[^>]+href=["'']assets/css/pages/ferramentas\.css["''][^>]*>)',
    ('$1' + "`r`n" + $cssLine),
    1
  )
} elseif ($content -match '</head>') {
  $content = $content -replace '</head>', ($cssLine + "`r`n</head>")
}

if ($content -ne $original) {
  Set-ContentUtf8 $target $content
  Write-Host "Atualizado: ferramentas.html" -ForegroundColor Green
} else {
  Write-Host "Sem alteração em ferramentas.html" -ForegroundColor Yellow
}

# Apaga os arquivos V3 antigos para evitar que sejam reaproveitados por engano.
$oldCss = Join-Path $root "assets/css/seven-ferramentas-fix-v3.css"
$oldJs  = Join-Path $root "assets/js/seven-ferramentas-fix-v3.js"
if (Test-Path $oldCss) { Remove-Item -LiteralPath $oldCss -Force }
if (Test-Path $oldJs) { Remove-Item -LiteralPath $oldJs -Force }

Write-Host "Afinador/Metrônomo restaurados para a versão boa. Ctrl + F5 no navegador." -ForegroundColor Cyan
