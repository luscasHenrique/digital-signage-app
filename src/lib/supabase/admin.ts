// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
import "server-only"; // Garante que este código NUNCA seja exposto no cliente

// Validação das variáveis de ambiente
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

// Cria um cliente com permissões de administrador.
// Use com MUITO cuidado, pois ele ignora todas as políticas de RLS.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
