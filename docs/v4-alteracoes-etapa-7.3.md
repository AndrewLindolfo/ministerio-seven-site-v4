# Etapa 7.3 — Correção de piscada no cabeçalho

Ajustes realizados:

- `assets/js/public-auth.js`
  - `Músicas Vocal` deixou de ser removido e recriado a cada confirmação de login.
  - Link vocal agora é sincronizado de forma idempotente: só muda quando precisa mudar.
  - Cache do usuário e da permissão vocal agora usa versão nova (`v3`) e migra versões antigas.
  - Cache restaurado imediatamente no carregamento da página quando pertence ao mesmo usuário salvo.
  - Avatar/menu do usuário não é recriado quando os dados finais são iguais aos dados em cache.
  - Logout limpa caches antigos e novos.

- `assets/js/app.js`
  - Inicialização do cabeçalho/login foi antecipada para reduzir atraso visual.
  - Aplicação inicializa imediatamente quando o documento já está pronto.

- `assets/js/auth.js`
  - Logout administrativo limpa caches antigos e novos do cabeçalho público.

- `assets/js/modules/programacao-card.js`
  - Leitura do cache vocal atualizada para a versão nova com compatibilidade legada.

- `assets/css/layout.css`
  - Slot do usuário passou a reservar espaço fixo no cabeçalho para evitar salto visual.

- `service-worker.js`
  - Nome do cache atualizado.
  - Estratégia alterada para priorizar rede e limpar caches antigos.
