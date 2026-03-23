import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { useReclamos } from './data/mockReclamos';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar';
import AdminView from './views/AdminView';
import WorkerView from './views/WorkerView';
import LoginView from './views/LoginView';
import UsersView from './views/UsersView';
import './App.css';

function AppRoutes() {
  const reclamosState = useReclamos();

  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/" element={
        <ProtectedRoute requiredRoles={['admin', 'gestor']}>
          <AdminView {...reclamosState} />
        </ProtectedRoute>
      } />
      <Route path="/mis-reclamos" element={
        <ProtectedRoute requiredRoles={['admin', 'gestor', 'equipo']}>
          <WorkerView {...reclamosState} />
        </ProtectedRoute>
      } />
      <Route path="/usuarios" element={
        <ProtectedRoute requiredRoles={['admin']}>
          <UsersView />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter basename="/kanban">
      <AuthProvider>
        <div className="app">
          <Navbar />
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
