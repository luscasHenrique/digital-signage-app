# Digital Signage App — Documentação

> Primeira versão: varredura do código em 2026-10-06 (commit `76cf66e`). Atualizada no mesmo dia após as correções de segurança e bugs (seção 9).
> Este repositório só passou a ter SQL do banco com a migração [supabase/migrations/20261006000000_security_hardening.sql](../supabase/migrations/20261006000000_security_hardening.sql). As tabelas, as políticas RLS e os triggers anteriores continuam fora do repositório. Por isso, o modelo de dados abaixo foi **deduzido do código** e precisa ser confirmado no Supabase.

---

## 1. Visão geral

Plataforma de **sinalização digital (digital signage)**. Usuários cadastram **anúncios** (imagens, vídeos ou embeds do YouTube) em um painel administrativo e os vinculam a **empresas**. Cada empresa tem uma página de exibição (`/display/<slug>`) feita para rodar em tela cheia em TVs e monitores. A página troca os anúncios automaticamente, mostra um relógio e se atualiza sozinha.

| Área | O que faz |
|---|---|
| Login | Autenticação por e-mail/senha (Supabase Auth) |
| Anúncios | CRUD; upload de arquivo para o Storage ou link externo; agendamento (início/fim); duração por slide; status ativo/inativo; texto sobreposto (overlay) com cores e posição; vínculo com N empresas |
| Empresas | CRUD; slug único; opção de página **privada** protegida por senha |
| Display | Slideshow em tela cheia por empresa, atualizado por Realtime e por consulta a cada 30 s |
| Usuários (só ADMIN) | CRUD de usuários com papéis `ADMIN` / `STANDARD` |
| Auditoria (só ADMIN) | Lista paginada e filtrável da tabela `audit_logs`, que é preenchida por triggers no banco |

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js **15.5.7** (App Router, Server Components, Server Actions, Route Handlers) |
| UI | React 19.1, Tailwind CSS 4, shadcn/ui (estilo *new-york*) sobre Radix UI, lucide-react |
| Formulários | react-hook-form + zod 4 |
| Tabelas | @tanstack/react-table |
| Animações | framer-motion |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) via `@supabase/ssr` e `@supabase/supabase-js` |
| Segurança | `jose` (JWT HS256 do display privado), `node:crypto` scrypt (hash das senhas de empresa) |
| Testes | Vitest |

---

## 3. Como rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes automatizados (Vitest)
npm run lint
npm run build && npm run start
```

### Variáveis de ambiente (`.env.local`)

| Variável | Uso | Vai para o navegador? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. Também define o host liberado para imagens em `next.config.ts` | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima, sujeita a RLS | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço, que **ignora a RLS**. Só é usada no servidor (`server-only`) | Não |
| `JWT_SECRET_KEY` | Segredo usado para assinar o cookie de acesso aos displays privados | Não |

### Banco de dados

Aplique a migração [supabase/migrations/20261006000000_security_hardening.sql](../supabase/migrations/20261006000000_security_hardening.sql) **depois** de publicar o código. Use o SQL Editor do Supabase ou `supabase db push`. A seção 6 explica o que ela faz.

---

## 4. Estrutura de pastas

```
src/
├── middleware.ts              # Renova a sessão e exige login em /dashboard
├── actions/                   # Server Actions (alterações de dados)
│   ├── auth.ts                # login, logout
│   ├── advertisements.ts      # CRUD de anúncios, getSignedUploadUrl
│   ├── companies.ts           # CRUD de empresas, verifyCompanyPassword
│   └── users.ts               # CRUD de usuários (só ADMIN; usa service role)
├── app/
│   ├── (public)/              # "/" e "/login"
│   ├── (admin)/               # Painel (/dashboard/...)
│   ├── display/[slug]/        # Player e /auth (senha)
│   └── api/display/[slug]/    # GET com os anúncios ativos (usado pelo player)
├── components/
│   ├── admin/                 # Telas do painel
│   ├── auth/                  # LoginForm, PasswordForm
│   ├── display/               # CompanyDisplay (player)
│   └── ui/                    # shadcn + extras
├── config/menuData.ts         # Menu lateral (itens com restrição de papel)
├── lib/
│   ├── auth.ts                # getAuthContext() e requireAdminPage()
│   ├── display.ts             # Dados e controle de acesso do display (service role)
│   ├── display-token.ts       # Emissão e validação do JWT do display privado
│   ├── password.ts            # Hash (scrypt) e verificação das senhas de empresa
│   ├── rate-limit.ts          # Limite de tentativas em memória
│   ├── storage.ts             # Regras do bucket (tipos e tamanhos), helpers de URL
│   ├── advertisement-links.ts # Diferença entre os vínculos atuais e os desejados
│   ├── schemas.ts             # Schemas zod usados pelos formulários e pelas actions
│   └── supabase/              # Clientes: navegador, servidor e admin
└── types/                     # Enums, interfaces e helpers da auditoria
tests/                         # Testes Vitest e helpers (Supabase simulado)
supabase/migrations/           # SQL versionado
```

---

## 5. Rotas e permissões

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | Público | Página inicial |
| `/login` | Público (quem já está logado vai para `/dashboard`) | Login |
| `/dashboard`, `/dashboard/anuncios`, `/dashboard/empresas`, `/dashboard/empresas/[id]/anuncios` | Logado | Painel |
| `/dashboard/admin/usuarios`, `/dashboard/admin/auditoria` | **Só ADMIN** (os demais recebem 404) | Administração |
| `/display/[slug]` | Público, ou cookie válido se a empresa for privada | Player |
| `/display/[slug]/auth` | Público | Senha da empresa privada |
| `GET /api/display/[slug]` | Mesma regra do player | JSON com os anúncios ativos |

Cada camada faz a sua parte na autorização:
- **middleware**: exige sessão em `/dashboard/*` e usa `getUser()`, que valida o token.
- **páginas admin**: chamam `requireAdminPage()`.
- **Server Actions**: chamam `getAuthContext()`. As actions de usuários exigem `ADMIN`. Server Actions são endpoints HTTP, então nunca podem depender só do middleware.
- **display**: `hasDisplayAccess()` valida o JWT, que precisa ser da mesma empresa e da senha atual.

---

## 6. Modelo de dados (deduzido)

```
auth.users ──1:1── profiles (id, full_name, avatar_url, role: ADMIN|STANDARD)

companies (id uuid, name, slug, is_private, password [hash scrypt], created_at)
    └──N:M── advertisements_companies (advertisement_id, company_id)
advertisements (id, title, description, type, content_url, thumbnail_url,
                start_date, end_date, duration_seconds, status,
                overlay_text, overlay_position, overlay_bg_color, overlay_text_color,
                created_by, last_edited_by, created_at, updated_at)
audit_logs (id, created_at, action, table_name, record_pk, user_id, user_email,
            before_data, after_data)                 ← triggers
display_signals (company_id, updated_at)             ← nova; triggers + Realtime

Storage: bucket público "advertisements", caminho <user_id>/<timestamp>-<nome-sanitizado>
```

O que a migração de segurança faz:
1. Cria `display_signals` e os triggers que a atualizam quando anúncios ou vínculos de uma empresa mudam, e inclui a tabela na publicação do Realtime.
2. Tira do papel `anon` o acesso a `companies`, `advertisements` e `advertisements_companies`.
3. Impede que usuários logados leiam a coluna `companies.password` (passam a ter acesso apenas às colunas públicas).
4. Impede que usuários logados alterem `profiles.role` pela API.
5. Configura o bucket com limite de 200 MB e com os tipos de arquivo permitidos.

O banco também precisa ter:
- um trigger que cria a linha em `profiles` quando um usuário é criado;
- os triggers de auditoria.

---

## 7. Fluxos principais

### 7.1 Login
`LoginForm` → action `login` (`signInWithPassword`, cookies via `createActionClient`). O middleware redireciona entre `/login` e `/dashboard`. O layout do painel carrega o papel do usuário para montar o menu.

### 7.2 Anúncio com upload
1. O formulário valida tipo e tamanho do arquivo no navegador (`validateUploadFile`).
2. A action `getSignedUploadUrl` **repete a validação no servidor**, limpa o nome do arquivo e devolve uma URL assinada e a URL pública (`getPublicUrl`).
3. O navegador envia o arquivo (`PUT`) direto para o Storage.
4. `createAdvertisement` / `updateAdvertisement` validam os dados de novo. Os vínculos com empresas são sincronizados por diferença: primeiro inclui os novos, depois remove os retirados. Assim o anúncio nunca fica sem empresas. Se os vínculos falharem na criação, o anúncio é apagado para desfazer a operação.
5. Arquivos antigos do Storage são removidos quando possível (*best-effort*), sem impedir a operação se falharem.

### 7.3 Display
1. A página do servidor busca a empresa (service role) e verifica o acesso. Se for negado, redireciona para `/auth`.
2. Busca os anúncios `ACTIVE` com `start_date ≤ agora ≤ end_date`.
3. O player (`CompanyDisplay`) troca os anúncios de acordo com `duration_seconds`, mostra relógio, overlay e botão de tela cheia.
4. Atualização:
   - recarrega via `GET /api/display/[slug]` quando chega um evento Realtime em `display_signals` para aquela empresa, com debounce de 300 ms, e também a cada 30 s;
   - se a API responder 401 (senha trocada ou acesso expirado), volta para a tela de senha;
   - se houver falha de rede, mantém os anúncios atuais na tela.
5. Imagens do Supabase e do YouTube passam pelo otimizador do Next. Links de outros domínios são exibidos com `unoptimized`.

### 7.4 Display privado
1. `verifyCompanyPassword` aceita **5 tentativas a cada 15 min por IP e empresa**.
2. Lê a senha com service role e a compara com o hash scrypt. Senhas antigas em texto puro ainda são aceitas e são convertidas para hash no primeiro acesso.
3. Emite um JWT com `slug` e uma impressão digital da senha (`pv`), válido por 30 dias, em cookie `httpOnly` com `sameSite=lax`.
4. **Trocar a senha da empresa invalida todos os acessos já liberados.**

### 7.5 Auditoria
Só ADMIN. Lê `audit_logs` com filtros e paginação. O termo de busca é limpo antes de entrar no filtro `.or()` do PostgREST, e os parâmetros de página são normalizados.

---

## 8. Qualidade

| Verificação | Resultado (2026-10-06) |
|---|---|
| `tsc --noEmit` | ✅ sem erros |
| `eslint src tests` | ✅ 0 erros, 0 warnings |
| `npm test` | ✅ 43 testes em 10 arquivos |
| `npm run build` | ✅ (o aviso de Edge Runtime vem do supabase-js no middleware e já existia antes) |

Os testes cobrem:
- hash e verificação de senha;
- o token do display (outra empresa, senha trocada, assinatura falsa);
- o limite de tentativas;
- as regras de upload e de URL;
- a limpeza do termo de busca da auditoria;
- os schemas;
- as actions de usuários (bloqueio de não-ADMIN) e de empresas (hash, manutenção da senha, limite de tentativas);
- o controle de acesso do display.

Teste com o servidor de produção, contra o Supabase real e sem alterar dados:
- `/dashboard/admin/*` sem login redireciona para `/login`;
- `createCompany` e `deleteCompany` chamadas sem login retornam "não autenticado";
- a 6ª senha errada é bloqueada;
- a API do display devolve 404 para slug inexistente.

---

## 9. Achados e status

| # | Achado | Status |
|---|---|---|
| S1 | Actions e páginas de usuários sem checar autenticação e papel | ✅ Corrigido (`getAuthContext` + `requireAdminPage`; ADMIN não pode excluir a si mesmo nem remover o próprio papel) |
| S2 | Senha de empresa em texto puro e exposta | ✅ Hash scrypt com migração automática; leitura só com service role; páginas não enviam mais `password` para o navegador; a migração SQL bloqueia a coluna |
| S3 | Conteúdo de empresas privadas acessível pela chave anon | ✅ No código (display lido pelo servidor). ⏳ Fica completo quando a migração for aplicada |
| S4 | JWT do display não ligado ao slug | ✅ Valida `slug`, `sub` e a impressão digital da senha |
| S5 | Força bruta na senha do display | ✅ 5 tentativas a cada 15 min (em memória; veja as pendências) |
| S6 | `getSession()` no middleware | ✅ Trocado por `getUser()` |
| S7 | Upload sem validação no servidor | ✅ Tipos e tamanhos validados no navegador e no servidor; nome do arquivo limpo; limites no bucket via migração |
| S8 | `remotePatterns: "**"` | ✅ Só Supabase e `i.ytimg.com`; o resto usa `unoptimized` |
| S9 | Termo de busca interpolado no filtro da auditoria | ✅ Termo limpo e paginação validada |
| B1 | Editar empresa privada apagava a senha | ✅ Senha em branco mantém a atual |
| B2 | Vínculos de anúncio não atômicos | ✅ Sincronização por diferença e desfazer na criação |
| B3 | `logAudit` incompatível e sem uso | ✅ Removido |
| B4 | Realtime ouvia todos os anúncios | ✅ `display_signals` filtrado por empresa (⏳ depende da migração; até lá vale a consulta a cada 30 s) |
| B5 | Detalhes nas actions de usuário | ✅ Nome obrigatório (schema único) |
| — | Manutenção | ✅ Removidos `"use server"` do middleware, `@supabase/auth-helpers-nextjs` e `audio-toggle-button`; schemas unificados; retorno `{ success, message }` nas actions de auth; warnings do lint zerados; README reescrito; testes adicionados |

### Pendências
- **Aplicar a migração SQL** e depois rodar as consultas de verificação que estão no fim do arquivo. Ela supõe `companies.id` do tipo uuid.
- Conferir no Supabase se `audit_logs` só é legível por ADMIN (RLS).
- O limite de tentativas fica na memória de cada instância. Em deploy com várias instâncias ou serverless, mover para Redis/Upstash ou para uma tabela.
- O bucket continua público: qualquer pessoa com a URL exata de um arquivo consegue acessá-lo. Para privacidade total, usar bucket privado com URLs assinadas.
- Os acessos a displays privados agora duram 30 dias, pensando em telas que ficam ligadas. Ajuste `DISPLAY_TOKEN_MAX_AGE_SECONDS` se precisar.
- Ainda não existem testes de ponta a ponta (navegador) nem com usuário logado em um banco de teste.
