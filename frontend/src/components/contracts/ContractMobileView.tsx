import React, { useState } from 'react';
import { Contract } from '../../types/contract.d';
import { 
  Box, Card, CardContent, Typography, Chip, IconButton, Collapse,
  Grid, Divider, Button, Stack, useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DescriptionIcon from '@mui/icons-material/Description';

interface Props {
  contract: Contract;
  onTabChange: (tab: number) => void;
  statistics?: any;
}

const ContractMobileView: React.FC<Props> = ({ contract, onTabChange, statistics }) => {
  const [expanded, setExpanded] = useState(false);

  const getContractStatus = () => {
    const now = new Date();
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    
    if (now < start) return { label: 'Futur', color: 'info' };
    if (now > end) return { label: 'Expiré', color: 'error' };
    return { label: 'Actif', color: 'success' };
  };

  const status = getContractStatus();

  const quickActions = [
    { label: 'Bordereaux', tab: 0, icon: '📋' },
    { label: 'Réclamations', tab: 1, icon: '⚠️' },
    { label: 'Documents', tab: 2, icon: '📄' },
    { label: 'Statistiques', tab: 3, icon: '📊' }
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* Mobile Header Card */}
      <Card elevation={3} sx={{ mb: 2, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <DescriptionIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Contrat #{contract.id}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {contract.clientName}
                </Typography>
              </Box>
            </Box>
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              sx={{ color: 'white' }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
            <Chip 
              label={status.label} 
              color={status.color as any}
              size="small"
            />
          </Box>
          
          <Collapse in={expanded}>
            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Délai Règlement</Typography>
                <Typography variant="h6">{contract.delaiReglement}j</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Délai Réclamations</Typography>
                <Typography variant="h6">{contract.delaiReclamation}j</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Date Début</Typography>
                <Typography variant="body2">{new Date(contract.startDate).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Date Fin</Typography>
                <Typography variant="body2">{new Date(contract.endDate).toLocaleDateString()}</Typography>
              </Grid>
              {contract.escalationThreshold && (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Seuil d'Escalade</Typography>
                  <Typography variant="h6">{contract.escalationThreshold} jours</Typography>
                </Grid>
              )}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="primary">
                  {statistics.total || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="success.main">
                  {statistics.active || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Actifs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="warning.main">
                  {statistics.expiringSoon || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Bientôt
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="error">
                  {statistics.expired || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Expirés
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Quick Actions */}
      <Card elevation={1}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Navigation Rapide
          </Typography>
          <Grid container spacing={1}>
            {quickActions.map((action, index) => (
              <Grid item xs={6} key={index}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  onClick={() => onTabChange(action.tab)}
                  startIcon={<span>{action.icon}</span>}
                  sx={{ 
                    py: 1.5,
                    textTransform: 'none',
                    borderRadius: 2
                  }}
                >
                  {action.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ContractMobileView;