-- =====================================================================
-- Endurecimento de segurança + Realtime filtrado por empresa
-- Acompanha as mudanças de código de 2026-10-06.
--
-- Como aplicar: Supabase Dashboard → SQL Editor (ou `supabase db push`).
-- Aplique DEPOIS de publicar o código novo: o display passa a ler os dados
-- pelo servidor (service role), então o acesso anônimo deixa de ser necessário.
--
-- Premissas (confira antes de rodar):
--   * companies.id é uuid.
--   * As tabelas estão no schema public.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Sinal de atualização por empresa (Realtime do display)
--    O player assina só esta tabela, filtrada por company_id.
--    Ela expõe apenas company_id/updated_at, nunca o conteúdo dos anúncios.
-- ---------------------------------------------------------------------
create table if not exists public.display_signals (
  company_id uuid primary key references public.companies (id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.display_signals enable row level security;

drop policy if exists "display_signals_read" on public.display_signals;
create policy "display_signals_read"
  on public.display_signals for select
  to anon, authenticated
  using (true);

revoke all on public.display_signals from anon, authenticated;
grant select on public.display_signals to anon, authenticated;

create or replace function public.touch_display_signal(p_company_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.display_signals (company_id, updated_at)
  select c, now()
  from unnest(p_company_ids) as c
  where c is not null
    and exists (select 1 from public.companies where id = c)
  on conflict (company_id) do update set updated_at = excluded.updated_at;
$$;

revoke execute on function public.touch_display_signal(uuid[]) from public, anon, authenticated;

create or replace function public.display_signal_on_link_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.touch_display_signal(array[new.company_id]);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.touch_display_signal(array[old.company_id]);
  end if;
  return null;
end;
$$;

create or replace function public.display_signal_on_ad_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.touch_display_signal(array(
    select company_id
    from public.advertisements_companies
    where advertisement_id = coalesce(new.id, old.id)
  ));
  return null;
end;
$$;

drop trigger if exists trg_display_signal_links on public.advertisements_companies;
create trigger trg_display_signal_links
  after insert or update or delete on public.advertisements_companies
  for each row execute function public.display_signal_on_link_change();

drop trigger if exists trg_display_signal_ads on public.advertisements;
create trigger trg_display_signal_ads
  after update or delete on public.advertisements
  for each row execute function public.display_signal_on_ad_change();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'display_signals'
  ) then
    alter publication supabase_realtime add table public.display_signals;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) Sem leitura anônima de dados de domínio
--    (o display agora lê via servidor com service role)
-- ---------------------------------------------------------------------
revoke all on public.companies from anon;
revoke all on public.advertisements from anon;
revoke all on public.advertisements_companies from anon;

-- ---------------------------------------------------------------------
-- 3) Coluna companies.password ilegível para usuários logados
--    (a verificação de senha roda no servidor com service role)
-- ---------------------------------------------------------------------
revoke select on public.companies from authenticated;
grant select (id, name, slug, is_private, created_at, updated_at) on public.companies to authenticated;

-- ---------------------------------------------------------------------
-- 4) Usuário não pode alterar o próprio papel (role) via API
--    (papéis são alterados só pela action de admin, com service role)
-- ---------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 5) Limites do bucket de anúncios (mesmas regras de src/lib/storage.ts)
--    O limite do bucket vale para qualquer arquivo; o de 10 MB para imagens
--    é aplicado na aplicação.
-- ---------------------------------------------------------------------
update storage.buckets
set file_size_limit = 209715200, -- 200 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'video/mp4', 'video/webm', 'video/ogg'
    ]
where id = 'advertisements';

commit;

-- ---------------------------------------------------------------------
-- Verificações recomendadas (rodar manualmente, não alteram nada):
--
--   -- políticas existentes que ainda liberem algo indevido:
--   select tablename, policyname, roles, cmd, qual
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('companies', 'advertisements', 'advertisements_companies', 'profiles', 'audit_logs');
--
--   -- audit_logs deveria ser legível apenas por ADMIN.
-- ---------------------------------------------------------------------
