# Ministério Seven V4 — Resgate Ferramentas estável
# Execute na raiz do projeto.

$ErrorActionPreference = "Stop"
$root = (Get-Location).Path

if (-not (Test-Path (Join-Path $root "ferramentas.html"))) {
  Write-Host "ERRO: ferramentas.html não encontrado. Rode este comando na raiz do site." -ForegroundColor Red
  exit 1
}

# Remove referências dos patches finais que travaram a página.
$htmlFiles = Get-ChildItem -Path $root -Filter *.html -File
foreach ($item in $htmlFiles) {
  $file = $item.FullName
  $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8
  $original = $content
  $patterns = @(
    '(?is)\s*<link[^>]+href=["''][^"'']*ferramentas-final-correto\.css[^"'']*["''][^>]*>',
    '(?is)\s*<script[^>]+src=["''][^"'']*ferramentas-final-correto\.js[^"'']*["''][^>]*>\s*</script>',
    '(?is)\s*<link[^>]+href=["''][^"'']*ferramentas-restaurar-v4\.css[^"'']*["''][^>]*>',
    '(?is)\s*<script[^>]+src=["''][^"'']*ferramentas-restaurar-v4\.js[^"'']*["''][^>]*>\s*</script>',
    '(?is)\s*<link[^>]+href=["''][^"'']*seven-ferramentas-fix-v3\.css[^"'']*["''][^>]*>',
    '(?is)\s*<script[^>]+src=["''][^"'']*seven-ferramentas-fix-v3\.js[^"'']*["''][^>]*>\s*</script>'
  )
  foreach ($pattern in $patterns) { $content = [regex]::Replace($content, $pattern, '') }
  if ($content -ne $original) {
    Set-Content -LiteralPath $file -Value $content -Encoding UTF8
    Write-Host "Limpo: $($item.Name)" -ForegroundColor Green
  } else {
    Write-Host "Sem limpeza: $($item.Name)" -ForegroundColor Yellow
  }
}

# Remove arquivos antigos conflitantes.
$oldFiles = @(
  "assets/css/ferramentas-final-correto.css",
  "assets/js/ferramentas-final-correto.js",
  "assets/css/ferramentas-restaurar-v4.css",
  "assets/js/ferramentas-restaurar-v4.js",
  "assets/css/seven-ferramentas-fix-v3.css",
  "assets/js/seven-ferramentas-fix-v3.js"
)
foreach ($old in $oldFiles) {
  $path = Join-Path $root $old
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Force
    Write-Host "Removido: $old" -ForegroundColor DarkYellow
  }
}

Write-Host "Ferramentas restaurado para a versão estável. Atualize com Ctrl + F5." -ForegroundColor Cyan
