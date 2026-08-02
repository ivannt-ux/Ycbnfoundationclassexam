import { createClient } from "@supabase/supabase-js";

// Safe to use in the browser — the anon key can only INSERT into
// exam_responses per the RLS policy, it cannot read anything back.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
