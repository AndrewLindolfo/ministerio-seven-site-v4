# Etapa 7.2 — Ajuste dos links Música / Vocal / Cifra

Alterações:

- Removido o botão **Ver cifra** da página pública `musica.html`.
- Mantido o botão **Ver cifra** somente na página `musica-vocal.html`.
- Ajustado o botão da página `cifra.html` para apontar para `musica-vocal.html` usando o ID/vínculo da música vocal (`musicaId`) e, quando necessário, o slug da cifra como fallback.
- Texto do botão da cifra ajustado para **Ver música**.

Objetivo:

- Música pública fica apenas como letra pública.
- Música Vocal continua sendo o ponto de ida para cifra.
- Cifra volta para a música vocal correspondente, não para a música pública.
