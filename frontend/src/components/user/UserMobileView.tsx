import React from 'react';
import { User, UserRole } from '../../types/user.d';
import { Card, CardContent, Typography, Chip, Box, Avatar, IconButton, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore, Edit, Visibility, Lock, PersonOff } from '@mui/icons-material';
import { canEditUser, canResetPassword, canDisableUser } from '../../utils/roleUtils';

interface Props {
  users: User[];
  currentUserRole: UserRole;
  onEdit: (user: User) => void;
  onView: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDisable: (user: User) => void;
}

const roleColors = {
  SUPER_ADMIN: '#f50057',
  ADMINISTRATEUR: '#3f51b5',
  RESPONSABLE_DEPARTEMENT: '#ff9800',
  CHEF_EQUIPE: '#4caf50',
  GESTIONNAIRE: '#2196f3',
  CLIENT_SERVICE: '#9c27b0',
  FINANCE: '#ff5722',
  SCAN_TEAM: '#607d8b',
  BO: '#795548'
};

const UserMobileView: React.FC<Props> = ({ users, currentUserRole, onEdit, onView, onResetPassword, onDisable }) => {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2 }}>
      <Typography variant="h6" gutterBottom>Utilisateurs ({users.length})</Typography>
      
      {users.map((user) => (
        <Accordion key={user.id} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" width="100%">
              <Avatar 
                src={user.photo} 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  mr: 2,
                  bgcolor: roleColors[user.role] || '#grey'
                }}
              >
                {user.fullName.charAt(0)}
              </Avatar>
              <Box flex={1}>
                <Typography variant="subtitle2">{user.fullName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
              <Chip 
                size="small" 
                label={user.role.replace('_', ' ')}
                sx={{ 
                  bgcolor: roleColors[user.role] || '#grey',
                  color: 'white',
                  fontSize: '0.7rem'
                }}
              />
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Département:</strong> {user.department || 'Non défini'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Équipe:</strong> {user.team || 'Non définie'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Statut:</strong> 
                <Chip 
                  size="small" 
                  label={user.active ? 'Actif' : 'Inactif'}
                  color={user.active ? 'success' : 'error'}
                  sx={{ ml: 1 }}
                />
              </Typography>
              {user.lastLogin && (
                <Typography variant="body2" gutterBottom>
                  <strong>Dernière connexion:</strong> {new Date(user.lastLogin).toLocaleDateString()}
                </Typography>
              )}
              
              <Box display="flex" gap={1} mt={2} flexWrap="wrap">
                <IconButton size="small" onClick={() => onView(user)} color="primary">
                  <Visibility fontSize="small" />
                </IconButton>
                
                {canEditUser(currentUserRole, user) && (
                  <IconButton size="small" onClick={() => onEdit(user)} color="secondary">
                    <Edit fontSize="small" />
                  </IconButton>
                )}
                
                {canResetPassword(currentUserRole) && (
                  <IconButton size="small" onClick={() => onResetPassword(user)} color="warning">
                    <Lock fontSize="small" />
                  </IconButton>
                )}
                
                {canDisableUser(currentUserRole) && user.active && (
                  <IconButton size="small" onClick={() => onDisable(user)} color="error">
                    <PersonOff fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default UserMobileView;