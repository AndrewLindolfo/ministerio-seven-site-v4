# Ministério Seven V4 — restrição forte de Cifras/Ferramentas para Integrantes
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
        Write-Warning "Nao foi possivel atualizar: $file. Feche VS Code/Live Server/navegador e rode novamente."
        return $false
      }
    }
  }
}

function Ensure-LineBefore($content, $needle, $line) {
  if ($content -like "*$line*") { return $content }
  if ($content -like "*$needle*") { return $content.Replace($needle, $line + "`r`n" + $needle) }
  return $content
}

# 1) Garante import e inicializacao no app.js
$appFile = Join-Path (Get-Location) "assets\js\app.js"
if (Test-Path $appFile) {
  $content = Get-Content -LiteralPath $appFile -Raw -Encoding UTF8
  $original = $content

  $importLine = 'import { initIntegranteRestrictions } from "./modules/integrante-restrictions.js";'
  if ($content -notlike "*$importLine*") {
    $content = $importLine + "`r`n" + $content
  }

  if ($content -notlike "*initIntegranteRestrictions();*") {
    if ($content -like "*initPublicAuth();*") {
      $content = $content.Replace('initPublicAuth();', 'initPublicAuth();' + "`r`n  initIntegranteRestrictions();")
    } else {
      $content = $content.Replace('initThemeBranding();', 'initThemeBranding();' + "`r`n  initIntegranteRestrictions();")
    }
  }

  if ($content -ne $original) {
    if (Set-ContentWithRetry $appFile $content) { Write-Host "Atualizado: assets\js\app.js" }
  } else {
    Write-Host "Sem alteracao: assets\js\app.js"
  }
} else {
  Write-Warning "assets\js\app.js nao encontrado."
}

# 2) Adiciona CSS nas paginas publicas raiz
$htmlFiles = Get-ChildItem -Path . -Filter *.html -File | Where-Object { $_.Directory.FullName -eq (Get-Location).Path }
foreach ($item in $htmlFiles) {
  $file = $item.FullName
  $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8
  $original = $content
  $cssLine = '  <link rel="stylesheet" href="assets/css/integrante-restrictions.css" />'
  if ($content -notlike '*integrante-restrictions.css*') {
    $content = Ensure-LineBefore $content '</head>' $cssLine
  }
  if ($content -ne $original) {
    if (Set-ContentWithRetry $file $content) { Write-Host "Atualizado: $($item.Name)" }
  }
}

Write-Host ""
Write-Host "Restricao forte aplicada: Cifras e Ferramentas aparecem somente para Integrantes/ADMs."
Write-Host "Depois atualize o navegador com Ctrl + F5."
Write-Host "Lembre-se: publique as regras do firestore.rules no Firebase para bloquear tambem a leitura direta no banco."
