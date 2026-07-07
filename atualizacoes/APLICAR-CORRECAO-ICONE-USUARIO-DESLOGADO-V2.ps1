# Ministério Seven V4 — Correção V2 do ícone de usuário deslogado no cabeçalho
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

$cssLine = '  <link rel="stylesheet" href="assets/css/seven-header-user-icon-fix-v2.css" />'
$htmlFiles = Get-ChildItem -Path . -Filter *.html -File | Where-Object {
  $_.FullName -notmatch '\\admin\\' -and
  $_.Name -notmatch '^admin-'
}

foreach ($item in $htmlFiles) {
  $file = $item.FullName
  try { $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8 } catch { continue }
  $original = $content

  if ($content -notmatch 'seven-header-user-icon-fix-v2\.css') {
    $content = $content.Replace('</head>', $cssLine + "`r`n</head>")
  }

  if ($content -ne $original) {
    if (Set-ContentWithRetry $file $content) { Write-Host "Atualizado: $($item.Name)" }
  } else {
    Write-Host "Sem alteracao: $($item.Name)"
  }
}

Write-Host ""
Write-Host "Correcao aplicada: icone de usuario deslogado V2 ajustado. Atualize com Ctrl + F5."
