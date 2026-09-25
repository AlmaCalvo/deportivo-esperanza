import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { role, player_id, full_name }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('role, player_id, full_name, players(id, number, name)')
        .eq('id', session.user.id)
        .single();

      if (!cancelled) {
        if (error) {
          console.error('Error cargando perfil:', error.message);
          setProfile(null);
        } else {
          setProfile(data);
        }
        setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isStaff: profile?.role === 'cuerpo_tecnico',
    loading,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
