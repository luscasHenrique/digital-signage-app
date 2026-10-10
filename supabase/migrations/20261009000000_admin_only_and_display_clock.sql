-- =====================================================================
-- 1) Só ADMIN configura empresas, anúncios e mídias
--    Antes: "Allow full access for authenticated users" deixava qualquer
--    usuário logado criar, editar e apagar tudo direto pela API REST.
--    Agora: todo usuário logado lê; só ADMIN escreve.
-- 2) companies.show_clock: mostrar ou esconder o relógio na tela
-- 3) Mudança na empresa (transição/relógio) avisa a TV pelo Realtime
-- 4) Relatório: aceita exibições de até 30 dias atrás (TV que ficou offline)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) RLS: leitura para logados, escrita só para ADMIN
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['companies', 'advertisements', 'advertisements_companies'] loop
    execute format('drop policy if exists "Allow full access for authenticated users" on public.%I', t);
    execute format('drop policy if exists "%s_read_authenticated" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_admin" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_admin" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_admin" on public.%I', t, t);

    execute format(
      'create policy "%s_read_authenticated" on public.%I for select to authenticated using (true)',
      t, t
    );
    execute format(
      'create policy "%s_insert_admin" on public.%I for insert to authenticated with check (public.is_admin(auth.uid()))',
      t, t
    );
    execute format(
      'create policy "%s_update_admin" on public.%I for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))',
      t, t
    );
    execute format(
      'create policy "%s_delete_admin" on public.%I for delete to authenticated using (public.is_admin(auth.uid()))',
      t, t
    );
  end loop;
end $$;

-- Storage: só ADMIN envia, troca ou apaga mídias (leitura continua pública,
-- a TV carrega as mídias pela URL pública)
drop policy if exists "Permitir upload para usuários autenticados" on storage.objects;
create policy "Permitir upload para usuários autenticados"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'advertisements'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin(auth.uid())
  );

drop policy if exists "Permitir update para dono do arquivo" on storage.objects;
create policy "Permitir update para dono do arquivo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'advertisements'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin(auth.uid())
  );

drop policy if exists "Permitir delete para dono do arquivo" on storage.objects;
create policy "Permitir delete para dono do arquivo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'advertisements'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin(auth.uid())
  );

-- ---------------------------------------------------------------------
-- 2) Relógio na tela (ligado por padrão, como era antes)
-- ---------------------------------------------------------------------
alter table public.companies
  add column if not exists show_clock boolean not null default true;

-- `companies` tem SELECT por coluna (a senha fica ilegível)
grant select (show_clock) on public.companies to authenticated;

-- ---------------------------------------------------------------------
-- 3) Transição/relógio alterados: a TV recarrega as configurações
-- ---------------------------------------------------------------------
create or replace function public.display_signal_on_company_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.touch_display_signal(array[new.id]);
  return null;
end;
$$;

revoke execute on function public.display_signal_on_company_change() from public, anon, authenticated;

drop trigger if exists trg_display_signal_company on public.companies;
create trigger trg_display_signal_company
  after update of transition, show_clock, is_private, password on public.companies
  for each row execute function public.display_signal_on_company_change();

-- ---------------------------------------------------------------------
-- 4) Exibições de TVs que ficaram até 30 dias sem internet
-- ---------------------------------------------------------------------
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
    and (i->>'day')::date between current_date - 30 and current_date + 2
  on conflict (day, company_id, advertisement_id)
  do update set plays = s.plays + excluded.plays;
$$;

revoke execute on function public.record_ad_plays(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_ad_plays(uuid, jsonb) to service_role;

commit;
