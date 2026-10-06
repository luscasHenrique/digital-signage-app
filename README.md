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

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | Build e servidor de produção |

## Documentação

Arquitetura, rotas, permissões, modelo de dados e fluxos: [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md).
