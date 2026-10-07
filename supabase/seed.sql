-- =====================================================================
-- Dados de exemplo do Supabase LOCAL (rodam em `supabase db reset`).
-- Nunca são aplicados em produção (`db push` não usa o seed).
--
-- Usuários (senha: Senha-local-123)
--   admin@local.test     ADMIN
--   standard@local.test  STANDARD
-- =====================================================================

do $$
declare
  v_users text[][] := array[
    array['admin@local.test', 'Admin Local', 'ADMIN'],
    array['standard@local.test', 'Usuário Local', 'STANDARD']
  ];
  v_id uuid;
  i int;
begin
  for i in 1 .. array_length(v_users, 1) loop
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_users[i][1], extensions.crypt('Senha-local-123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', v_users[i][2]),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_users[i][1], 'email_verified', true),
      'email', now(), now(), now()
    );
    -- O perfil é criado pelo trigger on_auth_user_created
    update public.profiles set role = v_users[i][3] where id = v_id;
  end loop;
end $$;

insert into public.companies (name, slug, is_private, transition)
values
  ('Loja Centro', 'loja-centro', false, 'fade'),
  ('Loja Privada', 'loja-privada', true, 'slideFromRight');

-- Senha da tela privada: 1234 (texto puro; vira hash no primeiro acesso)
update public.companies set password = '1234' where slug = 'loja-privada';

insert into public.advertisements (title, type, content_url, start_date, end_date, duration_seconds, status, position)
values
  ('Boas-vindas', 'IMAGE_LINK', 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg', now() - interval '1 day', now() + interval '30 days', 5, 'ACTIVE', 1),
  ('Promoção', 'IMAGE_LINK', 'https://i.ytimg.com/vi/YE7VzlLtp-4/hqdefault.jpg', now() - interval '1 day', now() + interval '30 days', 5, 'ACTIVE', 2),
  ('Desativado', 'IMAGE_LINK', 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg', now() - interval '1 day', now() + interval '30 days', 5, 'INACTIVE', 3);

insert into public.advertisements_companies (advertisement_id, company_id)
select a.id, c.id from public.advertisements a cross join public.companies c;
