-- =====================================================================
-- Limpeza de permissões + correção do status automático dos anúncios
--
-- 1) profiles: visitantes anônimos conseguiam listar nomes, IDs e papéis
--    de todos os usuários. Agora só usuários logados leem perfis.
-- 2) Políticas antigas de leitura pública (anúncios, empresas, vínculos):
--    o display lê com service role desde 20261006000000, então elas só
--    abririam dados se alguém voltasse a dar GRANT ao anon.
-- 3) audit_logs: ninguém além dos triggers grava; anon não acessa nada.
-- 4) Status dos anúncios: o trigger update_advertisement_status e o job
--    diário refresh_advertisement_status reativavam anúncios desativados
--    manualmente (e cada edição gerava um UPDATE extra, duplicando a
--    auditoria). O período já é respeitado pelo display e pelo painel;
--    o status passa a ser só o liga/desliga manual.
-- 5) Auditoria também para empresas (sem a coluna password).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) profiles
-- ---------------------------------------------------------------------
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update their own profile." on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
-- O GRANT de coluna (full_name, avatar_url) continua impedindo a troca de role
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke all on public.profiles from anon;

-- ---------------------------------------------------------------------
-- 2) Políticas antigas de leitura pública e duplicadas
-- ---------------------------------------------------------------------
drop policy if exists "Allow public read access to ads" on public.advertisements;
drop policy if exists "public read active scheduled ads" on public.advertisements;
drop policy if exists "Allow public read access to companies" on public.companies;
drop policy if exists "public read companies" on public.companies;
drop policy if exists "Allow public read access to join table" on public.advertisements_companies;
drop policy if exists "public read ad-company links (only active/scheduled)" on public.advertisements_companies;

-- Iguais a "Allow full access for authenticated users"
drop policy if exists "Allow all access for authenticated users on advertisements" on public.advertisements;
drop policy if exists "Allow all access for authenticated users on junction table" on public.advertisements_companies;

-- ---------------------------------------------------------------------
-- 3) audit_logs: leitura só para ADMIN (política existente), escrita só
--    pelos triggers (SECURITY DEFINER)
-- ---------------------------------------------------------------------
revoke all on public.audit_logs from anon;
revoke insert, update, delete, truncate on public.audit_logs from authenticated;

-- is_admin(uid) não precisa ser chamável por visitantes
revoke execute on function public.is_admin(uuid) from anon, public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- SECURITY DEFINER sem search_path fixo pode ser desviada por objetos em
-- outros schemas; fixa o search_path
alter function public.handle_new_user() set search_path = public;

-- ---------------------------------------------------------------------
-- 4) Status manual: remove os gatilhos e o job que sobrescreviam o status
-- ---------------------------------------------------------------------
drop trigger if exists trigger_update_ad_status_on_change on public.advertisements;
drop trigger if exists update_ad_status_trigger on public.advertisements;
drop function if exists public.update_advertisement_status();
drop function if exists public.update_ad_status();

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where command ilike '%refresh_advertisement_status%';
  end if;
end $$;
drop function if exists public.refresh_advertisement_status();

-- ---------------------------------------------------------------------
-- 5) Auditoria de empresas, sem gravar o hash da senha
-- ---------------------------------------------------------------------
create or replace function public.fn_audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email   text;
  v_pk      text;
  v_before  jsonb;
  v_after   jsonb;
  v_pk_col  text := coalesce(tg_argv[0], 'id'); -- nome da coluna PK
  v_jwt     jsonb;
  -- Colunas técnicas ou sensíveis que não vão para o log
  -- (position muda em lote ao reordenar; não vale um registro por anúncio)
  v_skip    text[] := array['created_at', 'updated_at', 'last_edited_by', 'created_by', 'password', 'position'];
begin
  v_user_id := auth.uid();

  -- tenta pegar email do JWT; se não tiver, busca em auth.users
  begin
    v_jwt := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_jwt := null;
  end;
  v_email := coalesce(v_jwt->>'email',
                      (select email from auth.users where id = v_user_id));

  if (tg_op = 'DELETE') then
    v_pk := (to_jsonb(old)->>v_pk_col);
  else
    v_pk := (to_jsonb(new)->>v_pk_col);
  end if;

  if (tg_op in ('UPDATE', 'DELETE')) then
    v_before := to_jsonb(old) - v_skip;
  end if;
  if (tg_op in ('INSERT', 'UPDATE')) then
    v_after := to_jsonb(new) - v_skip;
  end if;

  if (tg_op = 'UPDATE') then
    -- Troca de senha: registra que mudou, nunca o valor
    if (to_jsonb(old)->>'password') is distinct from (to_jsonb(new)->>'password') then
      v_after := v_after || jsonb_build_object('password_changed', true);
    end if;
    -- UPDATE que só mexeu em colunas ignoradas não gera registro
    if (v_before = v_after) then
      return new;
    end if;
  end if;

  insert into public.audit_logs (
    action, table_name, record_pk, user_id, user_email, before_data, after_data
  ) values (
    tg_op, tg_table_name, v_pk, v_user_id, v_email, v_before, v_after
  );

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_companies on public.companies;
create trigger trg_audit_companies
  after insert or update or delete on public.companies
  for each row execute function public.fn_audit_row('id');

commit;
