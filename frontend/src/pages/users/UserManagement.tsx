import React, { useState } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { UsersList } from '../../components/user/UsersList';
import { UserForm } from '../../components/user/UserForm';
import { UserDetail } from '../../components/user/UserDetail';
import { canCreateUser, canViewUsers } from '../../utils/roleUtils';
import { User, UserRole } from '../../types/user.d';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const {
    users,
    loading,
    error,
    reload,
    addUser,
    editUser,
    resetPassword,
    deactivateUser,
  } = useUsers();

  const [showForm, setShowForm] = useState<null | { mode: 'create' | 'edit'; user?: User }>(null);
  const [showDetail, setShowDetail] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If not authenticated or role is not a valid UserRole, block access
  if (
    !currentUser ||
    !currentUser.role ||
    !['ADMINISTRATEUR', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'CLIENT_SERVICE', 'FINANCE'].includes(currentUser.role)
  ) {
    return <div style={{ color: 'red', margin: 32 }}>Accès refusé.</div>;
  }

  // Now it's safe to cast
  const currentUserRole = currentUser.role as UserRole;

  const handleCreate = () => setShowForm({ mode: 'create' });
  const handleEdit = (user: User) => setShowForm({ mode: 'edit', user });
  const handleView = (user: User) => setShowDetail(user);

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (showForm?.mode === 'create') {
        await addUser(data);
      } else if (showForm?.mode === 'edit' && showForm.user) {
        await editUser(showForm.user.id, data);
      }
      setShowForm(null);
      reload();
    } catch (err: any) {
      setFormError(err.message || 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    const newPwd = prompt('Nouveau mot de passe (min 8 char, 1 maj, 1 chiffre):');
    if (!newPwd) return;
    if (newPwd.length < 8 || !/[A-Z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      alert('Mot de passe non conforme.');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(user.id, newPwd);
      alert('Mot de passe réinitialisé.');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async (user: User) => {
    if (!window.confirm(`Désactiver ${user.fullName} ?`)) return;
    setIsSubmitting(true);
    try {
      await deactivateUser(user.id);
      reload();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la désactivation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="user-management-container">
      <h1 className="user-management-title">Gestion des utilisateurs</h1>
      {canCreateUser(currentUserRole) && (
        <div className="user-management-actions">
          <button className="btn" onClick={handleCreate}>
            Créer utilisateur
          </button>
        </div>
      )}
      {loading && <div>Chargement...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <UsersList
        users={users}
        currentUserRole={currentUserRole}
        onEdit={handleEdit}
        onView={handleView}
        onResetPassword={handleResetPassword}
        onDisable={handleDisable}
      />
      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <UserForm
              mode={showForm.mode}
              initial={showForm.user}
              onSubmit={handleFormSubmit}
              onCancel={() => setShowForm(null)}
              currentUserRole={currentUserRole}
              isSubmitting={isSubmitting}
              error={formError}
              showPassword={showForm.mode === 'create'}
            />
          </div>
        </div>
      )}
      {showDetail && (
        <div className="modal">
          <div className="modal-content">
            <UserDetail user={showDetail} onClose={() => setShowDetail(null)} />
          </div>
        </div>
      )}
    </div>
  );
}