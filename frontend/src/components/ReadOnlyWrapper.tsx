import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ReadOnlyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const ReadOnlyWrapper: React.FC<ReadOnlyWrapperProps> = ({ 
  children, 
  fallback = null,
  className = ''
}) => {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'RESPONSABLE_DEPARTEMENT';

  if (isReadOnly) {
    return (
      <div className={`read-only-wrapper ${className}`} style={{ opacity: 0.6, pointerEvents: 'none' }}>
        {fallback || children}
      </div>
    );
  }

  return <>{children}</>;
};

// Hook for checking read-only status
export const useIsReadOnly = (): boolean => {
  const { user } = useAuth();
  return user?.role === 'RESPONSABLE_DEPARTEMENT';
};