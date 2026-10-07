-- =====================================================================
-- Monitoramento de erros (sem serviço externo)
--
-- Erros do servidor (instrumentation.ts), do painel e das TVs são
-- gravados aqui pelo servidor (service role). Só ADMIN lê, na página
-- "Erros". Registros com mais de 30 dias são apagados pelo cron diário.
-- =====================================================================

begin;

create table if not exists public.error_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('server', 'client', 'display')),
  message text not null,
  stack text,
  url text,
  digest text,
  user_agent text,
  context jsonb,
  user_id uuid
);

create index if not exists error_logs_created_at_idx
  on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;
revoke all on public.error_logs from anon, authenticated;
grant select on public.error_logs to authenticated;

drop policy if exists "error_logs_admin_read" on public.error_logs;
create policy "error_logs_admin_read"
  on public.error_logs for select
  to authenticated
  using (public.is_admin(auth.uid()));

commit;
