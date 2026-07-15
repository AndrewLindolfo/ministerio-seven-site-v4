# Ministério Seven V4 — restaurar botão de login público
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

# Corrigir public-auth.js: o slot de login não pode depender da existência do botão mobile.
Update-TextFile ".\assets\js\public-auth.js" {
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

# Adicionar CSS/JS de segurança nas páginas públicas, sem mexer no /admin.
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
    if ($c -notlike '*public-login-restore.css*') {
      $c = $c -replace '</head>', '  <link rel="stylesheet" href="assets/css/public-login-restore.css" />`r`n</head>'
    }
    if ($c -notlike '*public-login-restore.js*') {
      $c = $c -replace '</body>', '  <script type="module" src="assets/js/public-login-restore.js"></script>`r`n</body>'
    }
    return $c
  }
}

Write-Host ""
Write-Host "Correcao aplicada: botao de login publico restaurado. Atualize com Ctrl + F5."
