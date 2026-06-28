# Etapa 5.2 — Correção de acesso master e cache vocal

Alterações:
- Regras do Firestore ajustadas para permitir leitura da coleção `admins` por usuários logados, mantendo escrita somente para admin.
- Reconhecimento do e-mail master reforçado no código (`lindolfoandrew0@gmail.com`).
- Menu `Músicas Vocal` não é mais restaurado por cache genérico antes de confirmar o usuário atual.
- Cache de cabeçalho/permissão recebeu nova versão para ignorar caches antigos problemáticos.
- Páginas `musicas-vocal.html` e `musica-vocal.html` agora usam o perfil público já carregado antes de fazer novas consultas.
