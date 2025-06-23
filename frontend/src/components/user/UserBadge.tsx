import React from 'react';
import { UserRole } from '../../types/user.d';

const roleLabels: Record<UserRole, string> = {
  ADMINISTRATEUR: 'Administrateur',
  CHEF_EQUIPE: "Chef d'Équipe",
  GESTIONNAIRE: 'Gestionnaire',
  CLIENT_SERVICE: 'Service Client',
  FINANCE: 'Finance',
};

export const UserBadge: React.FC<{ role: UserRole }> = ({ role }) => (
  <span className={`user-badge ${role}`} title={role}>
    {roleLabels[role]}
  </span>
);