import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext.jsx';
import './Navbar.css';

const ROL_LABEL = { admin: 'Admin', gestor: 'Gestor', equipo: 'Equipo' };

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';
  if (isLoginPage) return null;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <span className="brand-name">
            Or<span className="brand-accent">á</span>n
          </span>
          <span className="brand-subtitle">Gestión de Reclamos</span>
        </div>
      </div>

      {isAuthenticated && (
        <div className="navbar-center">
          {(user.rol === 'admin' || user.rol === 'gestor') && (
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Panel Admin
            </NavLink>
          )}
          <NavLink to="/mis-reclamos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Mis Reclamos
          </NavLink>
          {user.rol === 'admin' && (
            <NavLink to="/usuarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Usuarios
            </NavLink>
          )}
        </div>
      )}

      <div className="navbar-right">
        {isAuthenticated && user && (
          <div className="navbar-user">
            <span className="navbar-user-name">{user.nombre}</span>
            <span className={`navbar-user-rol rol-${user.rol}`}>{ROL_LABEL[user.rol] || user.rol}</span>
            <button className="logout-btn" onClick={logout} title="Cerrar sesión">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        )}
        <button className="theme-toggle" onClick={toggleTheme} title={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
