import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  useTheme
} from '@mui/material';
import {
  Dashboard,
  CloudUpload,
  Search,
  Assignment,
  Settings,
  BarChart,
  Description,
  CheckCircle,
  Warning,
  Error
} from '@mui/icons-material';

interface GEDMobileViewProps {
  onTabChange: (tab: number) => void;
}

const GEDMobileView: React.FC<GEDMobileViewProps> = ({ onTabChange }) => {
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const theme = useTheme();

  const quickActions = [
    { icon: <CloudUpload />, name: 'Upload', action: () => onTabChange(1) },
    { icon: <Search />, name: 'Recherche', action: () => onTabChange(3) },
    { icon: <Assignment />, name: 'Workflows', action: () => onTabChange(4) },
    { icon: <BarChart />, name: 'Rapports', action: () => onTabChange(6) }
  ];

  const recentDocuments = [
    { id: '1', name: 'BS_Client_A_001.pdf', type: 'BS', status: 'TRAITE', sla: 'green' },
    { id: '2', name: 'Contrat_Client_B.pdf', type: 'CONTRAT', status: 'EN_COURS', sla: 'orange' },
    { id: '3', name: 'Courrier_Reclamation.pdf', type: 'COURRIER', status: 'UPLOADED', sla: 'red' }
  ];

  const getSLAIcon = (sla: string) => {
    switch (sla) {
      case 'green': return <CheckCircle color="success" />;
      case 'orange': return <Warning color="warning" />;
      case 'red': return <Error color="error" />;
      default: return <CheckCircle color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TRAITE': return 'success';
      case 'EN_COURS': return 'primary';
      case 'UPLOADED': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ pb: 8 }}>
      {/* Quick Stats */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Vue d'ensemble
          </Typography>
          <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box textAlign="center" onClick={() => onTabChange(0)} sx={{ cursor: 'pointer' }}>
              <Typography variant="h4" color="primary">156</Typography>
              <Typography variant="caption">Total Docs</Typography>
            </Box>
            <Box textAlign="center" onClick={() => onTabChange(2)} sx={{ cursor: 'pointer' }}>
              <Typography variant="h4" color="warning.main">23</Typography>
              <Typography variant="caption">En cours</Typography>
            </Box>
            <Box textAlign="center" onClick={() => onTabChange(2)} sx={{ cursor: 'pointer' }}>
              <Typography variant="h4" color="error.main">5</Typography>
              <Typography variant="caption">En retard</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Documents */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Documents Récents
          </Typography>
          <List dense>
            {recentDocuments.map((doc) => (
              <ListItem key={doc.id} sx={{ px: 0 }}>
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    <Description fontSize="small" />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                        {doc.name}
                      </Typography>
                      {getSLAIcon(doc.sla)}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                      <Chip 
                        label={doc.type} 
                        size="small" 
                        variant="outlined" 
                      />
                      <Chip 
                        label={doc.status} 
                        size="small" 
                        color={getStatusColor(doc.status) as any}
                      />
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Quick Access Tabs */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Accès Rapide
          </Typography>
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
            <Box 
              textAlign="center" 
              p={2} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onTabChange(0)}
            >
              <Dashboard color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">Dashboard</Typography>
            </Box>
            <Box 
              textAlign="center" 
              p={2} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onTabChange(1)}
            >
              <CloudUpload color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">Ingestion</Typography>
            </Box>
            <Box 
              textAlign="center" 
              p={2} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onTabChange(2)}
            >
              <Assignment color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">Corbeille</Typography>
            </Box>
            <Box 
              textAlign="center" 
              p={2} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onTabChange(3)}
            >
              <Search color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">Recherche</Typography>
            </Box>
            <Box 
              textAlign="center" 
              p={2} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onTabChange(4)}
            >
              <Settings color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">Workflows</Typography>
            </Box>
            <Box 
              textAlign="center" 
              p={2} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onTabChange(5)}
            >
              <Settings color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">Intégrations</Typography>
            </Box>
            <Box 
              textAlign="center" 
              p={2} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onTabChange(6)}
            >
              <Description color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">PaperStream</Typography>
            </Box>
            <Box 
              textAlign="center" 
              p={2} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onTabChange(7)}
            >
              <BarChart color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">Rapports</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Actions rapides"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
      >
        {quickActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => {
              action.action();
              setSpeedDialOpen(false);
            }}
          />
        ))}
      </SpeedDial>
    </Box>
  );
};

export default GEDMobileView;