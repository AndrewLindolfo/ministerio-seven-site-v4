# Ministério Seven — Correção Afinador e Metrônomo V2
# Execute na raiz do site.
$ErrorActionPreference = "Continue"
$root = Get-Location

function WriteUtf8($path, $content) {
  $dir = Split-Path -Parent $path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Set-Content -LiteralPath $path -Value $content -Encoding UTF8
}

# Garante que a página pública Ferramentas carregue o JS mesmo com a navegação suave/PJAX.
$htmlFiles = Get-ChildItem -Path . -Filter *.html -File | Where-Object { $_.Name -notmatch '^admin' }
foreach ($item in $htmlFiles) {
  try { $content = Get-Content -LiteralPath $item.FullName -Raw -Encoding UTF8 } catch { continue }
  $original = $content
  if ($content -notlike '*assets/js/pages/ferramentas.js*') {
    $content = $content.Replace('</body>', '  <script type="module" src="assets/js/pages/ferramentas.js"></script>' + "`r`n</body>")
  }
  if ($content -ne $original) {
    Set-Content -LiteralPath $item.FullName -Value $content -Encoding UTF8
    Write-Host "Atualizado JS ferramentas global: $($item.Name)"
  } else {
    Write-Host "Sem alteracao JS global: $($item.Name)"
  }
}

Write-Host ""
Write-Host "Correção aplicada: Afinador e Metrônomo V2. Atualize com Ctrl + F5."
