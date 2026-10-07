-- =====================================================================
-- Relatório de exibição: quantas vezes cada anúncio passou em cada tela
--
-- O player conta as exibições localmente e envia os totais a cada poucos
-- minutos (POST /api/display/[slug]/plays). O servidor grava com a função
-- abaixo (service role), somando ao total do dia.
-- =====================================================================

begin;

create table if not exists public.ad_play_stats (
  day date not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  advertisement_id uuid not null references public.advertisements(id) on delete cascade,
  plays integer not null default 0 check (plays >= 0),
  primary key (day, company_id, advertisement_id)
);

create index if not exists ad_play_stats_company_day_idx
  on public.ad_play_stats (company_id, day);

alter table public.ad_play_stats enable row level security;
revoke all on public.ad_play_stats from anon, authenticated;
grant select on public.ad_play_stats to authenticated;

drop policy if exists "ad_play_stats_read" on public.ad_play_stats;
create policy "ad_play_stats_read"
  on public.ad_play_stats for select
  to authenticated
  using (true);

-- p_items: [{"ad_id": uuid, "day": "YYYY-MM-DD", "plays": int}, ...]
-- Ignora anúncios que não estão vinculados à empresa e dias fora de +-2 dias.
create or replace function public.record_ad_plays(p_company_id uuid, p_items jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ad_play_stats as s (day, company_id, advertisement_id, plays)
  select (i->>'day')::date, p_company_id, (i->>'ad_id')::uuid, least((i->>'plays')::int, 10000)
  from jsonb_array_elements(p_items) as i
  join public.advertisements_companies ac
    on ac.advertisement_id = (i->>'ad_id')::uuid
   and ac.company_id = p_company_id
  where (i->>'plays')::int > 0
    and (i->>'day')::date between current_date - 2 and current_date + 2
  on conflict (day, company_id, advertisement_id)
  do update set plays = s.plays + excluded.plays;
$$;

revoke execute on function public.record_ad_plays(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_ad_plays(uuid, jsonb) to service_role;

commit;
