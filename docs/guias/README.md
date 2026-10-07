# Guias de configuração

Passo a passo das configurações que ficam **fora do código**, nos painéis da Vercel e do Supabase. Faça na ordem.

| # | Guia | Para quê | Tempo |
|---|---|---|---|
| 0 | [Descobrir o seu domínio](#0-descobrir-o-seu-domínio) | Os outros guias usam esse endereço | 1 min |
| 1 | [CRON_SECRET na Vercel](1-vercel-cron-secret.md) | Ligar a limpeza diária de arquivos e erros antigos | 5 min |
| 2 | [URLs de retorno no Supabase](2-supabase-urls.md) | O link do "Esqueci minha senha" voltar para o painel | 3 min |
| 3 | [SMTP próprio no Supabase](3-supabase-smtp.md) | Os e-mails de senha chegarem sem limite baixo | 15–30 min |
| — | [Como funcionam as telas](4-como-funcionam-as-telas.md) | Entender "No ar", "Sem sinal", modo offline, programação e relatório | leitura |

---

## 0. Descobrir o seu domínio

1. Entre em <https://vercel.com> e abra o projeto **digital-signage-app**.
2. Na página do projeto, o endereço aparece em **Domains**, por exemplo `digital-signage-app-xxxx.vercel.app` ou um domínio próprio. Também está em **Settings → Domains**.
3. Anote esse endereço com `https://`. Nos guias, ele aparece como **`https://SEU-DOMINIO`**.

> O endereço cadastrado no GitHub (`digital-signage-app-phi.vercel.app`) **não existe mais**. Use o que aparece na Vercel.
