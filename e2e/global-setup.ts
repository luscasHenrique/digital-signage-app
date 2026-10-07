import { createClient } from "@supabase/supabase-js";
import { LOCAL_SUPABASE_ENV } from "./local-env";

/** Volta os dados do seed ao estado inicial (os testes alteram alguns). */
export default async function globalSetup() {
  const admin = createClient(
    LOCAL_SUPABASE_ENV.NEXT_PUBLIC_SUPABASE_URL,
    LOCAL_SUPABASE_ENV.SUPABASE_SERVICE_ROLE_KEY
  );

  const steps = [
    admin
      .from("advertisements")
      .update({ status: "ACTIVE" })
      .in("title", ["Boas-vindas", "Promoção"]),
    admin.from("advertisements").delete().like("title", "E2E %"),
    admin.from("display_heartbeats").delete().not("company_id", "is", null),
    admin.from("rate_limits").delete().not("key", "is", null),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) {
      throw new Error(
        `Supabase local sem os dados do seed? Rode \`npx supabase db reset\`. (${error.message})`
      );
    }
  }
}
