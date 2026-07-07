# Ministério Seven — ajuste fino da logo do menu público V2
# Execute na raiz do projeto.

$ErrorActionPreference = "Continue"

function Get-PrefixForFile($filePath) {
  $root = (Get-Location).Path.TrimEnd('\','/')
  $dir = (Split-Path -Parent $filePath).TrimEnd('\','/')
  if ($dir.Length -le $root.Length) { return "" }
  $rel = $dir.Substring($root.Length).TrimStart('\','/')
  if ([string]::IsNullOrWhiteSpace($rel)) { return "" }
  $depth = ($rel -split '[\\/]').Count
  return ("../" * $depth)
}

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

$htmlFiles = Get-ChildItem -Path . -Filter *.html -File -Recurse | Where-Object {
  $_.FullName -notmatch '\\node_modules\\' -and
  $_.FullName -notmatch '\\.git\\' -and
  $_.FullName -notmatch '\\dist\\' -and
  $_.FullName -notmatch '\\build\\' -and
  $_.FullName -notmatch '\\admin\\'
}

foreach ($item in $htmlFiles) {
  $file = $item.FullName
  try { $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8 } catch { continue }
  $original = $content
  $prefix = Get-PrefixForFile $file

  $cssLine = "  <link rel=`"stylesheet`" href=`"$($prefix)assets/css/seven-logo-menu-compacta-v2.css`" />"
  $jsLine  = "  <script src=`"$($prefix)assets/js/seven-logo-menu-compacta-v2.js`"></script>"

  if ($content -notlike '*seven-logo-menu-compacta-v2.css*') {
    $content = $content.Replace('</head>', $cssLine + "`r`n</head>")
  }
  if ($content -notlike '*seven-logo-menu-compacta-v2.js*') {
    $content = $content.Replace('</body>', $jsLine + "`r`n</body>")
  }

  if ($content -ne $original) {
    if (Set-ContentWithRetry $file $content) { Write-Host "Atualizado: $($item.Name)" }
  } else {
    Write-Host "Sem alteracao: $($item.Name)"
  }
}

Write-Host ""
Write-Host "Logo do menu ajustada para tamanho menor. Atualize com Ctrl + F5."
