import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { isRecoveryPending, setRecoveryPending } from '@/lib/recovery';

type AppRole = 'admin' | 'user' | 'admin_master' | 'company_admin';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isAdminMaster: boolean;
  passwordRecoveryRequired: boolean;
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryRequired, setPasswordRecoveryRequired] = useState(() => isRecoveryPending());

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setRole((data?.role as AppRole) || 'user');
    } catch (error) {
      console.error('Failed to fetch user role', error);
      setRole('user');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadRole = async (userId: string) => {
      await fetchRole(userId);
      if (mounted) setLoading(false);
    };

    // First, restore session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        void loadRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    // Important: don't await other Supabase calls inside onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryPending(true);
        setPasswordRecoveryRequired(true);
      }
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setRole(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN') {
        setLoading(true);
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => {
          void loadRole(session.user.id);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRecoveryPending(false);
    setPasswordRecoveryRequired(false);
    setSession(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{
      session, user, role, loading,
      isAdmin: role === 'admin' || role === 'admin_master' || role === 'company_admin',
      isAdminMaster: role === 'admin_master',
      passwordRecoveryRequired,
      clearPasswordRecovery: () => { setRecoveryPending(false); setPasswordRecoveryRequired(false); },
      signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
