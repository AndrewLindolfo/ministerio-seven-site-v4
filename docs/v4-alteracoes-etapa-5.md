# Ministério Seven V4 — Etapa 5: Regras finais do Firestore

## Alterações

- Substituído `firestore.rules` temporário por regras finais mais restritas.
- Conteúdo público continua com leitura pública.
- Conteúdo vocal fica restrito a admin ou usuário marcado em `vocalistas/{uid}`.
- Escrita administrativa passa a exigir admin reconhecido pelas regras.
- Perfil público e biblioteca pessoal ficam restritos ao dono do UID ou admin.
- Contato público permite apenas criação validada; leitura/edição/exclusão somente admin.
- Logs administrativos ficam restritos a admin.
- O cabeçalho público foi ajustado para não quebrar caso um usuário comum não tenha permissão de ler documentos de admin.

## Observação

As regras reconhecem o admin master pelo documento `admins/master` com o campo `uid` igual ao UID autenticado.
Para administradores secundários com permissão real nas regras, o ideal é manter também um documento `admins/{uid}`.
