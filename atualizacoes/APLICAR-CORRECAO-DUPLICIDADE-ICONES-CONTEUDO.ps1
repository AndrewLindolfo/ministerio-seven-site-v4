# Ministério Seven — correção de ícones duplicados em músicas, vocal, cifras e páginas internas.
# Execute na raiz do projeto.

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

$targets = @(
  "index.html",
  "musicas.html",
  "musicas-vocal.html",
  "musica.html",
  "musica-vocal.html",
  "cifras.html",
  "cifra.html",
  "ferramentas.html"
)

$cssLine = '  <link rel="stylesheet" href="assets/css/seven-content-icons.css" />'
$jsLine  = '  <script type="module" src="assets/js/seven-content-icons.js"></script>'

foreach ($rel in $targets) {
  $file = Join-Path (Get-Location) $rel
  if (-not (Test-Path $file)) { continue }
  try { $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8 } catch { continue }
  $original = $content

  if ($content -notlike '*seven-content-icons.css*') {
    $content = $content.Replace('</head>', $cssLine + "`r`n</head>")
  }
  if ($content -notlike '*seven-content-icons.js*') {
    $content = $content.Replace('</body>', $jsLine + "`r`n</body>")
  }

  if ($content -ne $original) {
    if (Set-ContentWithRetry $file $content) { Write-Host "Atualizado: $rel" }
  } else {
    Write-Host "Sem alteracao: $rel"
  }
}

Write-Host ""
Write-Host "Correcao aplicada: icones antigos duplicados removidos visualmente. Atualize com Ctrl + F5."
