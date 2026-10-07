-- =====================================================================
-- Schema base (linha de base) do banco de produção
--
-- Gerado com `supabase db dump --linked` em 2026-10-07, já com os efeitos
-- de 20261006000000_security_hardening (que é idempotente e pode rodar
-- de novo por cima). Em produção esta migração é marcada como aplicada
-- com `supabase migration repair --status applied 20251001000000`.
--
-- Serve para recriar o banco do zero (Supabase local, staging, novo
-- projeto). Itens fora do schema public estão no final do arquivo.
-- =====================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."display_signal_on_ad_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.touch_display_signal(array(
    select company_id
    from public.advertisements_companies
    where advertisement_id = coalesce(new.id, old.id)
  ));
  return null;
end;
$$;


ALTER FUNCTION "public"."display_signal_on_ad_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."display_signal_on_link_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.touch_display_signal(array[new.company_id]);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.touch_display_signal(array[old.company_id]);
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."display_signal_on_link_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid := auth.uid();
  jwt      jsonb := auth.jwt();
  email    text  := nullif(jwt ->> 'email', '');
  actor_name text;
  payload  jsonb;
begin
  -- tenta pegar o nome atual do perfil (se existir)
  select p.full_name into actor_name
  from public.profiles p
  where p.id = actor_id;

  payload :=
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'user_email', email,
      'user_name', actor_name,
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );

  insert into public.audit_logs (user_id, action, details)
  values (actor_id::text, TG_OP, payload);

  return null;
end $$;


ALTER FUNCTION "public"."fn_audit_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_audit_row"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_email   text;
  v_pk      text;
  v_before  jsonb;
  v_after   jsonb;
  v_pk_col  text := coalesce(tg_argv[0], 'id'); -- nome da coluna PK
  v_jwt     jsonb;
begin
  -- usuário
  v_user_id := auth.uid();

  -- tenta pegar email do JWT; se não tiver, busca em auth.users
  begin
    v_jwt := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_jwt := null;
  end;
  v_email := coalesce(v_jwt->>'email',
                      (select email from auth.users where id = v_user_id));

  -- PK como texto
  if (TG_OP = 'DELETE') then
    v_pk := (to_jsonb(OLD)->>v_pk_col);
  else
    v_pk := (to_jsonb(NEW)->>v_pk_col);
  end if;

  -- snapshots
  if (TG_OP = 'INSERT') then
    v_before := null;
    v_after  := to_jsonb(NEW) - array['created_at','updated_at','last_edited_by','created_by'];
  elsif (TG_OP = 'UPDATE') then
    v_before := to_jsonb(OLD) - array['created_at','updated_at','last_edited_by','created_by'];
    v_after  := to_jsonb(NEW) - array['created_at','updated_at','last_edited_by','created_by'];
  elsif (TG_OP = 'DELETE') then
    v_before := to_jsonb(OLD) - array['created_at','updated_at','last_edited_by','created_by'];
    v_after  := null;
  end if;

  insert into public.audit_logs (
    action, table_name, record_pk, user_id, user_email, before_data, after_data
  ) values (
    TG_OP, TG_TABLE_NAME, v_pk, v_user_id, v_email, v_before, v_after
  );

  if (TG_OP = 'DELETE') then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;


ALTER FUNCTION "public"."fn_audit_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insere uma nova linha na tabela 'profiles' com o id e email do novo usuário.
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'ADMIN'
  );
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_advertisement_status"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  tz text  := 'America/Sao_Paulo';                      -- fuso horário
  today date := (now() at time zone tz)::date;           -- data atual sem horário
  tomorrow date := today + interval '1 day';            -- data de amanhã
begin
  -- 1) Atualiza status dos anúncios para INATIVO se a data de validade (end_date) já passou
  update public.advertisements
     set status = 'INACTIVE',
         updated_at = now()
   where status <> 'INACTIVE'
     and end_date is not null
     and ((end_date at time zone tz)::date) < today;  -- A comparação é feita até hoje, sem considerar o horário

  -- 2) Atualiza status dos anúncios para ATIVO se a data de início já passou
  update public.advertisements
     set status = 'ACTIVE',
         updated_at = now()
   where status <> 'ACTIVE'
     and start_date is not null
     and end_date   is not null
     and ((start_date at time zone tz)::date) <= today
     and ((end_date   at time zone tz)::date) >= today;  -- Caso a data de término não tenha passado ainda

end $$;


ALTER FUNCTION "public"."refresh_advertisement_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_display_signal"("p_company_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  insert into public.display_signals (company_id, updated_at)
  select c, now()
  from unnest(p_company_ids) as c
  where c is not null
    and exists (select 1 from public.companies where id = c)
  on conflict (company_id) do update set updated_at = excluded.updated_at;
$$;


ALTER FUNCTION "public"."touch_display_signal"("p_company_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ad_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Verifica se o anuncio venceu
  IF NEW.end_date < CURRENT_DATE THEN
    -- Se a data de vencimento foi no passado (ontem ou antes), o status será INACTIVE
    NEW.status := 'INACTIVE';  
  ELSE
    -- Caso contrário, o status permanece ACTIVE até o dia de vencimento
    NEW.status := 'ACTIVE';    
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ad_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_advertisement_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Esta função agora só opera na linha que foi modificada, evitando o loop
  UPDATE public.advertisements
  SET status = 'INACTIVE'
  WHERE id = NEW.id AND status = 'ACTIVE' AND end_date < NOW();

  UPDATE public.advertisements
  SET status = 'ACTIVE'
  WHERE id = NEW.id AND status = 'INACTIVE' AND NOW() BETWEEN start_date AND end_date;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_advertisement_status"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."advertisements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "content_url" "text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "duration_seconds" integer DEFAULT 15 NOT NULL,
    "status" "text" DEFAULT 'INACTIVE'::"text" NOT NULL,
    "overlay_text" "text",
    "overlay_position" "text",
    "overlay_bg_color" "text",
    "overlay_text_color" "text",
    "created_by" "uuid",
    "last_edited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "thumbnail_url" "text"
);

ALTER TABLE ONLY "public"."advertisements" REPLICA IDENTITY FULL;


ALTER TABLE "public"."advertisements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisements_companies" (
    "advertisement_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL
);

ALTER TABLE ONLY "public"."advertisements_companies" REPLICA IDENTITY FULL;


ALTER TABLE "public"."advertisements_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_pk" "text" NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "before_data" "jsonb",
    "after_data" "jsonb",
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "is_private" boolean DEFAULT false,
    "password" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."display_signals" (
    "company_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."display_signals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'STANDARD'::"text" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."advertisements_companies"
    ADD CONSTRAINT "advertisements_companies_pkey" PRIMARY KEY ("advertisement_id", "company_id");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."display_signals"
    ADD CONSTRAINT "display_signals_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_after_data_idx" ON "public"."audit_logs" USING "gin" ("after_data");



CREATE INDEX "audit_logs_before_data_idx" ON "public"."audit_logs" USING "gin" ("before_data");



CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "audit_logs_table_name_action_created_at_idx" ON "public"."audit_logs" USING "btree" ("table_name", "action", "created_at" DESC);



CREATE INDEX "idx_ad_comp_ad" ON "public"."advertisements_companies" USING "btree" ("advertisement_id");



CREATE INDEX "idx_ad_comp_company" ON "public"."advertisements_companies" USING "btree" ("company_id");



CREATE INDEX "idx_ads_created_at" ON "public"."advertisements" USING "btree" ("created_at");



CREATE INDEX "idx_ads_sched" ON "public"."advertisements" USING "btree" ("status", "start_date", "end_date");



CREATE INDEX "idx_advertisements_time_status" ON "public"."advertisements" USING "btree" ("status", "start_date", "end_date");



CREATE OR REPLACE TRIGGER "trg_audit_advertisements" AFTER INSERT OR DELETE OR UPDATE ON "public"."advertisements" FOR EACH ROW EXECUTE FUNCTION "public"."fn_audit_row"('id');



CREATE OR REPLACE TRIGGER "trg_audit_profiles" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."fn_audit_row"('id');



CREATE OR REPLACE TRIGGER "trg_display_signal_ads" AFTER DELETE OR UPDATE ON "public"."advertisements" FOR EACH ROW EXECUTE FUNCTION "public"."display_signal_on_ad_change"();



CREATE OR REPLACE TRIGGER "trg_display_signal_links" AFTER INSERT OR DELETE OR UPDATE ON "public"."advertisements_companies" FOR EACH ROW EXECUTE FUNCTION "public"."display_signal_on_link_change"();



CREATE OR REPLACE TRIGGER "trigger_update_ad_status_on_change" AFTER INSERT OR UPDATE ON "public"."advertisements" FOR EACH ROW EXECUTE FUNCTION "public"."update_advertisement_status"();



CREATE OR REPLACE TRIGGER "update_ad_status_trigger" AFTER INSERT OR UPDATE ON "public"."advertisements" FOR EACH ROW EXECUTE FUNCTION "public"."update_ad_status"();



ALTER TABLE ONLY "public"."advertisements_companies"
    ADD CONSTRAINT "advertisements_companies_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisements_companies"
    ADD CONSTRAINT "advertisements_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_last_edited_by_fkey" FOREIGN KEY ("last_edited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."display_signals"
    ADD CONSTRAINT "display_signals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all access for authenticated users on advertisements" ON "public"."advertisements" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow all access for authenticated users on junction table" ON "public"."advertisements_companies" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow full access for authenticated users" ON "public"."advertisements" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow full access for authenticated users" ON "public"."advertisements_companies" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow full access for authenticated users" ON "public"."companies" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow public read access to ads" ON "public"."advertisements" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to companies" ON "public"."companies" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to join table" ON "public"."advertisements_companies" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "admin can select audit" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."advertisements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisements_companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."display_signals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "display_signals_read" ON "public"."display_signals" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public read active scheduled ads" ON "public"."advertisements" FOR SELECT TO "anon" USING ((("status" = 'ACTIVE'::"text") AND ("start_date" <= "now"()) AND ("end_date" >= "now"())));



CREATE POLICY "public read ad-company links (only active/scheduled)" ON "public"."advertisements_companies" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."advertisements" "a"
  WHERE (("a"."id" = "advertisements_companies"."advertisement_id") AND ("a"."status" = 'ACTIVE'::"text") AND ("a"."start_date" <= "now"()) AND ("a"."end_date" >= "now"())))));



CREATE POLICY "public read companies" ON "public"."companies" FOR SELECT TO "anon" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."advertisements";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."advertisements_companies";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."display_signals";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."display_signal_on_ad_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."display_signal_on_ad_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."display_signal_on_ad_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."display_signal_on_link_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."display_signal_on_link_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."display_signal_on_link_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_audit_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_audit_row"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_audit_row"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_audit_row"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_advertisement_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_advertisement_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_advertisement_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."touch_display_signal"("p_company_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_display_signal"("p_company_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ad_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ad_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ad_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_advertisement_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_advertisement_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_advertisement_status"() TO "service_role";
























GRANT ALL ON TABLE "public"."advertisements" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisements" TO "service_role";



GRANT ALL ON TABLE "public"."advertisements_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisements_companies" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."companies" TO "authenticated";



GRANT SELECT("name") ON TABLE "public"."companies" TO "authenticated";



GRANT SELECT("slug") ON TABLE "public"."companies" TO "authenticated";



GRANT SELECT("is_private") ON TABLE "public"."companies" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."companies" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."companies" TO "authenticated";



GRANT ALL ON TABLE "public"."display_signals" TO "service_role";
GRANT SELECT ON TABLE "public"."display_signals" TO "anon";
GRANT SELECT ON TABLE "public"."display_signals" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

































-- =====================================================================
-- Fora do schema public (não entram no dump)
-- =====================================================================

-- Perfil criado junto com o usuário do Auth
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bucket de mídias dos anúncios (leitura pública; limites também na aplicação)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advertisements', 'advertisements', true, 209715200,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/webm', 'video/ogg'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Acesso público para leitura" on storage.objects;
create policy "Acesso público para leitura"
  on storage.objects for select
  using (bucket_id = 'advertisements');

drop policy if exists "Permitir upload para usuários autenticados" on storage.objects;
create policy "Permitir upload para usuários autenticados"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'advertisements' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Permitir update para dono do arquivo" on storage.objects;
create policy "Permitir update para dono do arquivo"
  on storage.objects for update to authenticated
  using (bucket_id = 'advertisements' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Permitir delete para dono do arquivo" on storage.objects;
create policy "Permitir delete para dono do arquivo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'advertisements' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime
do $$
declare
  t text;
begin
  foreach t in array array['advertisements', 'advertisements_companies', 'display_signals'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Job diário de status (removido em 20261007000000)
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron')
     and not exists (select 1 from cron.job where command ilike '%refresh_advertisement_status%') then
    perform cron.schedule('5 3 * * *', 'select public.refresh_advertisement_status();');
  end if;
end $$;
