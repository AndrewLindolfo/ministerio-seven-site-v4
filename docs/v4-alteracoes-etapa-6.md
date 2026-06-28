# V4 — Etapa 6 — Backup seletivo e importação seletiva

## O que mudou

- A tela `admin/backup.html` agora abre uma janela para escolher o que será exportado.
- A exportação permite marcar/desmarcar partes do site antes de gerar o arquivo JSON.
- A importação analisa o arquivo selecionado antes de recuperar dados.
- Nada é importado automaticamente ao escolher o arquivo.
- A janela de importação mostra o que foi encontrado no arquivo e permite marcar somente o que será recuperado.
- Exportação e importação possuem a opção `Selecionar todas`.

## Seções disponíveis

- Administradores
- Usuários públicos
- Vocalistas
- Músicas públicas
- Músicas Vocal
- Cifras
- Programações
- Ensaios
- Álbuns/Fotos
- Downloads gerais
- Downloads por música
- Notificações
- Contatos
- Links
- Configurações
- Favoritos e playlists
- Log de atividades

## Formato do backup

O formato continua sendo JSON, porque é fácil para o próprio site ler e também fácil de conferir manualmente.

O arquivo contém:

- `_meta`: dados do backup, versão, data e seções selecionadas;
- `_summary`: resumo do que foi exportado;
- uma chave para cada coleção exportada.

## Segurança

- A importação usa os mesmos IDs dos documentos do arquivo.
- Se um documento já existir com o mesmo ID, ele é atualizado com `merge: true`.
- A restauração não apaga documentos que não estão no arquivo.

## Regra Firestore ajustada

A coleção `contatos` agora permite `create` por admin, além do envio público normal, para que backups de mensagens possam ser restaurados pelo painel administrativo.
