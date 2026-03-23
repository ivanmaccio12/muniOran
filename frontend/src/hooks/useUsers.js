import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3003/api' : '/api';

const authHeaders = () => {
  const token = localStorage.getItem('muni-token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
      if (!res.ok) return;
      setUsers(await res.json());
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const createUser = async (data) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al crear usuario');
    await fetchUsers();
    return json;
  };

  const updateUser = async (id, data) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al actualizar usuario');
    await fetchUsers();
    return json;
  };

  // Helper: get worker name by ID
  const getWorkerName = (id) => users.find(u => u.id === id)?.nombre || id || '—';

  // Filtered: only active equipo users
  const workers = users.filter(u => u.rol === 'equipo' && u.activo);

  return { users, workers, loading, fetchUsers, createUser, updateUser, getWorkerName };
};
