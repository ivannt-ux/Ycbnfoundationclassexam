import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. This uses the service role key, which bypasses RLS
// and can read every response. Only ever import this file from
// files inside app/api/ — never from a "use client" component.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
