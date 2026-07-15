# Ministério Seven V4 — restauro correto do login público
# Execute na raiz do projeto.
# Corrige:
# - botão de login sumido no header público
# - login público abrindo popup Google sem redirecionar ao ADM
# - ADM aparece no menu do usuário apenas quando a conta tem permissão ADM
# - integrantes/vocalistas liberam recursos públicos sem liberar ADM
# - remove sobras literais `r`n no topo da página

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

function Update-TextFile($file, [scriptblock]$transform) {
  if (-not (Test-Path $file)) { return }
  try { $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8 } catch { return }
  $original = $content
  $content = & $transform $content
  if ($content -ne $original) {
    if (Set-ContentWithRetry $file $content) { Write-Host "Atualizado: $file" }
  } else {
    Write-Host "Sem alteracao: $file"
  }
}

# 1) Restaura o public-auth.js correto.
$SourcePublicAuth = ".\assets\js\public-auth.js"
$PatchPublicAuth = ".\assets\js\public-auth.js.__patch_login_publico_correto"

# O arquivo do patch vem temporariamente com outro nome para evitar conflito durante a extração.
if (Test-Path $PatchPublicAuth) {
  if ((Test-Path $SourcePublicAuth) -and -not (Test-Path ".\assets\js\public-auth.backup-antes-restauro-login-correto.js")) {
    Copy-Item $SourcePublicAuth ".\assets\js\public-auth.backup-antes-restauro-login-correto.js" -Force
  }
  Copy-Item $PatchPublicAuth $SourcePublicAuth -Force
  Remove-Item $PatchPublicAuth -Force -ErrorAction SilentlyContinue
  Write-Host "Restaurado: assets\js\public-auth.js"
}

# 2) Remove scripts/arquivos de correções anteriores que desviavam para login.html ou quebravam o header.
Remove-Item ".\assets\js\public-login-restore.js" -Force -ErrorAction SilentlyContinue
Remove-Item ".\assets\css\public-login-restore.css" -Force -ErrorAction SilentlyContinue
Remove-Item ".\assets\js\login-popup-fix.js" -Force -ErrorAction SilentlyContinue

# 3) Corrige HTMLs públicos: remove refs antigas, remove artefatos `r`n e injeta CSS do login correto.
$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -File -Recurse | Where-Object {
  $_.FullName -notmatch '\\admin\\' -and
  $_.FullName -notmatch '\\node_modules\\' -and
  $_.FullName -notmatch '\\.git\\' -and
  $_.FullName -notmatch '\\dist\\' -and
  $_.FullName -notmatch '\\build\\'
}

foreach ($item in $htmlFiles) {
  Update-TextFile $item.FullName {
    param($c)

    # Remove referências de patches anteriores de login.
    $c = [regex]::Replace($c, '(?is)\s*<link[^>]+href=["''][^"'']*public-login-restore\.css[^"'']*["''][^>]*>', '')
    $c = [regex]::Replace($c, '(?is)\s*<script[^>]+src=["''][^"'']*public-login-restore\.js[^"'']*["''][^>]*>\s*</script>', '')
    $c = [regex]::Replace($c, '(?is)\s*<script[^>]+src=["''][^"'']*login-popup-fix\.js[^"'']*["''][^>]*>\s*</script>', '')

    # Remove lixo literal que apareceu no topo por causa de patch anterior.
    $c = $c.Replace('`r`n', "`r`n")
    $c = $c.Replace('``r``n', "`r`n")
    $c = [regex]::Replace($c, '(?m)^\s*[`´''’]?r[`´''’]?n\s*$', '')
    $c = [regex]::Replace($c, '(?is)^\s*[`´''’]?r[`´''’]?n\s*(?=<!doctype|<html)', '')

    # Injeta CSS visual do login se ainda não existir.
    if ($c -notlike '*public-login-correto.css*') {
      $line = '  <link rel="stylesheet" href="assets/css/public-login-correto.css" />'
      $c = $c.Replace('</head>', $line + "`r`n</head>")
    }

    return $c
  }
}

Write-Host ""
Write-Host "Login publico restaurado corretamente. Atualize com Ctrl + F5."
