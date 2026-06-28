# V4 — Etapa 4.1 — Correção do arraste da auto-rolagem vocal

Correções aplicadas:

- Corrigido o cálculo de posição do painel de auto-rolagem da página Música Vocal.
- O painel usa `position: fixed`, então agora o arraste usa coordenadas da tela, sem somar `scrollY`/`scrollX`.
- Isso evita o bug em que o painel pulava para baixo ao iniciar o arraste.
- Mantida proteção para o painel não sair da tela.
- Mantida compatibilidade com posições antigas salvas no navegador.

Observação pendente para etapa futura:

- Revisar e melhorar a exportação PDF das músicas/cifras.
