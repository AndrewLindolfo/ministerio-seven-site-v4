# Firebase V4 — Primeiro acesso

## Projeto conectado

Este pacote já está conectado ao projeto Firebase:

- projectId: `ministerio-seven-v4`
- authDomain: `ministerio-seven-v4.firebaseapp.com`

## Regras temporárias

O arquivo `firestore.rules` deste pacote contém regras temporárias de desenvolvimento.
Use somente para o primeiro teste local e para permitir o primeiro login do admin master.
Não publicar o site com essas regras.

## Criar admin master no Firestore

Antes do primeiro login administrativo, crie manualmente no Firestore:

Coleção: `admins`
Documento: `master`

Campos recomendados:

```text
name: Andrew
email: lindolfoandrew0@gmail.com
active: true
isPrimary: true
pendingUid: true
```

Depois abra o site local, entre em `/login.html` e faça login com a conta Google `lindolfoandrew0@gmail.com`.
O sistema deve vincular automaticamente o UID desse usuário ao documento admin master.
