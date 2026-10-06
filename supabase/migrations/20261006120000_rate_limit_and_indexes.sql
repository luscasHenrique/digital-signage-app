-- =====================================================================
-- Limite de tentativas persistente + índices de desempenho
--
-- Na Vercel cada requisição pode cair numa instância diferente, então o
-- limite em memória não protege de verdade a senha dos displays privados.
-- O código usa esta função e só cai para a memória se ela não existir.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Limite de tentativas (janela fixa), acessível só pela service role
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rate_limits;
begin
  insert into public.rate_limits as rl (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when rl.reset_at <= now() then 1 else rl.count + 1 end,
        reset_at = case
          when rl.reset_at <= now() then now() + make_interval(secs => p_window_seconds)
          else rl.reset_at
        end
  returning * into r;

  -- Limpeza das janelas vencidas há mais de um dia
  delete from public.rate_limits where reset_at < now() - interval '1 day';

  return query select
    r.count <= p_limit,
    greatest(0, ceil(extract(epoch from (r.reset_at - now())))::integer);
end;
$$;

create or replace function public.reset_rate_limit(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where key = p_key;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.reset_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.reset_rate_limit(text) to service_role;

-- ---------------------------------------------------------------------
-- 2) Índices para as consultas mais frequentes
-- ---------------------------------------------------------------------
-- Display e página de anúncios por empresa filtram por company_id
create index if not exists advertisements_companies_company_id_idx
  on public.advertisements_companies (company_id);
-- Listagens ordenadas por data
create index if not exists advertisements_created_at_idx
  on public.advertisements (created_at desc);
create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

commit;
