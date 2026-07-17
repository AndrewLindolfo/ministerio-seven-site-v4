# Ministério Seven V4 — restringir Cifras e Ferramentas para Integrantes/ADMs
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

$root = (Get-Location).Path
$app = Join-Path $root "assets\js\app.js"
$rules = Join-Path $root "firestore.rules"

if (-not (Test-Path $app)) {
  Write-Warning "assets\js\app.js nao encontrado. Rode este script na raiz do site."
  exit
}

# Backup do app.js antes de alterar.
$backupApp = Join-Path $root "assets\js\app.backup-antes-restringir-cifras-ferramentas.js"
if (-not (Test-Path $backupApp)) {
  Copy-Item -LiteralPath $app -Destination $backupApp -Force
}

$content = Get-Content -LiteralPath $app -Raw -Encoding UTF8
$original = $content

# Corrigido: o texto de substituicao fica entre parenteses para evitar erro do -replace.
if ($content -notmatch 'restricted-public-access\.js') {
  $content = $content -replace 'import \{ initPublicAuth \} from "\.\/public-auth\.js";', ('import { initPublicAuth } from "./public-auth.js";' + "`r`n" + 'import { initRestrictedPublicAccess } from "./modules/restricted-public-access.js";')
}

if ($content -notmatch 'initRestrictedPublicAccess\(\)') {
  $content = $content -replace 'initPublicAuth\(\);', ('initPublicAuth();' + "`r`n" + '  initRestrictedPublicAccess();')
}

if ($content -ne $original) {
  if (Set-ContentWithRetry $app $content) { Write-Host "Atualizado: assets\js\app.js" }
} else {
  Write-Host "Sem alteracao: assets\js\app.js"
}

# Backup das regras do Firebase antes de substituir.
if (Test-Path $rules) {
  $backupRules = Join-Path $root "firestore.backup-antes-restringir-cifras-ferramentas.rules"
  if (-not (Test-Path $backupRules)) {
    Copy-Item -LiteralPath $rules -Destination $backupRules -Force
  }
}

Write-Host ""
Write-Host "Restricao aplicada no site."
Write-Host "IMPORTANTE: publique o arquivo firestore.rules atualizado no Firebase para bloquear a leitura direta das cifras no banco."
Write-Host "Depois atualize o navegador com Ctrl + F5."
