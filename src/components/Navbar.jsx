import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="navbar-mark">
          <img src="/logo.png" alt="Escudo Deportivo Esperanza" />
        </span>
        <span>Deportivo Esperanza</span>
      </div>

      <nav className="navbar-links">
        <NavLink to="/perfil" className={({ isActive }) => (isActive ? 'active' : '')}>
          Mi rendimiento
        </NavLink>
        <NavLink to="/analisis" className={({ isActive }) => (isActive ? 'active' : '')}>
          Análisis
        </NavLink>
        {isAdmin && (
          <>
            <NavLink to="/carga" className={({ isActive }) => (isActive ? 'active' : '')}>
              Cargar Partido
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
              Panel Admin
            </NavLink>
          </>
        )}
      </nav>

      <div className="navbar-user">
        <span>{profile?.full_name || 'Cuenta'}</span>
        <button onClick={signOut} className="btn-ghost">
          Salir
        </button>
      </div>
    </header>
  );
}