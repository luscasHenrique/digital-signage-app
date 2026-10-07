# 1. Criar a variável `CRON_SECRET` na Vercel

## O que é e por que precisa

Uma vez por dia, às **03:30 (horário de Brasília)**, a Vercel chama sozinha o endereço `/api/cron/cleanup-uploads` do sistema. Essa rotina:
- apaga do Storage as **imagens e vídeos que ninguém usa**, como os de um anúncio que começou a ser criado e foi abandonado sem salvar, desde que tenham mais de 24 h;
- apaga os **registros de erro com mais de 30 dias** (página Administração → Erros).

O endereço é público. Para que só a Vercel consiga acioná-lo, ele exige uma senha, a `CRON_SECRET`. **Sem essa variável, a rotina recusa todas as chamadas e nada é limpo.** O sistema funciona normalmente, mas o Storage vai acumulando arquivos.

## Passo a passo

### 1. Gerar uma senha longa e aleatória

No terminal, dentro da pasta do projeto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Vai sair algo como `9f2c...e41a`, com 64 caracteres. Copie. Não reaproveite outra senha.

### 2. Cadastrar na Vercel

1. <https://vercel.com> → projeto **digital-signage-app** → **Settings** → **Environment Variables**.
2. Clique em **Add New** e preencha:
   - **Key:** `CRON_SECRET`
   - **Value:** a senha gerada
   - **Environments:** marque **Production**. Preview e Development não precisam.
3. **Save**.

### 3. Publicar de novo

As variáveis só valem para deploys feitos **depois** de cadastradas.

1. Abra a aba **Deployments**.
2. No deploy mais recente, clique em **⋯** e depois em **Redeploy**.
3. Confirme.

### 4. Conferir

Em **Settings → Cron Jobs** deve aparecer `/api/cron/cleanup-uploads` com o horário `30 6 * * *` (06:30 UTC = 03:30 em Brasília). Clique em **Run** para rodar agora.

Para testar pelo terminal, troque os dois valores:

```bash
curl -H "Authorization: Bearer SUA-CRON-SECRET" https://SEU-DOMINIO/api/cron/cleanup-uploads
```

A resposta esperada é parecida com:

```json
{ "scanned": 12, "removed": 0, "errorLogsRemoved": 0 }
```

- `scanned`: quantos arquivos existem no Storage.
- `removed`: quantos arquivos sem uso foram apagados.
- `errorLogsRemoved`: quantos erros antigos foram apagados.

Se aparecer `{"error":"unauthorized"}`, a senha está errada ou o redeploy ainda não foi feito.

> Os resultados das execuções diárias aparecem em **Vercel → Logs**. Filtre por `/api/cron/cleanup-uploads` e procure a linha "Limpeza diária".
