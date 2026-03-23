import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Cargando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRoles && !requiredRoles.includes(user.rol)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Sin permisos</h2>
        <p>No tenés acceso a esta sección.</p>
      </div>
    );
  }
  return children;
};

export default ProtectedRoute;
