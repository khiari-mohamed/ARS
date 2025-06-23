import { useCallback, useEffect, useState } from 'react';
import {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  resetUserPassword,
  disableUser,
  CreateUserDTO,
  UpdateUserDTO,
  ExtendedUser,
  User,
} from '../api/usersApi';

/**
 * Helper to upgrade a legacy User to ExtendedUser.
 * If your backend always returns ExtendedUser, this is a no-op.
 */
function toExtendedUser(u: User): ExtendedUser {
  // If already has all fields, just return as is
  if (
    typeof (u as ExtendedUser).email === 'string' &&
    typeof (u as ExtendedUser).active === 'boolean' &&
    typeof (u as ExtendedUser).createdAt === 'string' &&
    typeof (u as ExtendedUser).updatedAt === 'string'
  ) {
    return u as ExtendedUser;
  }
  // Otherwise, fill with defaults (for legacy)
  return {
    ...u,
    email: '',
    department: '',
    active: true,
    createdAt: '',
    updatedAt: '',
    role: (u.role as any) || 'GESTIONNAIRE',
  };
}

export function useUsers() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      // Convert legacy User[] to ExtendedUser[]
      setUsers(data.map(toExtendedUser));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getUser = async (id: string) => {
    try {
      return await fetchUserById(id); // returns ExtendedUser
    } catch (err: any) {
      setError(err.message || "Erreur lors de la récupération de l'utilisateur");
      throw err;
    }
  };

  const addUser = async (user: CreateUserDTO) => {
    try {
      const newUser = await createUser(user); // returns ExtendedUser
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'utilisateur");
      throw err;
    }
  };

  const editUser = async (id: string, updates: UpdateUserDTO) => {
    try {
      const updated = await updateUser(id, updates); // returns ExtendedUser
      setUsers((prev) => prev.map(u => u.id === id ? updated : u));
      return updated;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la modification de l'utilisateur");
      throw err;
    }
  };

  const resetPassword = async (id: string, newPassword: string) => {
    try {
      await resetUserPassword(id, newPassword);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la réinitialisation du mot de passe");
      throw err;
    }
  };

  const deactivateUser = async (id: string) => {
    try {
      const updated = await disableUser(id); // returns ExtendedUser
      setUsers((prev) => prev.map(u => u.id === id ? updated : u));
      return updated;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la désactivation de l'utilisateur");
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    reload: loadUsers,
    getUser,
    addUser,
    editUser,
    resetPassword,
    deactivateUser,
  };
}