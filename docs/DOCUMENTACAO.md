# Digital Signage App — Documentação

> Primeira versão em 2026-10-06 (commit `76cf66e`). Atualizada em 2026-10-07 com:
> - o schema do banco versionado;
> - o ambiente local;
> - o modo offline das TVs;
> - o status das telas;
> - a ordem e a programação semanal dos anúncios;
> - o relatório de exibição;
> - a recuperação de senha;
> - os testes de ponta a ponta.
>
> O modelo de dados (seção 7) agora vem do schema real, em [supabase/migrations/](../supabase/migrations/).

---

## 1. Visão geral

Plataforma de **sinalização digital (digital signage)**. No painel, os usuários cadastram **anúncios** (imagens, vídeos ou YouTube) e os vinculam a **empresas**. Cada empresa tem uma página de exibição (`/display/<slug>`) feita para rodar em tela cheia em TVs. A página troca os anúncios sozinha, continua funcionando sem internet e avisa o painel de que está no ar.

| Área | O que faz |
|---|---|
| Login | E-mail e senha (Supabase Auth); "Esqueci minha senha" por e-mail; página **Minha conta** (nome e senha) |
| Anúncios | Cadastro com upload para o Storage (imagens reduzidas no navegador) ou link externo, além de:<br>• período (início/fim), **dias da semana e faixa de horário**, duração por slide;<br>• status ativo/inativo e texto sobreposto;<br>• vínculo com N empresas;<br>• **ordem de exibição**, **duplicar** e **ações em lote** (ativar, desativar, excluir) |
| Empresas | Cadastro com slug único, página **privada** com senha opcional e **transição** do player; mostra o **status da TV** ("No ar", "Sem sinal há X", "Nunca abriu") |
| Display | Slideshow em tela cheia, atualizado por Realtime e por consulta a cada 30 s. Funciona **offline** (service worker) e conta as exibições |
| Relatórios | Exibições e tempo de tela por anúncio e por tela, num período |
| Usuários (só ADMIN) | Cadastro de usuários com papéis `ADMIN` / `STANDARD` |
| Auditoria (só ADMIN) | Histórico de `audit_logs` (anúncios, empresas e perfis), preenchido por triggers |

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js **15.5.27** (App Router, Server Components, Server Actions, Route Handlers) |
| UI | React 19.1, design system **Liquid Glass** (CSS Modules), Tailwind CSS 4 só para layout, lucide-react |
| Formulários | react-hook-form + zod 4 |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) via `@supabase/ssr` e `@supabase/supabase-js`, com tipos gerados do schema (`src/types/database.ts`) |
| Segurança | `jose` (JWT do display privado), scrypt (`node:crypto`) nas senhas de empresa, CSP e headers de segurança |
| Offline | Service worker próprio (`public/sw-display.js`), sem bibliotecas |
| Testes | Vitest (unitários) e Playwright (ponta a ponta, contra o Supabase local) |
| CI | GitHub Actions: lint, `tsc`, Vitest e build em cada push e PR |
| Agendamento | Vercel Cron (limpeza diária de uploads órfãos) |

---

## 3. Como rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes unitários (Vitest)
npm run test:e2e   # ponta a ponta (Playwright; precisa do Supabase local)
npm run lint
npm run db:types   # regera src/types/database.ts a partir do Supabase local
npm run build && npm run start
```

### Variáveis de ambiente

| Variável | Uso | Vai para o navegador? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase. Também define o host liberado em imagens e na CSP | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima, sujeita a RLS | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço, que **ignora a RLS**. Só é usada no servidor (`server-only`) | Não |
| `JWT_SECRET_KEY` | Assina o cookie de acesso aos displays privados | Não |
| `CRON_SECRET` | Protege `/api/cron/cleanup-uploads`. Sem ela, a limpeza diária não roda | Não |
| `NEXT_PUBLIC_SITE_URL` | Opcional. Endereço usado nos links de e-mail; sem ela, usa o host da requisição | Sim |

### Banco local (recomendado para desenvolver)

O `.env.local` aponta para a **produção**. Para testar sem mexer em dados reais, abra o Docker Desktop e rode:

```bash
npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta
npx supabase db reset   # aplica as migrações e o seed
```

Crie um `.env.development.local` com a URL `http://127.0.0.1:54321` e as chaves mostradas pelo `supabase start`. No `npm run dev`, esse arquivo tem prioridade sobre o `.env.local`. O seed (`supabase/seed.sql`, que nunca vai para produção) cria:
- os usuários `admin@local.test` (ADMIN) e `standard@local.test` (STANDARD), com a senha `Senha-local-123`;
- as telas `loja-centro` (pública) e `loja-privada` (senha `1234`);
- três anúncios.

### Migrações

As migrações ficam em `supabase/migrations/` e são aplicadas em produção com `npx supabase db push --linked`. A `20251001000000_baseline_schema.sql` é o dump do schema de produção. Ela só serve para recriar o banco do zero e, em produção, deve ser marcada como já aplicada com `npx supabase migration repair --status applied 20251001000000`.

| Migração | Conteúdo | Produção |
|---|---|---|
| `20251001000000_baseline_schema` | Tabelas, funções, triggers, RLS, bucket e Realtime de produção | Marcar como aplicada |
| `20261006000000_security_hardening` | `display_signals`, anon sem acesso, `password` ilegível, `role` protegido, limites do bucket | ✅ Aplicada |
| `20261006120000_rate_limit_and_indexes` | Limite de tentativas no banco + índices | ⏳ Pendente |
| `20261007000000_policies_cleanup_and_status_fix` | `profiles` fechado para visitantes, políticas antigas removidas, `audit_logs` só por trigger, status manual (remove o trigger e o job que reativavam anúncios), auditoria de empresas | ⏳ Pendente |
| `20261007120000_display_features` | `position`, `weekdays`/`daily_start`/`daily_end`, `companies.transition`, `display_heartbeats` | ⏳ Pendente |
| `20261007180000_play_stats` | `ad_play_stats` + `record_ad_plays` | ⏳ Pendente |

> **Ordem de publicação:** aplicar as migrações **antes** de publicar o código. A partir do commit `6e5d228`, o código usa colunas e tabelas que só existem depois delas.

---

## 4. Estrutura de pastas

```
src/
├── middleware.ts              # Renova a sessão e exige login em /dashboard
├── actions/                   # Server Actions
│   ├── auth.ts                # login (com limite de tentativas), logout
│   ├── account.ts             # esqueci a senha, trocar nome/senha
│   ├── advertisements.ts      # CRUD, ordem, lote, upload assinado
│   ├── companies.ts           # CRUD, senha do display privado
│   └── users.ts               # CRUD de usuários (só ADMIN; service role)
├── app/
│   ├── (public)/              # "/", "/login", "/recuperar-senha"
│   ├── (admin)/dashboard/     # Painel, incluindo relatorios/ e conta/
│   ├── display/[slug]/        # Player, /auth (senha) e error.tsx (recarrega sozinho)
│   ├── api/display/[slug]/    # GET anúncios (ETag) e POST plays (contagem)
│   ├── api/cron/              # Limpeza diária de uploads órfãos
│   ├── auth/callback/         # Retorno dos links de e-mail
│   ├── robots.ts, manifest.ts
├── components/
│   ├── admin/                 # Telas do painel (advertisements/form/ tem as seções do formulário)
│   ├── auth/                  # LoginForm, ForgotPasswordForm, PasswordForm
│   ├── display/               # Player, hooks (wake lock, offline, contagem), play-counter
│   └── ui/                    # Design system Liquid Glass (não editar; ver seção 5)
├── lib/
│   ├── ad-weekly-schedule.ts  # Dias/horários (horário de Brasília)
│   ├── display.ts             # Dados, acesso e heartbeat do display (service role)
│   ├── display-status.ts      # "No ar" / "Sem sinal" a partir do último contato
│   ├── image-optimize.ts      # Reduz imagens no navegador antes do upload
│   ├── play-report.ts         # Agregação do relatório
│   ├── persistent-rate-limit.ts # Limite de tentativas no banco (reserva em memória)
│   ├── storage-cleanup.ts     # Remove mídias sem uso
│   └── ...                    # auth, schemas, storage, password, display-token, etc.
└── types/                     # Tipos do app e database.ts (gerado)
public/sw-display.js           # Service worker do player (escopo /display/)
tests/                         # Vitest
e2e/                           # Playwright
supabase/                      # config.toml, migrations/, seed.sql
scripts/gen-db-types.mjs       # Gera e formata src/types/database.ts
```

---

## 5. Design system (Liquid Glass)

A interface usa o design system [liquid-glass-ui](https://github.com/luscasHenrique/liquid-glass-ui), copiado para `src/components/ui/` e `src/styles/`.

- **Não edite** `src/components/ui/` nem `src/styles/`. Para atualizar, copie de novo as pastas do repositório do design system. Essas pastas ficam fora do ESLint daqui.
- **Cores, raios e fontes vêm dos tokens `--lg-*`.** O `globals.css` mapeia as classes do Tailwind para esses tokens. Use o Tailwind só para layout.
- **Tema:** claro, escuro ou automático, salvo em `localStorage["lg-theme"]`. A tela de exibição fica sempre no escuro (`ThemeScope`).
- `.lg-glass` e `.lg-glass-strong` definem `position: relative` fora de camadas CSS. Para posicionar um vidro, use um elemento de fora.
- `Badge` com `dot` mostra **só** um ponto, sem o texto.

---

## 6. Rotas e permissões

| Rota | Acesso | Descrição |
|---|---|---|
| `/`, `/login`, `/recuperar-senha` | Público | Início, login e pedido de nova senha |
| `/auth/callback` | Público | Valida o link do e-mail (só redireciona para caminhos internos) |
| `/dashboard/...` (anúncios, empresas, relatórios, conta) | Logado | Painel |
| `/dashboard/admin/usuarios`, `/dashboard/admin/auditoria` | **Só ADMIN** (os demais recebem 404) | Administração |
| `/display/[slug]` | Público, ou cookie válido se a empresa for privada | Player |
| `/display/[slug]/auth` | Público | Senha da empresa privada |
| `GET /api/display/[slug]` | Mesma regra do player | Anúncios em JSON, com `ETag` (304 se nada mudou); registra o contato da TV |
| `POST /api/display/[slug]/plays` | Mesma regra do player | Recebe a contagem de exibições |
| `GET /api/cron/cleanup-uploads` | `Authorization: Bearer $CRON_SECRET` | Limpeza diária (Vercel Cron, 06:30 UTC) |

Camadas de autorização:
- **middleware:** sessão em `/dashboard/*` via `getUser()`;
- **páginas admin:** `requireAdminPage()`;
- **Server Actions:** `getAuthContext()`;
- **display:** `hasDisplayAccess()`;
- **banco:** RLS e grants de coluna.

**Headers de segurança:** CSP (scripts só do próprio site; imagens e vídeos de qualquer `https`, porque anúncios podem usar links externos; conexão só com o Supabase; iframes só do YouTube), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e HSTS. O `robots.txt` bloqueia indexação, e as telas têm `noindex`.

---

## 7. Modelo de dados

```
auth.users ──1:1── profiles (id, full_name, avatar_url, role: ADMIN|STANDARD)
                    ← trigger on_auth_user_created (handle_new_user)

companies (id, name, slug, is_private, password [scrypt], transition, created_at, updated_at)
  ├──N:M── advertisements_companies (advertisement_id, company_id)
  ├──1:1── display_heartbeats (company_id, last_seen_at, user_agent)
  └──1:N── display_signals (company_id, updated_at)         ← triggers + Realtime

advertisements (id, title, description, type, content_url, thumbnail_url,
                start_date, end_date, duration_seconds, status, position,
                weekdays smallint[], daily_start time, daily_end time,
                overlay_*, created_by, last_edited_by, created_at, updated_at)

ad_play_stats (day, company_id, advertisement_id, plays)   ← record_ad_plays()
audit_logs (id, created_at, action, table_name, record_pk, user_id, user_email,
            before_data, after_data)  ← fn_audit_row em advertisements, companies, profiles
rate_limits (key, count, reset_at)    ← consume_rate_limit() / reset_rate_limit()

Storage: bucket público "advertisements", caminho <user_id>/<timestamp>-<nome>
```

**Permissões (após as migrações pendentes):**

| Tabela | anon | authenticated | Escrita |
|---|---|---|---|
| `profiles` | — | lê todos; altera só `full_name`/`avatar_url` do próprio | admin via service role |
| `companies` | — | lê as colunas públicas (sem `password`), CRUD | — |
| `advertisements`, `advertisements_companies` | — | CRUD | — |
| `display_signals` | lê | lê | triggers |
| `display_heartbeats`, `ad_play_stats` | — | lê | servidor (service role) |
| `audit_logs` | — | só ADMIN lê | triggers |
| `rate_limits` | — | — | servidor (service role) |

**Status do anúncio:** é só o liga/desliga manual. Período e dias/horários são aplicados pelo display e pelo painel. O trigger e o job diário que reescreviam o status foram removidos, porque reativavam anúncios desativados.

---

## 8. Fluxos principais

### 8.1 Login e conta
- **Login:** action `login`. São 10 tentativas a cada 15 min por IP e e-mail, e o contador zera quando a pessoa acerta.
- **Esqueci minha senha:** `/recuperar-senha` mostra a mesma resposta para qualquer e-mail e aceita 5 pedidos por hora por IP. O e-mail do Supabase leva a `/auth/callback`, que aceita o formato `code` (PKCE) e o `token_hash`. O link abre "Minha conta" para a pessoa criar a nova senha.
- **Minha conta:** troca nome e senha.

### 8.2 Anúncio
1. O arquivo é enviado assim que é escolhido, por URL assinada e com progresso. Antes do envio, imagens JPEG/PNG/WebP grandes viram **WebP com no máximo 3840 px**. O seletor aceita até 30 MB, e o limite de 10 MB vale para o arquivo já reduzido.
2. A action valida tudo de novo: só aceita URLs `http(s)`, datas coerentes e programação semanal válida.
3. Os vínculos com empresas são sincronizados por diferença: primeiro inclui os novos, depois remove os retirados. Na criação, se os vínculos falharem, o anúncio é apagado.
4. **Mídias que deixam de ser usadas** são apagadas com a service role, depois da checagem de sessão, e só se nenhum outro anúncio as usar. Uploads abandonados são apagados pelo cron diário depois de 24 h.
5. **Ordem:** o diálogo "Ordem" grava as posições numa única chamada (`reorder_advertisements`). Anúncios novos entram no topo.
6. **Programação semanal:** dias da semana e faixa "Das/Até" no horário de Brasília. Uma faixa como 22:00–02:00 atravessa a meia-noite e conta como o dia em que começou. Fora do horário, o anúncio aparece como "Fora do horário".
7. **Duplicar** e **ações em lote** ficam no menu de cada anúncio e na seleção da tabela.

### 8.3 Display
1. O servidor busca a empresa e verifica o acesso. Depois busca, numa só consulta, os anúncios ativos e dentro do período, na ordem do painel, e registra o contato da TV (`display_heartbeats`).
2. O player:
   - aplica os dias e horários a cada 30 s, inclusive offline;
   - troca os slides pela duração, com a transição da empresa;
   - deixa os vídeos **tocarem até o fim**, usando a duração como mínimo e com teto de 5 min.
3. Atualização:
   - Realtime em `display_signals`, com debounce, e consulta a cada 30 s com `ETag` (resposta 304 se nada mudou);
   - pausa com a aba oculta;
   - em caso de falha, espaça as tentativas até 5 min;
   - se a API responder 401, volta para a tela de senha.
4. **Falhas:**
   - se a mídia quebra, o player pula para o próximo anúncio;
   - se o único anúncio quebra, mostra um aviso e tenta de novo em 60 s;
   - se o primeiro carregamento falha, a página **se recarrega sozinha** a cada 30 s.
5. **Offline** (`public/sw-display.js`, só em produção):
   - a página e a API seguem "rede primeiro, cópia em cache";
   - os arquivos do Next e as imagens otimizadas seguem "cache primeiro";
   - as mídias do Storage são baixadas assim que entram na lista e apagadas quando saem, com suporte a Range para os vídeos;
   - outros hosts não são interceptados.
6. **Contagem:** cada anúncio que entra na tela conta uma exibição. Com um anúncio só, conta uma por duração. A contagem fica no `localStorage` e é enviada a cada 5 min e ao fechar a página.

### 8.4 Display privado
1. Aceita 5 tentativas a cada 15 min por IP e empresa, com o contador no banco.
2. Compara a senha com o hash scrypt. Senhas antigas em texto puro são convertidas no primeiro acesso.
3. Emite um JWT com o `slug` e a impressão digital da senha, válido por 30 dias, em cookie `httpOnly`. Trocar a senha invalida os acessos já liberados.

### 8.5 Status das telas e relatório
- **Empresas:** "No ar" se houve contato nos últimos 2 min. A lista se atualiza a cada minuto, e o dashboard mostra "Telas no ar X/Y".
- **Relatórios:** soma de `ad_play_stats` por anúncio e por tela, num período (padrão: últimos 7 dias). O tempo de tela é exibições × duração configurada.

### 8.6 Auditoria
Só ADMIN. Mostra filtros, paginação, um resumo legível e as alterações campo a campo. A senha nunca é gravada no log: aparece só "Senha alterada". Mudanças só de `updated_at` ou `position` não geram registro.

---

## 9. Qualidade

| Verificação | Resultado (2026-10-07) |
|---|---|
| `tsc --noEmit` | ✅ sem erros |
| `npm run lint` | ✅ 0 erros, 0 warnings |
| `npm test` | ✅ 111 testes em 23 arquivos |
| `npm run test:e2e` | ✅ 6 testes (rodados duas vezes seguidas, partindo do zero) |
| `npm audit --omit=dev` | ✅ 0 vulnerabilidades |
| `npm run build` | ✅ |

**Testes de ponta a ponta** (Supabase local, `e2e/`):
- permissões do admin e do usuário comum;
- desativar e ativar em lote;
- API do display (ordem, só anúncios ativos, ETag/304);
- tela privada com senha errada e certa;
- status "No ar" depois de abrir a tela.

Eles encontraram um bug real: o embed `companies` ficou ambíguo depois da tabela `ad_play_stats`.

**Verificado manualmente no navegador** (build de produção com o Supabase local):
- display offline: recarregar sem rede, imagem e vídeo em cache, Range 206 e API devolvendo a última lista;
- programação semanal no display;
- ordem dos anúncios;
- upload de uma imagem 5000×3000 (4,3 MB) gravada como WebP de 94 KB;
- recuperação de senha por link;
- relatório: contagem enviada ao fechar a tela.

---

## 10. Achados e status

| # | Achado | Status |
|---|---|---|
| S1–S12, B1–B10, P1–P3 | Rodada de 2026-10-06 (autorização, hash de senha, display privado, upload, auditoria, dependências etc.) | ✅ Corrigidos (ver o histórico do git) |
| S13 | Visitantes anônimos conseguiam listar todos os usuários (nome, ID e papel) em `profiles` | ✅ Na migração `20261007000000` ⏳ |
| S14 | Sem headers de segurança | ✅ CSP, X-Frame-Options, HSTS etc. |
| S15 | Login sem limite de tentativas próprio | ✅ 10 a cada 15 min por IP e e-mail |
| S16 | Políticas antigas de leitura pública e `audit_logs` gravável por usuários logados | ✅ Removidas e fechada (`20261007000000`) ⏳ |
| S17 | Funções `SECURITY DEFINER` sem `search_path` fixo e `is_admin` chamável por anônimos | ✅ (`20261007000000`) ⏳ |
| B11 | **"Desativar" anúncio não funcionava**: um trigger e um job diário reativavam o anúncio dentro do período (e duplicavam a auditoria) | ✅ Removidos (`20261007000000`) ⏳ |
| B12 | Editar ou excluir um anúncio de outro usuário deixava a mídia antiga no Storage (a política do bucket só deixa o dono apagar) | ✅ Remoção com service role + cron diário de órfãos |
| B13 | Se o primeiro carregamento falhasse, a TV ficava travada na tela de erro | ✅ Recarrega sozinha |
| B14 | Com um único anúncio e mídia quebrada, a tela ficava quebrada | ✅ Aviso e nova tentativa |
| B15 | Vídeos eram cortados na duração configurada | ✅ Tocam até o fim (a duração vira o mínimo) |
| B16 | Empresas não eram auditadas | ✅ Trigger em `companies`, sem a senha (`20261007000000`) ⏳ |
| P4 | A API do display fazia 3 consultas a cada 30 s por TV e mandava o anúncio inteiro | ✅ 1 consulta, só as colunas usadas, ETag/304 |
| P5 | Imagens enviadas no tamanho original (fotos de 5–10 MB) | ✅ WebP até 4K no navegador |
| — | Ausência de schema versionado, ambiente de teste, CI, testes de ponta a ponta e tipos do banco | ✅ Tudo adicionado |

### Pendências
- **Aplicar as migrações** pendentes e marcar a linha de base como aplicada (seção 3), **antes** de publicar o código.
- **Vercel:** definir `CRON_SECRET` para ativar a limpeza diária. Opcionalmente, definir `NEXT_PUBLIC_SITE_URL`.
- **Supabase Auth:**
  - em *Authentication → URL Configuration*, incluir `https://<seu-domínio>/auth/callback` nas Redirect URLs;
  - configurar um SMTP próprio, porque o envio padrão do Supabase é limitado a poucos e-mails por hora.
- Monitoramento de erros (Sentry ou similar) depende de uma conta.
- O bucket continua público: qualquer pessoa com a URL exata de um arquivo o acessa.
- A paginação no servidor da lista de anúncios não foi feita. O diálogo de ordem e os filtros por situação usam a lista completa, e o volume atual não justifica. Vale rever a partir de algumas centenas de anúncios.
- Os testes de ponta a ponta rodam só localmente, porque precisam do Supabase local via Docker. Dá para incluí-los na CI com `supabase/setup-cli`.
