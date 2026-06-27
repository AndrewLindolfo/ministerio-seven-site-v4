# Ministério Seven V4 — Etapa 2

## Escopo desta etapa

Esta etapa implementa a separação entre músicas públicas e músicas do vocal.

## Alterações aplicadas

- A página pública `Músicas` passou a ler a coleção `musicasPublicas`.
- A página pública `Música` não inicia mais ferramentas internas como auto-rolagem, tela cheia, tamanho de fonte e PDF.
- A página pública `Música` não exibe vídeo do YouTube.
- Foi criada a página `Músicas Vocal`, em `musicas-vocal.html`.
- Foi criada a página individual `Música Vocal`, em `musica-vocal.html`.
- `Músicas Vocal` lê a coleção antiga `musicas`, mantendo o conteúdo atual como área interna do vocal.
- A página `Música Vocal` mantém ferramentas completas, vídeo do YouTube e observações internas.
- O vídeo na página do vocal foi ajustado para proporção 16:9.
- A janela de auto-rolagem da página do vocal passa a iniciar fechada ao abrir a música.
- A janela de auto-rolagem abre/fecha pelo botão e fecha pelo X.
- O ADM agora tem duas áreas: `Músicas` e `Músicas Vocal`.
- O cadastro público `Músicas` não possui campo de YouTube nem observação interna.
- O cadastro `Músicas Vocal` mantém YouTube e observação interna.
- Foi criada a área `Vocalistas` no ADM para marcar usuários autorizados.
- O menu do site adiciona `Músicas Vocal` apenas para administradores ou usuários marcados como vocalistas.

## Coleções usadas

- `musicasPublicas`: músicas públicas do site.
- `musicas`: músicas internas do vocal, aproveitando a base atual.
- `vocalistas`: usuários autorizados a acessar Músicas Vocal.
- `usuariosPublicos`: usuários que fizeram login no site.

## Como testar

1. Entrar no ADM.
2. Cadastrar uma música em `Músicas`.
3. Conferir se ela aparece em `musicas.html` e abre em `musica.html` sem vídeo/ferramentas internas.
4. Conferir se as músicas antigas aparecem em `Músicas Vocal`.
5. Entrar em `Vocalistas` e marcar um usuário como vocalista.
6. Entrar no site com esse usuário e verificar se o menu exibe `Músicas Vocal`.
