import { create } from 'zustand';
import { supabase, AUTH_ENABLED } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Re-export AUTH_ENABLED for components to use
export { AUTH_ENABLED };

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar_url?: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  initialize: () => Promise<void>;
}

// Default user when auth is disabled
const DEFAULT_USER: User = {
  id: 'local-user',
  email: 'local@hometracker.local',
  name: 'Local User',
  role: 'admin',
  created_at: new Date().toISOString(),
};

// Convert Supabase user to our User type
function mapSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    role: supabaseUser.user_metadata?.role || 'user',
    avatar_url: supabaseUser.user_metadata?.avatar_url,
    created_at: supabaseUser.created_at,
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  // When auth is disabled, start as authenticated with default user
  user: AUTH_ENABLED ? null : DEFAULT_USER,
  session: null,
  isAuthenticated: !AUTH_ENABLED,
  isLoading: AUTH_ENABLED,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  login: async (email, password) => {
    if (!AUTH_ENABLED || !supabase) {
      set({ user: DEFAULT_USER, isAuthenticated: true, isLoading: false });
      return true;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      set({
        user: mapSupabaseUser(data.user),
        session: data.session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },

  register: async (email, password, name) => {
    if (!AUTH_ENABLED || !supabase) {
      set({ user: DEFAULT_USER, isAuthenticated: true, isLoading: false });
      return true;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'user',
          },
        },
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        set({ 
          error: 'Please check your email to confirm your account.',
          isLoading: false 
        });
        return false;
      }

      set({
        user: mapSupabaseUser(data.user),
        session: data.session,
        isAuthenticated: !!data.session,
        isLoading: false,
        error: null,
      });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    if (AUTH_ENABLED && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore errors
      }
    }
    
    // When auth is disabled, just reset to default user
    if (!AUTH_ENABLED) {
      set({ user: DEFAULT_USER, isAuthenticated: true, error: null });
    } else {
      set({ user: null, session: null, isAuthenticated: false, error: null });
    }
  },

  updateProfile: async (updates) => {
    if (!AUTH_ENABLED || !supabase) {
      // Just update the local user
      set((state) => ({
        user: state.user ? { ...state.user, ...updates } : DEFAULT_USER,
        error: null,
      }));
      return true;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        set({ error: error.message });
        return false;
      }

      set({ user: mapSupabaseUser(data.user), error: null });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.' });
      return false;
    }
  },

  updatePassword: async (newPassword) => {
    if (!AUTH_ENABLED || !supabase) {
      return true; // No-op when auth disabled
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        set({ error: error.message });
        return false;
      }

      set({ error: null });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.' });
      return false;
    }
  },

  resetPassword: async (email) => {
    if (!AUTH_ENABLED || !supabase) {
      return true; // No-op when auth disabled
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        set({ error: error.message });
        return false;
      }

      return true;
    } catch {
      set({ error: 'Network error. Please try again.' });
      return false;
    }
  },

  initialize: async () => {
    // When auth is disabled, immediately set as authenticated
    if (!AUTH_ENABLED || !supabase) {
      set({
        user: DEFAULT_USER,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        set({
          user: mapSupabaseUser(session.user),
          session,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: mapSupabaseUser(session?.user ?? null),
          session,
          isAuthenticated: !!session,
        });
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
