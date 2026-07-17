# Ministério Seven V4 — aplicar correções mobile/tablet
# Execute na raiz do site.

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

$cssRel = "assets/css/mobile-tablet-correcoes.css"
$cssLine = "  <link rel=`"stylesheet`" href=`"$cssRel`" />"

$publicHtmlFiles = Get-ChildItem -Path . -Filter *.html -File | Where-Object {
  $_.FullName -notmatch "\\admin\\"
}

foreach ($item in $publicHtmlFiles) {
  $file = $item.FullName
  try {
    $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8
  } catch {
    Write-Warning "Nao foi possivel ler: $file"
    continue
  }

  $original = $content

  # Remove referencia duplicada, se existir.
  $content = [regex]::Replace(
    $content,
    '(?is)\s*<link[^>]+href=["''][^"'']*mobile-tablet-correcoes\.css[^"'']*["''][^>]*>',
    ''
  )

  # Insere por ultimo no head para sobrescrever os estilos antigos apenas no mobile/tablet.
  if ($content -match '(?i)</head>') {
    $content = [regex]::Replace($content, '(?i)</head>', "$cssLine`r`n</head>", 1)
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
Write-Host "Correcoes mobile/tablet aplicadas. Atualize o navegador com Ctrl + F5."
