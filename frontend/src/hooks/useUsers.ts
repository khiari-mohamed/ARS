import { useCallback, useEffect, useState } from 'react';
import {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deactivateUser,
  activateUser,
  deleteUser,
  bulkUserAction,
  exportUserData,
  fetchUserDashboardStats
} from '../api/usersApi';
import {
  User,
  UserFilters,
  CreateUserDto,
  UpdateUserDto,
  UserDashboardStats,
  BulkActionResult
} from '../types/user.d';

export function useUsers(initialFilters: UserFilters = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>(initialFilters);

  const loadUsers = useCallback(async (newFilters?: UserFilters) => {
    setLoading(true);
    setError(null);
    try {
      const appliedFilters = newFilters !== undefined ? newFilters : filters;
      const data = await fetchUsers(appliedFilters);
      setUsers(data);
      if (newFilters !== undefined) setFilters(newFilters);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, []);

  const getUser = async (id: string): Promise<User> => {
    try {
      return await fetchUserById(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la récupération de l'utilisateur");
      throw err;
    }
  };

  const addUser = async (user: CreateUserDto): Promise<User> => {
    try {
      const newUser = await createUser(user);
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'utilisateur");
      throw err;
    }
  };

  const editUser = async (id: string, updates: UpdateUserDto): Promise<User> => {
    try {
      const updated = await updateUser(id, updates);
      setUsers((prev) => prev.map(u => u.id === id ? updated : u));
      return updated;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la modification de l'utilisateur");
      throw err;
    }
  };

  const resetPassword = async (id: string, newPassword: string): Promise<void> => {
    try {
      await resetUserPassword(id, newPassword);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la réinitialisation du mot de passe");
      throw err;
    }
  };

  const deactivateUserLocal = async (id: string): Promise<User> => {
    try {
      const updated = await deactivateUser(id);
      setUsers((prev) => prev.map(u => u.id === id ? updated : u));
      return updated;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la désactivation de l'utilisateur");
      throw err;
    }
  };

  const activateUserLocal = async (id: string): Promise<User> => {
    try {
      const updated = await activateUser(id);
      setUsers((prev) => prev.map(u => u.id === id ? updated : u));
      return updated;
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'activation de l'utilisateur");
      throw err;
    }
  };

  const removeUser = async (id: string): Promise<void> => {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter(u => u.id !== id));
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression de l'utilisateur");
      throw err;
    }
  };

  const bulkAction = async (userIds: string[], action: string, data?: any): Promise<BulkActionResult[]> => {
    try {
      const results = await bulkUserAction(userIds, action, data);
      // Reload users after bulk action
      await loadUsers();
      return results;
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'action groupée");
      throw err;
    }
  };

  const exportUsers = async (userIds: string[], format: 'csv' | 'excel' = 'csv'): Promise<void> => {
    try {
      const blob = await exportUserData(userIds, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'export");
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    filters,
    reload: loadUsers,
    getUser,
    addUser,
    editUser,
    resetPassword,
    deactivateUser: deactivateUserLocal,
    activateUser: activateUserLocal,
    removeUser,
    bulkAction,
    exportUserData: exportUsers,
  };
}

export function useUserDashboardStats() {
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    reload: loadStats
  };
}