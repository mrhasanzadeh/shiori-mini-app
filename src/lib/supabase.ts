import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const hasSupabaseConfig = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl !== "your_supabase_project_url"
);

if (!hasSupabaseConfig) {
  // eslint-disable-next-line no-console
  console.error("Supabase: VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را در فایل .env تنظیم کنید.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type SupabaseClientType = typeof supabase;
