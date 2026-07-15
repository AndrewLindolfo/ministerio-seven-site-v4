# Ministério Seven V4 — corrigir login do cabeçalho para abrir popup Google
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

# 1) Corrige o public-auth.js: o botão de login não pode depender do botão mobile.
$PublicAuth = ".\assets\js\public-auth.js"
if (Test-Path $PublicAuth) {
  if (-not (Test-Path ".\assets\js\public-auth.backup-antes-login-popup.js")) {
    Copy-Item $PublicAuth ".\assets\js\public-auth.backup-antes-login-popup.js" -Force
  }

  Update-TextFile $PublicAuth {
    param($c)
    $new = @'
function ensureHeaderSlot() {
  const actions = $(".header-actions");
  if (!actions) return null;

  let slot = $("#public-user-slot");
  if (slot) return slot;

  slot = document.createElement("div");
  slot.id = "public-user-slot";
  slot.className = "public-user-slot";

  const mobileToggle = $("#mobile-menu-toggle");
  if (mobileToggle && mobileToggle.parentElement === actions) {
    actions.insertBefore(slot, mobileToggle);
  } else {
    actions.appendChild(slot);
  }

  return slot;
}
'@
    $pattern = '(?s)function ensureHeaderSlot\(\) \{.*?\n\}'
    if ($c -match $pattern) {
      $c = [regex]::Replace($c, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $new }, 1)
    }
    return $c
  }
}

# 2) Remove o script antigo que colocou fallback para login.html.
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
    $c = [regex]::Replace($c, '(?is)\s*<link[^>]+href=["''][^"'']*public-login-restore\.css[^"'']*["''][^>]*>', '')
    $c = [regex]::Replace($c, '(?is)\s*<script[^>]+src=["''][^"'']*public-login-restore\.js[^"'']*["''][^>]*>\s*</script>', '')

    if ($c -notlike '*login-popup-fix.js*') {
      $c = $c -replace '</body>', '  <script type="module" src="assets/js/login-popup-fix.js"></script>`r`n</body>'
    }
    return $c
  }
}

# 3) Opcional: remove arquivos antigos para não conflitar mais.
Remove-Item ".\assets\js\public-login-restore.js" -Force -ErrorAction SilentlyContinue
Remove-Item ".\assets\css\public-login-restore.css" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Correcao aplicada: clique no icone de usuario volta a abrir popup de login Google. Atualize com Ctrl + F5."
