import React, { useMemo, useState } from 'react';
import { User, UserRole } from '../../types/user.d';
import { UserBadge } from './UserBadge';
import {
  canEditUser,
  canEditRole,
  canResetPassword,
  canDisableUser,
} from '../../utils/roleUtils';

interface UsersListProps {
  users: User[];
  currentUserRole: UserRole;
  onEdit: (user: User) => void;
  onView: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDisable: (user: User) => void;
}

const roleLabels: Record<UserRole, string> = {
  ADMINISTRATEUR: 'Administrateur',
  CHEF_EQUIPE: "Chef d'Équipe",
  GESTIONNAIRE: 'Gestionnaire',
  CLIENT_SERVICE: 'Service Client',
  FINANCE: 'Finance',
  SCAN_TEAM: 'Équipe Scan',
  BO: 'Bureau d’Ordre',
};

export const UsersList: React.FC<UsersListProps> = ({
  users,
  currentUserRole,
  onEdit,
  onView,
  onResetPassword,
  onDisable,
}) => {
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const filtered = useMemo(() => {
    return users
      .filter(u => (roleFilter ? u.role === roleFilter : true))
      .filter(u => (departmentFilter ? (u.department || '').toLowerCase().includes(departmentFilter.toLowerCase()) : true))
      .filter(u =>
        search
          ? u.fullName.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
          : true
      );
  }, [users, roleFilter, departmentFilter, search]);

  // CSV export function
  const exportCSV = () => {
    const headers = ['ID', 'Nom', 'Email', 'Rôle', 'Département', 'État'];
    const rows = filtered.map(u => [
      u.id,
      u.fullName,
      u.email,
      roleLabels[u.role],
      u.department || '',
      u.active ? 'Actif' : 'Inactif',
    ]);
    const csv = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utilisateurs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="user-filter-bar">
        <input
          placeholder="Recherche nom/email"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">Tous rôles</option>
          {Object.entries(roleLabels).map(([role, label]) => (
            <option key={role} value={role}>
              {label}
            </option>
          ))}
        </select>
        <input
          placeholder="Département"
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
        />
        <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={exportCSV}>
          Exporter CSV
        </button>
      </div>
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Département</th>
            <th>État</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(user => (
            <tr key={user.id}>
              <td>{user.id.slice(0, 8)}</td>
              <td>
                <button className="link" onClick={() => onView(user)}>
                  {user.fullName}
                </button>
              </td>
              <td>{user.email}</td>
              <td>
                <span className={`user-badge ${user.role}`}>{roleLabels[user.role]}</span>
              </td>
              <td>{user.department || '-'}</td>
              <td>
                <span className={`user-state ${user.active ? 'active' : 'inactive'}`}>
                  {user.active ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="users-actions">
                {canEditUser(currentUserRole, user) && (
                  <button className="btn btn-sm" onClick={() => onEdit(user)}>
                    Modifier
                  </button>
                )}
                {canResetPassword(currentUserRole) && (
                  <button className="btn btn-sm" onClick={() => onResetPassword(user)}>
                    Réinit. MDP
                  </button>
                )}
                {canDisableUser(currentUserRole) && user.active && (
                  <button className="btn btn-sm btn-danger" onClick={() => onDisable(user)}>
                    Désactiver
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7}>
                <div className="users-empty-state">
                  Aucun utilisateur trouvé.
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};