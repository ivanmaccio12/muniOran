import { useState, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers.js';
import { useAuth } from '../context/AuthContext.jsx';
import './UsersView.css';

const ROLES_ALL = ['admin', 'gestor', 'equipo'];
const ROLES_GESTOR = ['gestor', 'equipo'];
const ROL_LABEL = { admin: 'Admin', gestor: 'Gestor', equipo: 'Equipo' };

const emptyForm = { nombre: '', email: '', password: '', rol: 'equipo', equipo: '' };

const UsersView = () => {
  const { users, loading, createUser, updateUser, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.rol === 'admin';
  const availableRoles = isAdmin ? ROLES_ALL : ROLES_GESTOR;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Determine if current user can act on a target user
  const canActOn = (targetUser) => {
    if (isAdmin) return true;
    // gestor can act on gestor and equipo, not on admin
    return targetUser.rol !== 'admin';
  };

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

  const handleDeleteUser = async (user) => {
    if (!confirm(`¿Seguro que querés eliminar permanentemente a ${user.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteUser(user.id);
    } catch (err) {
      if (err.requiresForce) {
        const ids = err.activeReclamos.join(', ');
        if (confirm(`${err.message}\n\nReclamos afectados: ${ids}\n\n¿Confirmás que querés liberar esos reclamos y eliminar al usuario?`)) {
          try {
            await deleteUser(user.id, true);
          } catch (e2) {
            alert(e2.message);
          }
        }
      } else {
        alert(err.message);
      }
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({ nombre: user.nombre, email: user.email, rol: user.rol, equipo: user.equipo || '' });
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditError('');
  };

  const saveEdit = async (userId) => {
    setEditError('');
    setEditSaving(true);
    try {
      const payload = { nombre: editForm.nombre, email: editForm.email, rol: editForm.rol };
      if (editForm.rol === 'equipo') payload.equipo = editForm.equipo;
      else payload.equipo = null;
      await updateUser(userId, payload);
      setEditingId(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // Derive distinct areas from users with rol='equipo'
  const existingEquipos = useMemo(() => {
    if (!users) return [];
    const set = new Set(users.filter(u => u.rol === 'equipo' && u.equipo).map(u => u.equipo));
    return [...set].sort();
  }, [users]);

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
                {availableRoles.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
            </div>
            {form.rol === 'equipo' && (
              <div className="form-field">
                <label>Equipo / Área</label>
                <input
                  list="equipos-list-create"
                  value={form.equipo}
                  onChange={e => setForm(f => ({...f, equipo: e.target.value}))}
                  placeholder="Seleccioná o escribí una nueva área"
                  required
                />
                <datalist id="equipos-list-create">
                  {existingEquipos.map(eq => <option key={eq} value={eq} />)}
                </datalist>
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
                      editingId === u.id ? (
                        <tr key={u.id} className="row-editing">
                          <td>
                            <input
                              className="edit-inline-input"
                              value={editForm.nombre}
                              onChange={e => setEditForm(f => ({...f, nombre: e.target.value}))}
                            />
                          </td>
                          <td>
                            <input
                              className="edit-inline-input"
                              type="email"
                              value={editForm.email}
                              onChange={e => setEditForm(f => ({...f, email: e.target.value}))}
                            />
                          </td>
                          <td>
                            <select
                              className="edit-inline-select"
                              value={editForm.rol}
                              onChange={e => setEditForm(f => ({...f, rol: e.target.value}))}
                            >
                              {availableRoles.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                            </select>
                            {editForm.rol === 'equipo' && (
                              <>
                                <input
                                  className="edit-inline-input"
                                  list="equipos-list-edit"
                                  value={editForm.equipo}
                                  onChange={e => setEditForm(f => ({...f, equipo: e.target.value}))}
                                  placeholder="Seleccioná o escribí área"
                                  style={{ marginTop: '4px' }}
                                />
                                <datalist id="equipos-list-edit">
                                  {existingEquipos.map(eq => <option key={eq} value={eq} />)}
                                </datalist>
                              </>
                            )}
                          </td>
                          <td colSpan={2}>
                            {editError && <span className="edit-error">{editError}</span>}
                            <div className="user-action-buttons">
                              <button className="btn-save" onClick={() => saveEdit(u.id)} disabled={editSaving}>
                                {editSaving ? 'Guardando...' : '✓ Guardar'}
                              </button>
                              <button className="btn-cancel-edit" onClick={cancelEdit} disabled={editSaving}>Cancelar</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
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
                              {canActOn(u) && (
                                <>
                                  <button className="btn-edit" onClick={() => startEdit(u)} title="Editar">
                                    ✏️ Editar
                                  </button>
                                  <button className={`btn-toggle ${u.activo ? 'btn-deactivate' : 'btn-activate'}`} onClick={() => toggleActivo(u)}>
                                    {u.activo ? 'Desactivar' : 'Activar'}
                                  </button>
                                  <button className="btn-reset-pwd" onClick={() => resetPassword(u)}>
                                    🔑 Reset
                                  </button>
                                </>
                              )}
                              {isAdmin && u.id !== currentUser.id && (
                                <button className="btn-delete" onClick={() => handleDeleteUser(u)} title="Eliminar permanentemente">
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
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
