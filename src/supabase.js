import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iheeqldxlapxzbabdngh.supabase.co";

const supabaseKey =
  "sb_publishable_6mKY2gFGZld7pFczkK6yeg_Lwsz6ra8";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);