-- =====================================================================
-- Exclusão de usuário em uma única transação
-- 1) delete_user_and_reassign_ads: transfere os anúncios do usuário (ou
--    deixa sem autor), registra cada troca de autor na auditoria e exclui
--    o usuário. Antes, a action transferia e depois chamava a API de Auth:
--    se a exclusão falhasse, os anúncios já tinham mudado de autor, e a
--    troca não aparecia na auditoria (fn_audit_row ignora created_by).
-- 2) As TVs não são mais avisadas quando o anúncio só muda de autor.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Excluir usuário e reatribuir anúncios
-- ---------------------------------------------------------------------
create or replace function public.delete_user_and_reassign_ads(
  p_user_id uuid,
  p_actor_id uuid,
  p_transfer_to uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_email  text;
  v_actor_email text;
  v_to_email    text;
  v_count       integer;
begin
  if p_user_id = p_actor_id then
    raise exception 'Você não pode excluir a si mesmo.';
  end if;

  select email into v_user_email from auth.users where id = p_user_id;
  if not found then
    raise exception 'Usuário não encontrado.';
  end if;

  if p_transfer_to is not null then
    if p_transfer_to = p_user_id then
      raise exception 'Escolha outro usuário para receber os anúncios.';
    end if;
    select u.email into v_to_email
      from auth.users u
      join public.profiles p on p.id = u.id
     where u.id = p_transfer_to;
    if not found then
      raise exception 'Usuário de destino não encontrado.';
    end if;
  end if;

  select email into v_actor_email from auth.users where id = p_actor_id;

  -- Quem fez a exclusão: os triggers de auditoria leem auth.uid() e o
  -- e-mail do JWT, que aqui (service role) viriam vazios. Vale só nesta
  -- transação.
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id, 'email', v_actor_email)::text,
    true
  );

  -- Troca de autor registrada por anúncio ("Autor: antes → depois")
  with moved as (
    update public.advertisements
       set created_by = p_transfer_to
     where created_by = p_user_id
    returning id, title
  )
  insert into public.audit_logs (
    action, table_name, record_pk, user_id, user_email, before_data, after_data
  )
  select 'UPDATE', 'advertisements', id::text, p_actor_id, v_actor_email,
         jsonb_build_object('title', title, 'author', v_user_email),
         jsonb_build_object('title', title, 'author', v_to_email)
    from moved;
  get diagnostics v_count = row_count;

  -- last_edited_by vira null pela FK (ON DELETE SET NULL); profiles e as
  -- tabelas do Auth saem em cascata.
  delete from auth.users where id = p_user_id;

  return v_count;
end;
$$;

revoke all on function public.delete_user_and_reassign_ads(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_user_and_reassign_ads(uuid, uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------
-- 2) TV só é avisada quando muda algo que ela exibe
-- ---------------------------------------------------------------------
create or replace function public.display_signal_on_ad_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ignored text[] := array['created_by', 'last_edited_by', 'updated_at'];
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - v_ignored) = (to_jsonb(old) - v_ignored) then
    return null;
  end if;

  perform public.touch_display_signal(array(
    select company_id
    from public.advertisements_companies
    where advertisement_id = coalesce(new.id, old.id)
  ));
  return null;
end;
$$;

commit;
