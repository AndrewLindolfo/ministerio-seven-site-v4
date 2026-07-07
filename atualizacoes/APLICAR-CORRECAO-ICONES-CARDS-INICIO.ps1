# Ministério Seven — Correção dos ícones dos cards da página inicial
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

# Coloca o CSS em todas as páginas públicas principais para funcionar também com a navegação suave.
$targets = @(
  "index.html",
  "musicas.html",
  "musicas-vocal.html",
  "musica.html",
  "musica-vocal.html",
  "cifras.html",
  "cifra.html",
  "agenda.html",
  "fotos.html",
  "downloads.html",
  "downloads-por-musica.html",
  "ferramentas.html",
  "contato.html",
  "favoritos.html",
  "playlists.html"
)

$cssLine = '  <link rel="stylesheet" href="assets/css/seven-home-card-icons-fix.css" />'

foreach ($rel in $targets) {
  $file = Join-Path (Get-Location) $rel
  if (-not (Test-Path $file)) { continue }
  try { $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8 } catch { continue }
  $original = $content

  if ($content -notlike '*seven-home-card-icons-fix.css*') {
    $content = $content.Replace('</head>', $cssLine + "`r`n</head>")
  }

  if ($content -ne $original) {
    if (Set-ContentWithRetry $file $content) { Write-Host "Atualizado: $rel" }
  } else {
    Write-Host "Sem alteracao: $rel"
  }
}

Write-Host ""
Write-Host "Correcao aplicada: icones dos cards da pagina inicial restaurados. Atualize com Ctrl + F5."
