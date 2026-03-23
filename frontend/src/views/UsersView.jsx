import { useState, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers.js';
import './UsersView.css';

const ROLES = ['admin', 'gestor', 'equipo'];
const EQUIPOS = ['Obras Públicas', 'Alumbrado', 'Tránsito', 'Bienestar Animal', 'GIRSU (Residuos)', 'Espacios Verdes', 'Mantenimiento Urbano', 'Defensa del Consumidor'];
const ROL_LABEL = { admin: 'Admin', gestor: 'Gestor', equipo: 'Equipo' };

const emptyForm = { nombre: '', email: '', password: '', rol: 'equipo', equipo: '' };

const UsersView = () => {
  const { users, loading, createUser, updateUser } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createUser(form);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (user) => {
    try {
      await updateUser(user.id, { activo: user.activo ? 0 : 1 });
    } catch (err) {
      alert(err.message);
    }
  };

  const resetPassword = async (user) => {
    const newPassword = prompt(`Ingresá la nueva contraseña para ${user.nombre} (mínimo 8 caracteres):`);
    if (!newPassword) return;
    if (newPassword.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      await updateUser(user.id, { password: newPassword });
      alert('Contraseña actualizada correctamente.');
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const term = search.toLowerCase();
    return users.filter(u => 
      u.nombre.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term) ||
      (u.equipo && u.equipo.toLowerCase().includes(term))
    );
  }, [users, search]);

  const groupedUsers = useMemo(() => {
    const groups = { 'Administración y Gestión': [] };
    EQUIPOS.forEach(e => groups[e] = []);
    filteredUsers.forEach(u => {
      const key = u.equipo || 'Administración y Gestión';
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    });
    return groups;
  }, [filteredUsers]);

  if (loading) return <div className="users-loading">Cargando usuarios...</div>;

  return (
    <div className="users-view">
      <div className="users-header">
        <h2>Gestión de Usuarios</h2>
        <button className="btn-new-user" onClick={() => { setShowForm(!showForm); setError(''); setForm(emptyForm); }}>
          {showForm ? 'Cancelar' : '+ Nuevo Usuario'}
        </button>
      </div>

      <div className="users-controls">
        <input 
          type="text" 
          className="users-search-input" 
          placeholder="Buscar por nombre, email o equipo..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <form className="user-form" onSubmit={handleSubmit}>
          <h3>Crear Usuario</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Nombre completo</label>
              <input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} required placeholder="Juan Pérez" />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required placeholder="usuario@munioran.gob.ar" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required placeholder="Mínimo 8 caracteres" minLength={8} />
            </div>
            <div className="form-field">
              <label>Rol</label>
              <select value={form.rol} onChange={e => setForm(f => ({...f, rol: e.target.value}))}>
                {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
            </div>
            {form.rol === 'equipo' && (
              <div className="form-field">
                <label>Equipo / Área</label>
                <select value={form.equipo} onChange={e => setForm(f => ({...f, equipo: e.target.value}))} required>
                  <option value="">Seleccioná un equipo</option>
                  {EQUIPOS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>
            )}
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Guardando...' : 'Crear Usuario'}</button>
          </div>
        </form>
      )}

      <div className="users-groups-container">
        {Object.entries(groupedUsers).map(([grupo, list]) => {
          if (list.length === 0) return null;
          return (
            <div key={grupo} className="users-group">
              <h3 className="users-group-title">
                {grupo === 'Administración y Gestión' ? '🏢' : '👷'} {grupo} <span className="group-count">{list.length}</span>
              </h3>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(u => (
                      <tr key={u.id} className={!u.activo ? 'row-inactive' : ''}>
                        <td>{u.nombre}</td>
                        <td className="td-email">{u.email}</td>
                        <td><span className={`rol-badge rol-${u.rol}`}>{ROL_LABEL[u.rol] || u.rol}</span></td>
                        <td>
                          <span className={`status-badge ${u.activo ? 'status-active' : 'status-inactive'}`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div className="user-action-buttons">
                            <button className={`btn-toggle ${u.activo ? 'btn-deactivate' : 'btn-activate'}`} onClick={() => toggleActivo(u)}>
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            <button className="btn-reset-pwd" onClick={() => resetPassword(u)}>
                              🔑 Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsersView;
