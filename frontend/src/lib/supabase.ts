import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Auth is disabled by default for homelab use
// Set VITE_AUTH_ENABLED=true and configure Supabase to enable
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create Supabase client if auth is enabled and credentials are provided
export const supabase: SupabaseClient | null = 
  AUTH_ENABLED && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export type { User, Session } from '@supabase/supabase-js';
