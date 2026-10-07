-- =====================================================================
-- Recursos do display
--
-- 1) Ordem dos anúncios definida no painel (advertisements.position)
-- 2) Programação por dia da semana e faixa de horário
-- 3) Transição (animação) escolhida por empresa
-- 4) Status das TVs: último contato de cada display
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Ordem: menor position aparece primeiro; empate = mais recente primeiro
-- ---------------------------------------------------------------------
alter table public.advertisements
  add column if not exists position integer not null default 0;

create index if not exists advertisements_position_idx
  on public.advertisements (position, created_at desc);

-- Grava a ordem numa instrução só. SECURITY INVOKER: o RLS do usuário vale.
create or replace function public.reorder_advertisements(p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.advertisements a
     set position = o.ord
    from unnest(p_ids) with ordinality as o(id, ord)
   where a.id = o.id
     and a.position is distinct from o.ord;
$$;

revoke execute on function public.reorder_advertisements(uuid[]) from public, anon;
grant execute on function public.reorder_advertisements(uuid[]) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2) Programação semanal (horário de Brasília, aplicado pelo app)
--    weekdays: 0 = domingo ... 6 = sábado; null = todos os dias
--    daily_start/daily_end: null = o dia todo; início > fim = vira a noite
-- ---------------------------------------------------------------------
alter table public.advertisements
  add column if not exists weekdays smallint[],
  add column if not exists daily_start time,
  add column if not exists daily_end time;

alter table public.advertisements
  drop constraint if exists advertisements_weekdays_check,
  add constraint advertisements_weekdays_check
    check (weekdays is null or (cardinality(weekdays) > 0 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[])),
  drop constraint if exists advertisements_daily_window_check,
  add constraint advertisements_daily_window_check
    check ((daily_start is null) = (daily_end is null) and (daily_start is null or daily_start <> daily_end));

-- ---------------------------------------------------------------------
-- 3) Transição do player por empresa
-- ---------------------------------------------------------------------
alter table public.companies
  add column if not exists transition text not null default 'slideFromRight';

alter table public.companies
  drop constraint if exists companies_transition_check,
  add constraint companies_transition_check
    check (transition in ('fade', 'slideFromRight', 'zoomIn'));

-- O SELECT de companies para usuários logados é por coluna (sem password)
grant select (transition) on public.companies to authenticated;

-- ---------------------------------------------------------------------
-- 4) Último contato de cada display (gravado pelo servidor, service role)
-- ---------------------------------------------------------------------
create table if not exists public.display_heartbeats (
  company_id uuid primary key references public.companies(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  user_agent text
);

alter table public.display_heartbeats enable row level security;
revoke all on public.display_heartbeats from anon, authenticated;
grant select on public.display_heartbeats to authenticated;

drop policy if exists "display_heartbeats_read" on public.display_heartbeats;
create policy "display_heartbeats_read"
  on public.display_heartbeats for select
  to authenticated
  using (true);

commit;
