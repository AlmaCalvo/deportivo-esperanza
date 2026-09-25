import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import LiveScoring from './components/LiveScoring';
import PlayerDashboard from './components/PlayerDashboard';
import Analytics from './components/Analytics';
import AdminPanel from './components/AdminPanel';

function Shell() {
  const { session, loading } = useAuth();

  if (loading) return <div className="loading-screen">Cargando…</div>;
  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/perfil" element={<PlayerDashboard />} />
          <Route path="/analisis" element={<Analytics />} />
          <Route path="/carga" element={<AdminOnly><LiveScoring /></AdminOnly>} />
          <Route path="/admin" element={<AdminOnly><AdminPanel /></AdminOnly>} />
          <Route path="*" element={<Navigate to="/perfil" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

// Un usuario puede tener "perfil doble": ser jugadora (ve /perfil normalmente)
// y además admin (accede también a /carga y /admin). Este guard solo protege
// las rutas exclusivas de admin; /perfil y /analisis quedan abiertas a todas.
function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/perfil" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
