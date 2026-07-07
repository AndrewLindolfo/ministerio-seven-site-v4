# Ministério Seven — correção do ativo individual do submenu Downloads
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

$root = Get-Location
$publicFiles = Get-ChildItem -Path $root -Filter *.html -File | Where-Object {
  $_.DirectoryName -eq $root.Path
}

foreach ($item in $publicFiles) {
  $file = $item.FullName
  try { $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8 } catch { continue }
  $original = $content

  $content = [regex]::Replace($content, '(?is)\s*<link[^>]+href=["''][^"'']*seven-router\.css[^"'']*["''][^>]*>', '')
  $content = [regex]::Replace($content, '(?is)\s*<script[^>]+src=["''][^"'']*seven-router\.js[^"'']*["''][^>]*>\s*</script>', '')

  $cssLine = '  <link rel="stylesheet" href="assets/css/seven-router.css" />'
  $jsLine  = '  <script type="module" src="assets/js/seven-router.js"></script>'

  $content = $content.Replace('</head>', $cssLine + "`r`n</head>")
  $content = $content.Replace('</body>', $jsLine + "`r`n</body>")

  if ($content -ne $original) {
    if (Set-ContentWithRetry $file $content) { Write-Host "Atualizado: $($item.Name)" }
  } else {
    Write-Host "Sem alteracao: $($item.Name)"
  }
}

Write-Host ""
Write-Host "Correcao aplicada: Geral e Por Musica agora marcam ativo individualmente. Atualize com Ctrl + F5."
