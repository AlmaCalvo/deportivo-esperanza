import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { profile, isStaff, signOut } = useAuth();

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
        {isStaff && (
          <NavLink to="/carga" className={({ isActive }) => (isActive ? 'active' : '')}>
            Carga en vivo
          </NavLink>
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
