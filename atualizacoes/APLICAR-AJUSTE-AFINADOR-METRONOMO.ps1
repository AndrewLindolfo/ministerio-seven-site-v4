
# Ministério Seven V4 - Ajuste visual Afinador/Metrônomo
# Execute na raiz do projeto.

$ErrorActionPreference = "Stop"

function Add-Line-Before($content, $needle, $line) {
  if ($content -like "*$line*") { return $content }
  return $content.Replace($needle, "$line`r`n$needle")
}

$file = "ferramentas.html"
if (-not (Test-Path $file)) {
  Write-Host "Arquivo ferramentas.html nao encontrado. Rode este comando na raiz do site." -ForegroundColor Red
  exit 1
}

$content = Get-Content -LiteralPath $file -Raw -Encoding UTF8
$original = $content

$css = '  <link rel="stylesheet" href="assets/css/ferramentas-ajuste-visual.css" />'
$js  = '  <script type="module" src="assets/js/ferramentas-ajuste-visual.js"></script>'

$content = Add-Line-Before $content '</head>' $css
$content = Add-Line-Before $content '</body>' $js

if ($content -ne $original) {
  Set-Content -LiteralPath $file -Value $content -Encoding UTF8
  Write-Host "Atualizado: ferramentas.html" -ForegroundColor Green
} else {
  Write-Host "Sem alteracao: ferramentas.html" -ForegroundColor Yellow
}

Write-Host "Ajuste visual do Afinador e Metronomo aplicado. Atualize com Ctrl + F5." -ForegroundColor Cyan
