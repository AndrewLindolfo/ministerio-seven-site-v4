
# Ministério Seven V4 — alterar Vocalistas para Integrantes
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

# 1) Atualizar navegação/labels nas páginas ADM.
$adminFiles = Get-ChildItem -Path ".\admin" -Filter "*.html" -File -ErrorAction SilentlyContinue
foreach ($item in $adminFiles) {
  if ($item.Name -eq "vocalistas.html") { continue }
  Update-TextFile $item.FullName {
    param($c)
    $c = $c -replace 'href="vocalistas\.html"', 'href="integrantes.html"'
    $c = $c -replace 'data-admin-module="vocalistas"', 'data-admin-module="integrantes"'
    $c = $c -replace '>Vocalistas<', '>Integrantes<' 
    $c = $c -replace 'Vocalistas \| Admin Seven', 'Integrantes | Admin Seven'
    $c = $c -replace '<h1>Vocalistas</h1>', '<h1>Integrantes</h1>'
    $c = $c -replace 'Marque os usuários que poderão acessar a página Músicas Vocal\.', 'Marque os usuários integrantes que poderão acessar a página Músicas Vocal. No futuro, este módulo também poderá liberar acessos para banda e outros perfis.'
    return $c
  }
}

# 2) Atualizar scripts do ADM.
Update-TextFile ".\assets\js\admin-refeito.js" {
  param($c)
  $c = $c -replace 'vocalistas: "vocalistas",', 'integrantes: "integrantes",`r`n  vocalistas: "integrantes",'
  $c = $c -replace "if\(f\.includes\('vocalistas'\)\) return 'vocalistas';", "if(f.includes('integrantes') || f.includes('vocalistas')) return 'integrantes';"
  return $c
}

Update-TextFile ".\assets\js\pages\admin-dashboard.js" {
  param($c)
  $c = $c -replace 'vocalistas: "vocalistas",', 'integrantes: "integrantes",`r`n  vocalistas: "integrantes",'
  return $c
}

Update-TextFile ".\assets\js\auth-guard.js" {
  param($c)
  $c = $c -replace 'if \(path\.endsWith\("/admin/vocalistas\.html"\)\) return "vocalistas";', 'if (path.endsWith("/admin/integrantes.html") || path.endsWith("/admin/vocalistas.html")) return "integrantes";'
  $c = $c -replace 'editor-vocalista', 'editor-integrante'
  return $c
}

# 3) Atualizar página de permissões ADM.
Update-TextFile ".\assets\js\pages\admin-admins.js" {
  param($c)
  $c = $c -replace 'vocalistas: "Vocalistas",', 'integrantes: "Integrantes",'
  $c = $c -replace 'vocalistas: \{ create: "Pode cadastrar", edit: "Pode editar", delete: "Pode excluir", activate: "Pode ativar/desativar" \},', 'integrantes: { create: "Pode cadastrar", edit: "Pode editar", delete: "Pode excluir", activate: "Pode ativar/desativar" },'
  $c = $c -replace 'Vocalistas', 'Integrantes'
  return $c
}

# 4) Atualizar acesso público das Músicas Vocal para usar Integrantes, mantendo compatibilidade.
foreach ($file in @(".\assets\js\pages\musicas-vocal.js", ".\assets\js\pages\musica-vocal.js")) {
  Update-TextFile $file {
    param($c)
    $c = $c -replace 'import \{ isVocalista \} from "\.\./services/vocalistas-service\.js";', 'import { isIntegrante } from "../services/integrantes-service.js";'
    $c = $c -replace 'isVocalista\(firebaseUser\.uid\)', 'isIntegrante(firebaseUser.uid)'
    $c = $c -replace 'const \[admin, vocalista\] = await Promise\.all\(', 'const [admin, integrante] = await Promise.all('
    $c = $c -replace 'return !!admin \|\| !!vocalista;', 'return !!admin || !!integrante;'
    $c = $c -replace 'profile\?\.isAdmin \|\| profile\?\.isVocalista', 'profile?.isAdmin || profile?.isIntegrante || profile?.isVocalista'
    $c = $c -replace 'vocalistas autorizados', 'integrantes autorizados'
    $c = $c -replace 'Erro ao verificar acesso vocal', 'Erro ao verificar acesso de integrante'
    return $c
  }
}

Update-TextFile ".\assets\js\public-auth.js" {
  param($c)
  $c = $c -replace 'import \{ isVocalista \} from "\.\/services\/vocalistas-service\.js";', 'import { isIntegrante } from "./services/integrantes-service.js";'
  $c = $c -replace 'profile\.isAdmin \|\| profile\.isVocalista', 'profile.isAdmin || profile.isIntegrante || profile.isVocalista'
  $c = $c -replace 'isVocalista: !!profile\.isVocalista,', 'isIntegrante: !!(profile.isIntegrante || profile.isVocalista),`r`n      isVocalista: !!(profile.isIntegrante || profile.isVocalista),'
  $c = $c -replace 'isVocalista: !!\(await isVocalista\(user\?\.uid \|\| ""\)\)', 'isIntegrante: !!(await isIntegrante(user?.uid || "")),`r`n    isVocalista: !!(await isIntegrante(user?.uid || ""))'
  $c = $c -replace 'profile\.isVocalista \? "vocal" : "novocal"', '(profile.isIntegrante || profile.isVocalista) ? "integrante" : "nao-integrante"'
  $c = $c -replace 'syncVocalNavLink\(profile\.isAdmin \|\| profile\.isVocalista\);', 'syncVocalNavLink(profile.isAdmin || profile.isIntegrante || profile.isVocalista);'
  return $c
}

# 5) Backup: nova nomenclatura e coleção nova no Firebase.
Update-TextFile ".\assets\js\services\backup-service.js" {
  param($c)
  $c = $c -replace 'id: "vocalistas",\s*label: "Vocalistas",\s*description: "Liberação de acesso à área Músicas Vocal\.",\s*collections: \["vocalistas"\]', 'id: "integrantes",`r`n    label: "Integrantes",`r`n    description: "Liberação de acesso à área Músicas Vocal e, futuramente, Banda.",`r`n    collections: ["integrantes", "vocalistas"]'
  $c = $c -replace '"vocalistas",', '"integrantes",'
  $c = $c -replace 'Vocalistas', 'Integrantes'
  return $c
}

Write-Host ""
Write-Host "Alteracao aplicada: Vocalistas -> Integrantes."
Write-Host "Importante: para o Firebase reconhecer a nova colecao 'integrantes', publique o firestore.rules atualizado."
Write-Host "Depois atualize o navegador com Ctrl + F5."
