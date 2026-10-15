-- =====================================================================
-- Papel Editor (STANDARD) gerencia anúncios
-- Antes (20261009000000) só ADMIN escrevia em anúncios e mídias, e o
-- usuário STANDARD só consultava. Agora:
--   - ADMIN: tudo (empresas, usuários, auditoria, erros, anúncios);
--   - STANDARD (Editor): cria, edita, ordena e exclui anúncios, vincula
--     anúncios às empresas e envia mídias. Empresas continuam só ADMIN.
-- can_edit_ads exige perfil ADMIN ou STANDARD: conta sem perfil não escreve.
-- =====================================================================

begin;

create or replace function public.can_edit_ads(uid uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role in ('ADMIN', 'STANDARD')
  );
$$;

revoke execute on function public.can_edit_ads(uuid) from anon, public;
grant execute on function public.can_edit_ads(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- RLS: anúncios e vínculos anúncio↔empresa (leitura segue para logados)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['advertisements', 'advertisements_companies'] loop
    execute format('drop policy if exists "%s_insert_admin" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_admin" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_admin" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_editor" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_editor" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_editor" on public.%I', t, t);

    execute format(
      'create policy "%s_insert_editor" on public.%I for insert to authenticated with check (public.can_edit_ads(auth.uid()))',
      t, t
    );
    execute format(
      'create policy "%s_update_editor" on public.%I for update to authenticated using (public.can_edit_ads(auth.uid())) with check (public.can_edit_ads(auth.uid()))',
      t, t
    );
    execute format(
      'create policy "%s_delete_editor" on public.%I for delete to authenticated using (public.can_edit_ads(auth.uid()))',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Storage: editor envia, troca e apaga mídias na própria pasta
-- (arquivos de outros usuários são removidos pelo servidor, com service role)
-- ---------------------------------------------------------------------
drop policy if exists "Permitir upload para usuários autenticados" on storage.objects;
create policy "Permitir upload para usuários autenticados"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'advertisements'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.can_edit_ads(auth.uid())
  );

drop policy if exists "Permitir update para dono do arquivo" on storage.objects;
create policy "Permitir update para dono do arquivo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'advertisements'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.can_edit_ads(auth.uid())
  );

drop policy if exists "Permitir delete para dono do arquivo" on storage.objects;
create policy "Permitir delete para dono do arquivo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'advertisements'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.can_edit_ads(auth.uid())
  );

commit;
