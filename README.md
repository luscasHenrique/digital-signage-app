# Digital Signage

Painel para gerenciar anúncios (imagens, vídeos e embeds do YouTube) e exibi-los em telas, com uma página de exibição por empresa. Essa página pode ser protegida por senha.

Feito com Next.js 15, React 19, Supabase e o design system [Liquid Glass](https://github.com/luscasHenrique/liquid-glass-ui).

## Começando

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev                  # http://localhost:3000
```

Variáveis necessárias:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET_KEY=
```

Aplique as migrações de `supabase/migrations/` no projeto Supabase.

## Banco local (recomendado para desenvolvimento)

O `.env.local` costuma apontar para o banco de produção. Para testar sem mexer em dados reais, suba um Supabase local (precisa do Docker Desktop aberto):

```bash
npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta
```

O comando aplica todas as migrações (`20251001000000_baseline_schema.sql` recria o schema de produção) e mostra as chaves locais. Crie um `.env.development.local` com elas. No `npm run dev` ele tem prioridade sobre o `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY do supabase start>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY do supabase start>
```

O `supabase db reset` recria o banco local com os dados de `supabase/seed.sql`: usuários `admin@local.test` e `standard@local.test` (senha `Senha-local-123`), duas empresas (`loja-centro` e `loja-privada`, senha `1234`) e alguns anúncios. Os testes `npm run test:e2e` usam esses dados e sobem o próprio servidor na porta 3100. Para voltar a usar produção, apague o `.env.development.local`. Para desligar: `npx supabase stop`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes (Vitest) |
| `npm run lint` | ESLint |
| `npm run db:types` | Regera `src/types/database.ts` a partir do Supabase local |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright) contra o Supabase local |
| `npm run build` / `npm start` | Build e servidor de produção |

## Documentação

Arquitetura, rotas, permissões, modelo de dados e fluxos: [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md).

Configuração da Vercel e do Supabase (CRON_SECRET, links de e-mail, SMTP) e como funcionam as telas: [docs/guias/](docs/guias/README.md).
