Ministério Seven — Site V4 com painel ADM refeito

Este pacote preserva as páginas públicas do ZIP enviado e substitui somente a pasta /admin por um painel administrativo refeito do zero.

Como testar:
1. Extraia todo o conteúdo deste ZIP dentro da pasta nova de teste.
2. Abra a pasta no VS Code.
3. Rode o Live Server.
4. Acesse /admin/index.html.

O que foi removido/limpo:
- pasta .git do ZIP enviado;
- pasta .vscode;
- scripts APLICAR-*.ps1;
- painel /admin antigo com remendos v7 empilhados.

O que foi mantido:
- páginas públicas como estavam no ZIP enviado;
- assets públicos;
- Firebase, serviços, regras e scripts funcionais do sistema;
- módulos de backup/importação, permissões, logs, músicas, cifras, fotos, downloads e contatos.

Rotas ADM principais:
/admin/index.html
/admin/musicas-publicas.html
/admin/musicas-vocal.html
/admin/vocalistas.html
/admin/cifras.html
/admin/programacoes.html
/admin/fotos.html
/admin/downloads.html
/admin/downloads-geral.html
/admin/downloads-por-musica.html
/admin/contatos.html
/admin/links.html
/admin/notificacoes.html
/admin/ensaios.html
/admin/backup.html
/admin/admins.html
/admin/logs.html
/admin/config.html
