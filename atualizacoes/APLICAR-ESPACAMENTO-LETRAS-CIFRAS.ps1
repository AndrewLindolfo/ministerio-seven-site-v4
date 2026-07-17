$ErrorActionPreference = "Stop"

$cssPath = "assets/css/seven-espacamento-letras-cifras.css"
$linkLine = '  <link rel="stylesheet" href="assets/css/seven-espacamento-letras-cifras.css" />'
$pages = @("musica.html", "musica-vocal.html", "cifra.html")

foreach ($page in $pages) {
  if (-not (Test-Path $page)) {
    Write-Host "Arquivo nao encontrado: $page"
    continue
  }

  $content = Get-Content $page -Raw -Encoding UTF8
  $original = $content

  # Remove referência duplicada antiga, se existir.
  $content = [regex]::Replace($content, '(?im)^\s*<link[^>]+seven-espacamento-letras-cifras\.css[^>]*>\s*\r?\n?', '')

  if ($content -match '</head>') {
    $content = $content -replace '</head>', "$linkLine`r`n</head>"
  }

  if ($content -ne $original) {
    Set-Content $page $content -Encoding UTF8
    Write-Host "Atualizado: $page"
  } else {
    Write-Host "Sem alteracao: $page"
  }
}

Write-Host ""
Write-Host "Espacamento de letras/cifras aplicado. Atualize com Ctrl + F5."
