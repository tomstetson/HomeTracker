/**
 * AuthStore Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';

// Mock supabase module
vi.mock('../lib/supabase', () => ({
  AUTH_ENABLED: false, // Test with auth disabled for simplicity
  supabase: null,
}));

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: {
        id: 'local-user',
        email: 'local@hometracker.local',
        name: 'Local User',
        role: 'admin',
        created_at: new Date().toISOString(),
      },
      session: null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state (auth disabled)', () => {
    it('should have default user when auth is disabled', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).not.toBeNull();
      expect(state.user?.id).toBe('local-user');
      expect(state.user?.email).toBe('local@hometracker.local');
    });

    it('should be authenticated by default when auth is disabled', () => {
      const state = useAuthStore.getState();
      
      expect(state.isAuthenticated).toBe(true);
    });

    it('should not be loading when auth is disabled', () => {
      const state = useAuthStore.getState();
      
      expect(state.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const state = useAuthStore.getState();
      
      expect(state.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should update user and authentication status', () => {
      const newUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        created_at: new Date().toISOString(),
      };
      
      useAuthStore.getState().setUser(newUser);
      
      const state = useAuthStore.getState();
      expect(state.user).toEqual(newUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set isAuthenticated to false when user is null', () => {
      useAuthStore.getState().setUser(null);
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setSession', () => {
    it('should update session', () => {
      const mockSession = { access_token: 'test-token' } as any;
      
      useAuthStore.getState().setSession(mockSession);
      
      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
    });

    it('should allow setting session to null', () => {
      useAuthStore.getState().setSession(null);
      
      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should update error state', () => {
      useAuthStore.getState().setError('Test error');
      expect(useAuthStore.getState().error).toBe('Test error');
    });

    it('should allow clearing error', () => {
      useAuthStore.getState().setError('Test error');
      useAuthStore.getState().setError(null);
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('login (auth disabled)', () => {
    it('should succeed immediately when auth is disabled', async () => {
      const result = await useAuthStore.getState().login('test@example.com', 'password');
      
      expect(result).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('register (auth disabled)', () => {
    it('should succeed immediately when auth is disabled', async () => {
      const result = await useAuthStore.getState().register('test@example.com', 'password', 'Test User');
      
      expect(result).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('logout (auth disabled)', () => {
    it('should reset to default user when auth is disabled', async () => {
      await useAuthStore.getState().logout();
      
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe('local-user');
      expect(state.error).toBeNull();
    });
  });

  describe('updateProfile (auth disabled)', () => {
    it('should update local user profile', async () => {
      const result = await useAuthStore.getState().updateProfile({ name: 'Updated Name' });
      
      expect(result).toBe(true);
      expect(useAuthStore.getState().user?.name).toBe('Updated Name');
    });
  });

  describe('updatePassword (auth disabled)', () => {
    it('should return true (no-op) when auth is disabled', async () => {
      const result = await useAuthStore.getState().updatePassword('newpassword');
      
      expect(result).toBe(true);
    });
  });

  describe('resetPassword (auth disabled)', () => {
    it('should return true (no-op) when auth is disabled', async () => {
      const result = await useAuthStore.getState().resetPassword('test@example.com');
      
      expect(result).toBe(true);
    });
  });

  describe('initialize (auth disabled)', () => {
    it('should set default user and authenticated state', async () => {
      // Reset to initial loading state
      useAuthStore.setState({ isLoading: true, user: null, isAuthenticated: false });
      
      await useAuthStore.getState().initialize();
      
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe('local-user');
    });
  });
});
