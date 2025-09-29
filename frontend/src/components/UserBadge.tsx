import React, { useState } from 'react';
import { Box, Chip, Avatar, Typography, IconButton } from '@mui/material';
import { ExpandLess } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { isReadOnlyRole } from '../utils/roleUtils';

// Role display mapping for better French labels
const roleLabels: Record<string, string> = {
  'SUPER_ADMIN': 'Super Admin',
  'ADMINISTRATEUR': 'Administrateur',
  'RESPONSABLE_DEPARTEMENT': 'Resp. Département',
  'CHEF_EQUIPE': 'Chef d\'Équipe',
  'GESTIONNAIRE': 'Gestionnaire',
  'CLIENT_SERVICE': 'Service Client',
  'SERVICE_CLIENT': 'Service Client',
  'FINANCE': 'Finance',
  'SCAN_TEAM': 'Équipe Scan',
  'BO': 'Bureau d\'Ordre',
  'BUREAU_ORDRE': 'Bureau d\'Ordre',
};

// Role colors for visual distinction
const roleColors: Record<string, string> = {
  'SUPER_ADMIN': '#d32f2f',
  'ADMINISTRATEUR': '#7b1fa2',
  'RESPONSABLE_DEPARTEMENT': '#1976d2',
  'CHEF_EQUIPE': '#388e3c',
  'GESTIONNAIRE': '#f57c00',
  'CLIENT_SERVICE': '#0097a7',
  'SERVICE_CLIENT': '#0097a7',
  'FINANCE': '#5d4037',
  'SCAN_TEAM': '#616161',
  'BO': '#455a64',
  'BUREAU_ORDRE': '#455a64',
};

const UserBadge: React.FC = () => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!user) return null;

  const roleLabel = roleLabels[user.role] || user.role;
  const roleColor = roleColors[user.role] || '#666';
  
  // Get initials from full name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
        borderRadius: '12px',
        padding: '8px',
        margin: '0 8px 16px 8px',
        border: '1px solid rgba(25, 118, 210, 0.2)',
        transition: 'all 0.3s ease',
        width: isExpanded ? 'calc(100% - 16px)' : '48px',
        overflow: 'hidden',
        '&:hover': {
          backgroundColor: 'rgba(25, 118, 210, 0.12)',
        }
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          backgroundColor: roleColor,
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {getInitials(user.fullName)}
      </Avatar>
      
      {isExpanded && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#1976d2',
                fontSize: '12px',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.fullName}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Chip
                label={roleLabel}
                size="small"
                sx={{
                  height: '16px',
                  fontSize: '9px',
                  fontWeight: 500,
                  backgroundColor: `${roleColor}15`,
                  color: roleColor,
                  border: `1px solid ${roleColor}30`,
                  '& .MuiChip-label': {
                    padding: '0 4px',
                  }
                }}
              />
              {isReadOnlyRole(user.role as any) && (
                <Chip
                  label="Lecture seule"
                  size="small"
                  sx={{
                    height: '16px',
                    fontSize: '8px',
                    fontWeight: 500,
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    border: '1px solid #ffeaa7',
                    '& .MuiChip-label': {
                      padding: '0 3px',
                    }
                  }}
                />
              )}
            </Box>
          </Box>
          
          <IconButton
            size="small"
            onClick={() => setIsExpanded(false)}
            sx={{ width: 20, height: 20, ml: 0.5, color: '#1976d2' }}
          >
            <ExpandLess sx={{ fontSize: 14 }} />
          </IconButton>
        </>
      )}
    </Box>
  );
};

export default UserBadge;