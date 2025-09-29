import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useIsReadOnly } from './ReadOnlyWrapper';

interface PermissionGuardProps {
  children: React.ReactNode;
  action?: 'create' | 'update' | 'delete' | 'assign' | 'manage';
  fallback?: React.ReactNode;
  showReadOnly?: boolean; // If true, shows content but disabled for read-only roles
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  children, 
  action,
  fallback = null,
  showReadOnly = false
}) => {
  const { user } = useAuth();
  const isReadOnly = useIsReadOnly();

  // If no specific action is required, just check if user exists
  if (!action) {
    return user ? <>{children}</> : <>{fallback}</>;
  }

  // For read-only roles, show content but disabled if showReadOnly is true
  if (isReadOnly) {
    if (showReadOnly) {
      return (
        <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
          {children}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  // For write actions, check specific permissions
  const writeActions = ['create', 'update', 'delete', 'assign', 'manage'];
  if (writeActions.includes(action) && isReadOnly) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Utility hook for permission checking
export const usePermission = (action?: string) => {
  const { user } = useAuth();
  const isReadOnly = useIsReadOnly();

  return {
    canView: !!user,
    canModify: !!user && !isReadOnly,
    isReadOnly,
    user
  };
};