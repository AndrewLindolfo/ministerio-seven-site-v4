# Ministério Seven V4 — Ferramentas somente para Integrantes
# Execute na raiz do site.

$ErrorActionPreference = "Continue"

function Set-ContentWithRetry($file, $content) {
  for ($i = 1; $i -le 5; $i++) {
    try {
      Set-Content -LiteralPath $file -Value $content -Encoding UTF8
      return $true
    } catch {
      if ($i -lt 5) {
        Start-Sleep -Milliseconds 350
      } else {
        Write-Warning "Nao foi possivel atualizar: $file. Feche Live Server/VS Code/navegador e rode novamente."
        return $false
      }
    }
  }
}

$root = (Get-Location).Path
$publicHtmlFiles = Get-ChildItem -Path . -Filter *.html -File | Where-Object {
  $_.Name -notmatch '^admin' -and
  $_.FullName -notmatch '\\admin\\'
}

foreach ($item in $publicHtmlFiles) {
  $file = $item.FullName
  try { $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8 } catch { continue }
  $original = $content

  # Remove versões anteriores deste ajuste, se existirem.
  $content = [regex]::Replace($content, '(?is)\s*<link[^>]+href=["'']assets/css/ferramentas-integrantes-guard\.css["''][^>]*>', '')
  $content = [regex]::Replace($content, '(?is)\s*<script[^>]+src=["'']assets/js/ferramentas-integrantes-guard\.js["''][^>]*>\s*</script>', '')

  $cssLine = '  <link rel="stylesheet" href="assets/css/ferramentas-integrantes-guard.css" />'
  $jsLine  = '  <script type="module" src="assets/js/ferramentas-integrantes-guard.js"></script>'

  if ($content -notmatch 'assets/css/ferramentas-integrantes-guard\.css') {
    $content = $content.Replace('</head>', $cssLine + "`r`n</head>")
  }

  # Coloca antes do </body>, sem encostar nos scripts funcionais existentes.
  if ($content -notmatch 'assets/js/ferramentas-integrantes-guard\.js') {
    $content = $content.Replace('</body>', $jsLine + "`r`n</body>")
  }

  if ($content -ne $original) {
    if (Set-ContentWithRetry $file $content) {
      Write-Host "Atualizado: $($item.Name)"
    }
  } else {
    Write-Host "Sem alteracao: $($item.Name)"
  }
}

Write-Host ""
Write-Host "Ferramentas agora fica visivel somente para Integrantes/ADMs autorizados. Atualize com Ctrl + F5."
