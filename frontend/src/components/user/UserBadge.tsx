import React from 'react';
import { UserRole } from '../../types/user.d';

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMINISTRATEUR: 'Administrateur',
  RESPONSABLE_DEPARTEMENT: 'Responsable Département',
  CHEF_EQUIPE: "Chef d'Équipe",
  GESTIONNAIRE: 'Gestionnaire',
  CLIENT_SERVICE: 'Service Client',
  FINANCE: 'Finance',
  SCAN_TEAM: 'Équipe Scan',
  BO: "Bureau d'Ordre",
};

export const UserBadge: React.FC<{ role: UserRole }> = ({ role }) => (
  <span className={`user-badge ${role}`} title={role}>
    {roleLabels[role]}
  </span>
);