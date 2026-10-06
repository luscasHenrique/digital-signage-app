# Digital Signage App — Documentação

> Primeira versão: varredura do código em 2026-10-06 (commit `76cf66e`). Atualizada no mesmo dia após as correções de segurança e bugs (seção 10) e após a adoção do design system **Liquid Glass** (seção 5).
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
| UI | React 19.1, design system **Liquid Glass** (CSS Modules, sem dependências), Tailwind CSS 4 só para layout, lucide-react |
| Formulários | react-hook-form + zod 4 |
| Animações | framer-motion (transições do display) e as animações do próprio design system |
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

Aplique a migração [supabase/migrations/20261006000000_security_hardening.sql](../supabase/migrations/20261006000000_security_hardening.sql) **depois** de publicar o código. Use o SQL Editor do Supabase ou `supabase db push`. A seção 7 explica o que ela faz.

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
│   ├── ButtonLink.tsx         # Link do Next com a aparência do Button
│   └── ui/                    # Design system Liquid Glass (não editar aqui; ver seção 5)
├── config/menuData.ts         # Menu lateral (itens com restrição de papel)
├── styles/                    # Tokens, reset e vidro do Liquid Glass
├── lib/
│   ├── auth.ts                # getAuthContext() e requireAdminPage()
│   ├── display.ts             # Dados e controle de acesso do display (service role)
│   ├── display-token.ts       # Emissão e validação do JWT do display privado
│   ├── password.ts            # Hash (scrypt) e verificação das senhas de empresa
│   ├── rate-limit.ts          # Limite de tentativas em memória
│   ├── storage.ts             # Regras do bucket (tipos e tamanhos), helpers de URL
│   ├── advertisement-links.ts # Diferença entre os vínculos atuais e os desejados
│   ├── advertisement-display.ts # Situação do anúncio (no ar, agendado...), YouTube, início/fim do dia
│   ├── audit-format.ts        # Textos da auditoria (resumo, alterações, senha mascarada)
│   ├── form-errors.ts         # Erros das actions → campos do formulário / toast
│   ├── schemas.ts             # Schemas zod usados pelos formulários e pelas actions
│   └── supabase/              # Clientes: navegador, servidor e admin
└── types/                     # Enums, interfaces e helpers da auditoria
tests/                         # Testes Vitest e helpers (Supabase simulado)
supabase/migrations/           # SQL versionado
```

---

## 5. Design system (Liquid Glass)

A interface usa o design system [liquid-glass-ui](https://github.com/luscasHenrique/liquid-glass-ui), copiado para `src/components/ui/` e `src/styles/`. O guia completo (tokens, convenções e catálogo) está no `DESIGN_SYSTEM.md` daquele repositório.

**Regras deste projeto:**
- **Não edite** `src/components/ui/` nem `src/styles/`. Para atualizar, copie de novo as pastas do repositório do design system. Essas pastas ficam fora do ESLint daqui, porque usam regras do `eslint-config-next` 16.
- **Cores, raios e fontes vêm sempre dos tokens `--lg-*`.** O `globals.css` mapeia as classes do Tailwind para esses tokens (`text-muted-foreground`, `bg-muted`, `text-primary`, `border-border`, `rounded-lg`...), então elas também mudam com o tema. Use o Tailwind só para layout: grid, flex, espaçamentos e tamanhos.
- **Tema:** claro, escuro ou automático, no botão do topo, salvo em `localStorage["lg-theme"]`. A tela de exibição fica sempre no tema escuro (`ThemeScope`).
- **Posição:** as classes `.lg-glass` e `.lg-glass-strong` definem `position: relative` fora de camadas CSS e vencem utilitários como `absolute` e `fixed`. Para posicionar um vidro, use um elemento de fora para o posicionamento e um de dentro para o vidro.
- **Sobre imagens**, use `.lg-glass-strong` e selos sólidos: o vidro normal e os selos `soft` perdem contraste.

**Peças compartilhadas do painel** (`src/components/admin/`):

| Componente | Uso |
|---|---|
| `AdminShell` | Sidebar no desktop, MobileMenu no celular, botão de tema e logout |
| `PageHeader` | Título, descrição e ações de cada página |
| `RowActions` | Botão "…" com o menu de ações de uma linha ou de um card |
| `ConfirmDialog` | Confirmação de exclusão |

---

## 6. Rotas e permissões

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

## 7. Modelo de dados (deduzido)

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

## 8. Fluxos principais

### 8.1 Login
`LoginForm` → action `login` (`signInWithPassword`, cookies via `createActionClient`). O middleware redireciona entre `/login` e `/dashboard`. O layout do painel carrega o papel do usuário para montar o menu.

### 8.2 Anúncio com upload
1. **O arquivo é enviado assim que é escolhido** (componente `FileUpload`), com progresso real e botão de cancelar. Enquanto o envio não termina, o botão "Salvar" fica desativado.
2. O navegador valida tipo e tamanho (`validateUploadFile`). A action `getSignedUploadUrl` **repete a validação no servidor**, limpa o nome do arquivo e devolve uma URL assinada e a URL pública (`getPublicUrl`).
3. O navegador envia o arquivo (`PUT` via XHR) direto para o Storage (`useStorageUpload`). O formulário guarda só a URL.
4. Se o formulário for fechado sem salvar, ou o arquivo for trocado, os envios não usados são apagados pela action `discardUploads`. Ela só apaga arquivos da pasta do próprio usuário e que nenhum anúncio esteja usando.
5. Datas: o início vale a partir de 00:00 do dia escolhido e o fim **até 23:59:59 do último dia**.
6. `createAdvertisement` / `updateAdvertisement` validam os dados de novo. URLs só são aceitas com `http(s)`. Os vínculos com empresas são sincronizados por diferença: primeiro inclui os novos, depois remove os retirados. Assim o anúncio nunca fica sem empresas. Se os vínculos falharem na criação, o anúncio é apagado para desfazer a operação.
7. Arquivos antigos do Storage são removidos quando possível (*best-effort*), sem impedir a operação se falharem.

### 8.3 Display
1. A página do servidor busca a empresa (service role) e verifica o acesso. Se for negado, redireciona para `/auth`.
2. Busca os anúncios `ACTIVE` com `start_date ≤ agora ≤ end_date`.
3. O player (`CompanyDisplay`) troca os anúncios de acordo com `duration_seconds`, mostra relógio, overlay e botão de tela cheia.
4. Atualização:
   - recarrega via `GET /api/display/[slug]` quando chega um evento Realtime em `display_signals` para aquela empresa, com debounce de 300 ms, e também a cada 30 s;
   - se a API responder 401 (senha trocada ou acesso expirado), volta para a tela de senha;
   - se houver falha de rede, mantém os anúncios atuais na tela.
5. Imagens do Supabase e do YouTube passam pelo otimizador do Next. Links de outros domínios são exibidos com `unoptimized`.

### 8.4 Display privado
1. `verifyCompanyPassword` aceita **5 tentativas a cada 15 min por IP e empresa**.
2. Lê a senha com service role e a compara com o hash scrypt. Senhas antigas em texto puro ainda são aceitas e são convertidas para hash no primeiro acesso.
3. Emite um JWT com `slug` e uma impressão digital da senha (`pv`), válido por 30 dias, em cookie `httpOnly` com `sameSite=lax`.
4. **Trocar a senha da empresa invalida todos os acessos já liberados.**

### 8.5 Auditoria
Só ADMIN. Lê `audit_logs` com filtros e paginação:
- o termo de busca é limpo antes de entrar no filtro `.or()` do PostgREST;
- área e ação usam comparação exata;
- os parâmetros de página são normalizados.

Cada registro aparece num Accordion com um resumo ("Atualizou anúncio “X”"), as alterações campo a campo e o JSON de antes e depois. O valor do campo `password` é sempre mascarado.

---

## 9. Qualidade

| Verificação | Resultado (2026-10-06) |
|---|---|
| `tsc --noEmit` | ✅ sem erros |
| `eslint src tests` | ✅ 0 erros, 0 warnings |
| `npm test` | ✅ 68 testes em 14 arquivos |
| `npm run build` | ✅ (o aviso de Edge Runtime vem do supabase-js no middleware e já existia antes) |

Os testes cobrem:
- hash e verificação de senha;
- o token do display (outra empresa, senha trocada, assinatura falsa);
- o limite de tentativas;
- as regras de upload e de URL;
- a limpeza do termo de busca da auditoria;
- os schemas;
- as actions de usuários (bloqueio de não-ADMIN) e de empresas (hash, manutenção da senha, limite de tentativas);
- o controle de acesso do display;
- o bloqueio de URLs `javascript:` e `data:` nos anúncios (formulário e servidor);
- a situação do anúncio, os links do YouTube e as datas;
- a formatação da auditoria (com a senha mascarada);
- o menu ativo e a busca sem acentos.

As telas do painel foram conferidas com screenshots (Chrome headless), em tema claro e escuro, no desktop e no celular.

Teste com o servidor de produção, contra o Supabase real e sem alterar dados:
- `/dashboard/admin/*` sem login redireciona para `/login`;
- `createCompany` e `deleteCompany` chamadas sem login retornam "não autenticado";
- a 6ª senha errada é bloqueada;
- a API do display devolve 404 para slug inexistente.

---

## 10. Achados e status

| # | Achado | Status |
|---|---|---|
| S1 | Actions e páginas de usuários sem checar autenticação e papel | ✅ Corrigido (`getAuthContext` + `requireAdminPage`; ADMIN não pode excluir a si mesmo nem remover o próprio papel) |
| S2 | Senha de empresa em texto puro e exposta | ✅ Hash scrypt com migração automática; leitura só com service role; páginas não enviam mais `password` para o navegador; a migração SQL bloqueia a coluna |
| S3 | Conteúdo de empresas privadas acessível pela chave anon | ✅ Display lido pelo servidor e migração aplicada (anon sem acesso às tabelas) |
| S4 | JWT do display não ligado ao slug | ✅ Valida `slug`, `sub` e a impressão digital da senha |
| S5 | Força bruta na senha do display | ✅ 5 tentativas a cada 15 min (em memória; veja as pendências) |
| S6 | `getSession()` no middleware | ✅ Trocado por `getUser()` |
| S7 | Upload sem validação no servidor | ✅ Tipos e tamanhos validados no navegador e no servidor; nome do arquivo limpo; limites no bucket via migração |
| S8 | `remotePatterns: "**"` | ✅ Só Supabase e `i.ytimg.com`; o resto usa `unoptimized` |
| S9 | Termo de busca interpolado no filtro da auditoria | ✅ Termo limpo e paginação validada |
| B1 | Editar empresa privada apagava a senha | ✅ Senha em branco mantém a atual |
| B2 | Vínculos de anúncio não atômicos | ✅ Sincronização por diferença e desfazer na criação |
| B3 | `logAudit` incompatível e sem uso | ✅ Removido |
| B4 | Realtime ouvia todos os anúncios | ✅ `display_signals` filtrado por empresa |
| S10 | URLs `javascript:`/`data:` aceitas em anúncios (o `z.string().url()` do zod 4 aceita qualquer esquema) | ✅ Só `http(s)`, no formulário e na action |
| B6 | Anúncio saía do ar à 00:00 do último dia | ✅ Fim gravado como 23:59:59.999 (vale para anúncios salvos a partir de agora) |
| B7 | O formulário não permitia desativar um anúncio | ✅ Chave "Anúncio ativo" |
| B5 | Detalhes nas actions de usuário | ✅ Nome obrigatório (schema único) |
| — | Manutenção | ✅ Removidos `"use server"` do middleware, `@supabase/auth-helpers-nextjs` e `audio-toggle-button`; schemas unificados; retorno `{ success, message }` nas actions de auth; warnings do lint zerados; README reescrito; testes adicionados |

### Pendências
- A migração SQL foi aplicada em produção em 2026-10-06.
- Conferir no Supabase se `audit_logs` só é legível por ADMIN (RLS).
- O limite de tentativas fica na memória de cada instância. Em deploy com várias instâncias ou serverless, mover para Redis/Upstash ou para uma tabela.
- O bucket continua público: qualquer pessoa com a URL exata de um arquivo consegue acessá-lo. Para privacidade total, usar bucket privado com URLs assinadas.
- Os acessos a displays privados agora duram 30 dias, pensando em telas que ficam ligadas. Ajuste `DISPLAY_TOKEN_MAX_AGE_SECONDS` se precisar.
- Ainda não existem testes de ponta a ponta (navegador) nem com usuário logado em um banco de teste.
