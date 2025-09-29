import React from 'react';
import { isReadOnlyRole } from '../utils/roleUtils';
import { UserRole } from '../types/user.d';

interface ReadOnlyBadgeProps {
  userRole: UserRole;
  style?: React.CSSProperties;
}

export const ReadOnlyBadge: React.FC<ReadOnlyBadgeProps> = ({ userRole, style }) => {
  if (!isReadOnlyRole(userRole)) return null;

  return (
    <span
      style={{
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        border: '1px solid #ffeaa7',
        ...style,
      }}
    >
      Lecture seule
    </span>
  );
};

export default ReadOnlyBadge;