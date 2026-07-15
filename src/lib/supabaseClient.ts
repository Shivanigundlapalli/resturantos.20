import { createClient } from '@supabase/supabase-js';

// Accessing Vite environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Initialize only if both URL and Key are present
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== "MY_VITE_SUPABASE_URL" && supabaseAnonKey !== "MY_VITE_SUPABASE_ANON_KEY") 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("⚠️ Supabase Realtime not initialized: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment.");
}
