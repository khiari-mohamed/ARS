import React from 'react';
import { Box, Typography, Chip, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { CheckCircle, Person, TrendingUp } from '@mui/icons-material';
import { moduleData } from './guideData';

interface ModuleDetailsProps {
  moduleId: string;
  role: string;
}

const ModuleDetails: React.FC<ModuleDetailsProps> = ({ moduleId, role }) => {
  const module = moduleData[moduleId];
  
  if (!module) {
    return (
      <Typography color="textSecondary">
        Module non trouvé
      </Typography>
    );
  }

  const getAccessibleFeatures = () => {
    if (role === 'ALL') return module.features;
    
    const roleAccess: Record<string, string[]> = {
      'BUREAU_ORDRE': ['Saisie initiale', 'Génération référence', 'Classification documents'],
      'SCAN': ['Numérisation OCR', 'Indexation GED', 'Archivage'],
      'CHEF_EQUIPE': ['Affectation équipe', 'Suivi performance', 'Gestion corbeille'],
      'GESTIONNAIRE': ['Traitement dossiers', 'Validation BS', 'Suivi SLA'],
      'FINANCE': ['Génération virements', 'Confirmation paiements', 'Export bancaire'],
      'CLIENT_SERVICE': ['Gestion réclamations', 'Suivi clients', 'Correspondance']
    };
    
    const accessible = roleAccess[role] || [];
    return module.features.filter((feature: string) => 
      accessible.some(access => feature.toLowerCase().includes(access.toLowerCase()))
    );
  };

  return (
    <Box>
      {/* Module Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {module.icon}
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
            {module.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" paragraph>
          {module.description}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Key Features */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        <CheckCircle sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
        Fonctionnalités Clés
      </Typography>
      <List dense>
        {getAccessibleFeatures().map((feature: string, index: number) => (
          <ListItem key={index} sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText 
              primary={feature}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Access Rights */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        <Person sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
        Accès Autorisé
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {module.roles.map((roleItem: string, index: number) => (
          <Chip
            key={index}
            label={roleItem}
            size="small"
            variant={role === 'ALL' || roleItem.includes(role.replace('_', ' ')) ? 'filled' : 'outlined'}
            color={role === 'ALL' || roleItem.includes(role.replace('_', ' ')) ? 'primary' : 'default'}
          />
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* KPIs */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        <TrendingUp sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
        KPIs Principaux
      </Typography>
      <List dense>
        {module.kpis.map((kpi: string, index: number) => (
          <ListItem key={index} sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
            </ListItemIcon>
            <ListItemText 
              primary={kpi}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        ))}
      </List>

      {/* Connections */}
      {module.connections && module.connections.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            🔗 Connexions
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {module.connections.join(' → ')}
          </Typography>
        </>
      )}
    </Box>
  );
};

export default ModuleDetails;