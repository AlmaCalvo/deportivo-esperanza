import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Ajusta la ruta si tu archivo cliente está en otro lugar

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Escuchar cambios de estado (Login / Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setUser(null);
        setPlayer(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (authUser) => {
    try {
      setLoading(true);
      setUser(authUser);

      // CORREO MAESTRO / ADMIN DIRECTO (ALMA)
      const userEmail = authUser.email?.toLowerCase();
      const isMasterAdmin = userEmail === 'almavcalvo@sanluis.edu.ar';

      // Buscar si existe la jugadora en la base de datos por email o ID
      const { data: players, error } = await supabase
        .from('jugadoras')
        .select('*')
        .or(`email.ilike.${userEmail},id.eq.${authUser.id},user_id.eq.${authUser.id}`);

      let playerData = players && players.length > 0 ? players[0] : null;

      // Si no existe la jugadora pero es el correo de Alma, creamos la ficha automáticamente
      if (!playerData && isMasterAdmin) {
        const { data: newPlayer } = await supabase
          .from('jugadoras')
          .insert([
            {
              id: authUser.id,
              user_id: authUser.id,
              nombre: 'Alma',
              numero: 8,
              email: userEmail,
              rol: 'admin'
            }
          ])
          .select()
          .single();

        playerData = newPlayer;
      }

      // Si sigue sin haber datos de jugadora, forzamos un perfil temporal para no bloquear el acceso
      if (!playerData) {
        playerData = {
          id: authUser.id,
          nombre: authUser.user_metadata?.full_name || 'Jugadora',
          numero: 0,
          email: userEmail,
          rol: isMasterAdmin ? 'admin' : 'jugadora'
        };
      }

      setPlayer(playerData);
      setIsAdmin(isMasterAdmin || playerData.rol === 'admin');
    } catch (err) {
      console.error('Error cargando datos de usuario:', err);
      // En caso de cualquier error, darle acceso a Alma como Admin
      if (authUser.email?.toLowerCase() === 'almavcalvo@sanluis.edu.ar') {
        setIsAdmin(true);
        setPlayer({ nombre: 'Alma', numero: 8, email: authUser.email, rol: 'admin' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, player, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);