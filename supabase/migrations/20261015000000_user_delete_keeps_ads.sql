-- =====================================================================
-- Excluir usuário que criou ou editou anúncios
-- advertisements.created_by / last_edited_by apontavam para auth.users
-- sem ON DELETE: o Postgres bloqueava a exclusão e o Supabase devolvia
-- "Database error deleting user". Agora o anúncio continua e só perde a
-- referência ao autor (SET NULL). O fn_audit_row ignora essas colunas,
-- então o UPDATE automático não gera registro no log de auditoria.
-- =====================================================================

begin;

alter table public.advertisements
  drop constraint if exists advertisements_created_by_fkey,
  drop constraint if exists advertisements_last_edited_by_fkey;

alter table public.advertisements
  add constraint advertisements_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  add constraint advertisements_last_edited_by_fkey
    foreign key (last_edited_by) references auth.users(id) on delete set null;

commit;
