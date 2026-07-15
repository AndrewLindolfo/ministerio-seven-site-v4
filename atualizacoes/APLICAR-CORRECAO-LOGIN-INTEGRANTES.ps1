# Ministério Seven V4 — correção do login público + acesso de Integrantes
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

# 1) Os arquivos deste patch são substituídos ao extrair o ZIP.
# Este script apenas limpa referências antigas e ajusta as páginas que dependem de login/Integrantes.

# 2) Remove scripts antigos que estavam brigando com o login público.
$publicHtmlFiles = Get-ChildItem -Path . -Filter *.html -File | Where-Object { $_.FullName -notmatch '\\admin\\' }
foreach ($item in $publicHtmlFiles) {
  Update-TextFile $item.FullName {
    param($c)
    $c = [regex]::Replace($c, '(?is)\s*<script[^>]+src=["''][^"'']*public-login-restore\.js[^"'']*["''][^>]*>\s*</script>', '')
    $c = [regex]::Replace($c, '(?is)\s*<script[^>]+src=["''][^"'']*login-popup-fix\.js[^"'']*["''][^>]*>\s*</script>', '')
    $c = [regex]::Replace($c, '(?is)\s*<link[^>]+href=["''][^"'']*public-login-restore\.css[^"'']*["''][^>]*>', '')
    $c = [regex]::Replace($c, '(?is)\s*<link[^>]+href=["''][^"'']*public-login-correto\.css[^"'']*["''][^>]*>', '')
    $c = [regex]::Replace($c, '(?is)\s*<link[^>]+href=["''][^"'']*public-login-estavel\.css[^"'']*["''][^>]*>', '')
    $c = $c -replace '(?m)^\s*`r`n\s*', ''
    $c = $c -replace '(?m)^\s*r`n\s*', ''
    $c = $c -replace '(?m)^\s*\\r\\n\s*', ''
    $c = $c -replace '(<body[^>]*>)\s*`r`n\s*', '$1'
    $c = $c -replace '(<body[^>]*>)\s*r`n\s*', '$1'
    $line = '  <link rel="stylesheet" href="assets/css/public-login-estavel.css" />'
    if ($c -notlike '*assets/css/public-login-estavel.css*') {
      $c = $c.Replace('</head>', $line + "`r`n</head>")
    }
    return $c
  }
}

# 3) Garante que Músicas Vocal use a checagem de Integrantes atual, sem pedir login repetido.
Update-TextFile ".\assets\js\pages\musicas-vocal.js" {
  param($c)
  if ($c -notlike '*modules/integrante-access.js*') {
    $c = 'import { getIntegranteAccess } from "../modules/integrante-access.js";' + "`r`n" + $c
  }
  $replacement = @'
async function userCanAccessVocalList() {
  const access = await getIntegranteAccess({ openLogin: true });
  return access.allowed === true;
}
'@
  $c = [regex]::Replace($c, '(?is)async function userCanAccessVocalList\(\)\s*\{.*?\n\}\s*(?=\r?\n\r?\ndocument\.addEventListener)', $replacement)
  $c = $c -replace 'Área exclusiva para vocalistas autorizados\. Faça login com Google ou solicite liberação ao administrador\.', 'Área exclusiva para integrantes autorizados. Faça login com Google ou solicite a liberação do administrador.'
  $c = $c -replace 'vocalistas autorizados', 'integrantes autorizados'
  return $c
}

Update-TextFile ".\assets\js\pages\musica-vocal.js" {
  param($c)
  if ($c -notlike '*modules/integrante-access.js*') {
    $c = 'import { getIntegranteAccess } from "../modules/integrante-access.js";' + "`r`n" + $c
  }
  $replacement = @'
async function userCanAccessVocalPage() {
  const access = await getIntegranteAccess({ openLogin: true });
  return access.allowed === true;
}
'@
  $c = [regex]::Replace($c, '(?is)async function userCanAccessVocalPage\(\)\s*\{.*?\n\}\s*(?=\r?\n\r?\nfunction renderAccessDenied)', $replacement)
  $c = $c -replace 'Esta área é exclusiva para vocalistas autorizados\.', 'Esta área é exclusiva para integrantes autorizados.'
  $c = $c -replace 'marcar seu usuário como vocalista', 'liberar seu usuário como integrante'
  $c = $c -replace 'vocalistas autorizados', 'integrantes autorizados'
  return $c
}

Write-Host ""
Write-Host "Correção aplicada: login público persistente e acesso por Integrantes."
Write-Host "Atualize o navegador com Ctrl + F5."
