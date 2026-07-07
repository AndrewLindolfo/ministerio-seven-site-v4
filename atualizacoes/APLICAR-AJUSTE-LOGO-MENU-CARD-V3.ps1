# Ministério Seven V4 — Ajuste do card da logo no menu público V3
# Execute na raiz do projeto.

$ErrorActionPreference = "Continue"

function Set-ContentWithRetry($file, $content) {
  for ($i = 1; $i -le 5; $i++) {
    try {
      Set-Content -LiteralPath $file -Value $content -Encoding UTF8
      return $true
    } catch {
      if ($i -lt 5) { Start-Sleep -Milliseconds 300 }
      else {
        Write-Warning "Nao foi possivel atualizar: $file. Feche Live Server/VS Code/navegador e rode novamente."
        return $false
      }
    }
  }
}

$root = (Get-Location).Path

$htmlFiles = Get-ChildItem -Path . -Filter *.html -File -Recurse | Where-Object {
  $_.FullName -notmatch '\\admin\\' -and
  $_.FullName -notmatch '\\atualizacoes\\' -and
  $_.FullName -notmatch '\\node_modules\\' -and
  $_.FullName -notmatch '\\.git\\' -and
  $_.FullName -notmatch '\\dist\\' -and
  $_.FullName -notmatch '\\build\\'
}

foreach ($item in $htmlFiles) {
  $file = $item.FullName
  try { $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8 } catch { continue }
  $original = $content

  # Remove versões anteriores deste mesmo ajuste para evitar duplicidade.
  $content = [regex]::Replace($content, '(?is)\s*<link[^>]+href=["''][^"'']*ajuste-logo-menu-card-v3\.css[^"'']*["''][^>]*>', '')
  $content = [regex]::Replace($content, '(?is)\s*<link[^>]+href=["''][^"'']*ajuste-logo-menu-card-v2\.css[^"'']*["''][^>]*>', '')
  $content = [regex]::Replace($content, '(?is)\s*<link[^>]+href=["''][^"'']*ajuste-logo-menu-proporcional[^"'']*\.css[^"'']*["''][^>]*>', '')

  $rel = Resolve-Path -LiteralPath $file
  $dir = Split-Path -Parent $rel
  $relativeFromFile = ""
  $rootFull = (Resolve-Path -LiteralPath ".").Path
  if ($dir.Length -gt $rootFull.Length) {
    $sub = $dir.Substring($rootFull.Length).TrimStart('\','/')
    if (-not [string]::IsNullOrWhiteSpace($sub)) {
      $depth = ($sub -split '[\\/]').Count
      $relativeFromFile = ("../" * $depth)
    }
  }

  $cssLine = "  <link rel=`"stylesheet`" href=`"$($relativeFromFile)assets/css/ajuste-logo-menu-card-v3.css`" />"

  if ($content -notlike '*ajuste-logo-menu-card-v3.css*') {
    $content = $content.Replace('</head>', $cssLine + "`r`n</head>")
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
Write-Host "Ajuste do card da logo aplicado. Atualize com Ctrl + F5."
