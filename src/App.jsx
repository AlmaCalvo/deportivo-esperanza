import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import LiveScoring from './components/LiveScoring';
import PlayerDashboard from './components/PlayerDashboard';
import Analytics from './components/Analytics';

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
          <Route path="/carga" element={<StaffOnly><LiveScoring /></StaffOnly>} />
          <Route path="*" element={<Navigate to="/perfil" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

function StaffOnly({ children }) {
  const { isStaff } = useAuth();
  if (!isStaff) return <Navigate to="/perfil" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
