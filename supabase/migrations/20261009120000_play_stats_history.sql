-- =====================================================================
-- Relatório de exibição
-- 1) Excluir um anúncio não apaga mais o histórico dele: ad_play_stats
--    deixa de ter FK com cascade e guarda o título/duração do anúncio.
-- 2) O relatório é somado no banco (ad_play_report): a página recebe uma
--    linha por anúncio + empresa, em vez de uma por dia (que passava do
--    limite de 1000 linhas da API em períodos longos).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Histórico independente do anúncio
-- ---------------------------------------------------------------------
alter table public.ad_play_stats
  add column if not exists ad_title text,
  add column if not exists ad_duration_seconds integer;

update public.ad_play_stats s
   set ad_title = a.title,
       ad_duration_seconds = a.duration_seconds
  from public.advertisements a
 where a.id = s.advertisement_id
   and s.ad_title is null;

alter table public.ad_play_stats
  drop constraint if exists ad_play_stats_advertisement_id_fkey;

create index if not exists ad_play_stats_day_idx
  on public.ad_play_stats (day);

-- Mesma regra da versão anterior (só anúncios vinculados à empresa,
-- dias recentes), agora guardando título e duração junto da contagem.
create or replace function public.record_ad_plays(p_company_id uuid, p_items jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ad_play_stats as s
    (day, company_id, advertisement_id, plays, ad_title, ad_duration_seconds)
  select (i->>'day')::date, p_company_id, a.id,
         least((i->>'plays')::int, 10000), a.title, a.duration_seconds
  from jsonb_array_elements(p_items) as i
  join public.advertisements_companies ac
    on ac.advertisement_id = (i->>'ad_id')::uuid
   and ac.company_id = p_company_id
  join public.advertisements a on a.id = ac.advertisement_id
  where (i->>'plays')::int > 0
    and (i->>'day')::date between current_date - 30 and current_date + 2
  on conflict (day, company_id, advertisement_id)
  do update set plays = s.plays + excluded.plays,
                ad_title = excluded.ad_title,
                ad_duration_seconds = excluded.ad_duration_seconds;
$$;

revoke execute on function public.record_ad_plays(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_ad_plays(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 2) Relatório já somado (uma linha por anúncio + empresa)
--    SECURITY INVOKER: valem o RLS e os grants de quem consulta.
-- ---------------------------------------------------------------------
create or replace function public.ad_play_report(
  p_from date,
  p_to date,
  p_company_id uuid default null
)
returns table (
  advertisement_id uuid,
  company_id uuid,
  ad_title text,
  company_name text,
  ad_deleted boolean,
  plays bigint,
  seconds bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select s.advertisement_id,
         s.company_id,
         coalesce(a.title, max(s.ad_title)) as ad_title,
         c.name as company_name,
         a.id is null as ad_deleted,
         sum(s.plays)::bigint as plays,
         sum(s.plays * coalesce(a.duration_seconds, s.ad_duration_seconds, 0))::bigint as seconds
  from public.ad_play_stats s
  left join public.advertisements a on a.id = s.advertisement_id
  left join public.companies c on c.id = s.company_id
  where s.day between p_from and p_to
    and (p_company_id is null or s.company_id = p_company_id)
  group by s.advertisement_id, s.company_id, a.id, a.title, c.name
  order by plays desc;
$$;

revoke execute on function public.ad_play_report(date, date, uuid) from public, anon;
grant execute on function public.ad_play_report(date, date, uuid) to authenticated, service_role;

commit;
