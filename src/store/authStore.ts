/**
 * Auth Store - Supabase Authentication
 *
 * Manages user authentication state with:
 * - Google OAuth
 * - Email Magic Links
 * - Session persistence
 */

import { create } from 'zustand';
import { User, Session, Subscription } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import type { User as DbUser, UserUpdate } from '@/lib/supabase/types';

// Store auth subscription reference to prevent memory leaks
let authSubscription: Subscription | null = null;

interface SignUpData {
  email?: string;
  phone?: string;
  password: string;
  fullName?: string;
}

interface AuthState {
  // Auth state
  user: User | null;
  profile: DbUser | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setInitialUser: (user: User) => void;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (data: SignUpData) => Promise<{ error: Error | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  resendPhoneOtp: (phone: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: UserUpdate) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  // Set initial user from server (for SSR hydration)
  setInitialUser: (user: User) => {
    set({
      user,
      isLoading: false,
      isInitialized: true,
    });
  },

  // Initialize auth state and listen for changes
  initialize: async () => {
    const supabase = getSupabaseClient();
    const { isInitialized } = get();

    // Prevent double initialization
    if (isInitialized) {
      return;
    }

    // Clean up any existing subscription to prevent memory leaks (important for HMR)
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    // Helper function to fetch profile and set state
    const updateAuthState = async (session: Session | null, source: string) => {
      if (session?.user) {
        // Fetch user profile from database
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({
          user: session.user,
          session,
          profile,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
        });
      }
    };

    // Listen for auth state changes and store subscription for cleanup
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only handle meaningful state changes
      if (event === 'SIGNED_IN') {
        // User just signed in
        await updateAuthState(session, `onAuthStateChange:${event}`);
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        set({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
        });
      } else if (event === 'USER_UPDATED') {
        // User profile updated
        await updateAuthState(session, `onAuthStateChange:${event}`);
      }
      // TOKEN_REFRESHED is ignored - it doesn't change user state
      // and can cause unnecessary re-renders and session reloads
    });

    // Store subscription reference for cleanup
    authSubscription = subscription;

    // Get current session on page load
    const { data: { session } } = await supabase.auth.getSession();

    await updateAuthState(session, 'getSession');
  },

  // Sign in with Google OAuth
  signInWithGoogle: async () => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      set({ isLoading: false });
      return { error };
    }

    return { error: null };
  },

  // Sign in with Email Magic Link
  signInWithEmail: async (email: string) => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    set({ isLoading: false });

    if (error) {
      return { error };
    }

    return { error: null };
  },

  // Sign in with Email and Password
  signInWithPassword: async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    set({ isLoading: false });

    if (error) {
      return { error };
    }

    return { error: null };
  },

  // Sign in with Phone and Password
  signInWithPhone: async (phone: string, password: string) => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });

    set({ isLoading: false });

    if (error) {
      return { error };
    }

    return { error: null };
  },

  // Sign up with Email/Phone and Password
  signUpWithPassword: async (data: SignUpData) => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    // Build sign up options based on what's provided
    const signUpOptions: {
      email?: string;
      phone?: string;
      password: string;
      options: {
        emailRedirectTo?: string;
        channel?: 'sms' | 'whatsapp';
        data: { full_name: string; phone?: string };
      };
    } = {
      password: data.password,
      options: {
        data: {
          full_name: data.fullName || '',
          phone: data.phone,
        },
      },
    };

    // Use email if provided, otherwise use phone
    if (data.email) {
      signUpOptions.email = data.email;
      signUpOptions.options.emailRedirectTo = `${window.location.origin}/auth/callback`;
    } else if (data.phone) {
      signUpOptions.phone = data.phone;
      // Explicitly request SMS channel for phone OTP
      signUpOptions.options.channel = 'sms';
    }

    // @ts-expect-error - TypeScript can't narrow the union type properly here
    const { error } = await supabase.auth.signUp(signUpOptions);

    set({ isLoading: false });

    if (error) {
      return { error };
    }

    return { error: null };
  },

  // Verify phone OTP
  verifyPhoneOtp: async (phone: string, token: string) => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    set({ isLoading: false });

    if (error) {
      return { error };
    }

    return { error: null };
  },

  // Resend phone OTP
  resendPhoneOtp: async (phone: string) => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.resend({
      type: 'sms',
      phone,
    });

    set({ isLoading: false });

    if (error) {
      return { error };
    }

    return { error: null };
  },

  // Reset password via email
  resetPasswordForEmail: async (email: string) => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    set({ isLoading: false });

    if (error) {
      return { error };
    }

    return { error: null };
  },

  // Update password (after reset)
  updatePassword: async (newPassword: string) => {
    const supabase = getSupabaseClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    set({ isLoading: false });

    if (error) {
      return { error };
    }

    return { error: null };
  },

  // Sign out
  signOut: async () => {
    const supabase = getSupabaseClient();

    // Immediately clear local state for instant UI update
    set({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
    });

    // Then sign out from Supabase (this also clears cookies/localStorage)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Sign out failed - state already cleared locally
    }
  },

  // Update user profile
  updateProfile: async (data: UserUpdate) => {
    const supabase = getSupabaseClient();
    const { user } = get();

    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('users')
      .update(data as never)
      .eq('id', user.id);

    if (!error) {
      // Refresh profile
      await get().refreshProfile();
    }

    return { error };
  },

  // Refresh profile data
  refreshProfile: async () => {
    const supabase = getSupabaseClient();
    const { user } = get();

    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      set({ profile });
    }
  },
}));
