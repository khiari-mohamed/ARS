import React from 'react';
import { 
  Box, Card, CardContent, Typography, Grid, Button
} from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';

interface Props {
  onTabChange: (tab: number) => void;
}

const GECMobileView: React.FC<Props> = ({ onTabChange }) => {
  const quickActions = [
    { label: 'Dashboard', tab: 0, icon: '📊', color: '#7b1fa2' },
    { label: 'Créer Courrier', tab: 1, icon: '✍️', color: '#1976d2' },
    { label: 'Boîte Réception', tab: 2, icon: '📥', color: '#2e7d32' },
    { label: 'Boîte Envoi', tab: 3, icon: '📤', color: '#ed6c02' },
    { label: 'Relances', tab: 4, icon: '🔄', color: '#f57c00' },
    { label: 'Outlook/365', tab: 5, icon: '📧', color: '#0078d4' },
    { label: 'Suivi Emails', tab: 6, icon: '📈', color: '#388e3c' },
    { label: 'Modèles', tab: 7, icon: '📝', color: '#7b1fa2' },
    { label: 'Insights IA', tab: 8, icon: '🤖', color: '#e91e63' },
    { label: 'Recherche', tab: 9, icon: '🔍', color: '#9c27b0' },
    { label: 'Rapports', tab: 10, icon: '📄', color: '#d32f2f' }
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* Mobile Header */}
      <Card elevation={3} sx={{ mb: 2, background: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <MailIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Module GEC
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Gestion électronique du courrier
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Card elevation={1}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Navigation Rapide
          </Typography>
          <Grid container spacing={1}>
            {quickActions.map((action, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  onClick={() => onTabChange(action.tab)}
                  startIcon={<span>{action.icon}</span>}
                  sx={{ 
                    py: 1.5,
                    textTransform: 'none',
                    borderRadius: 2,
                    borderColor: action.color,
                    color: action.color,
                    '&:hover': {
                      borderColor: action.color,
                      bgcolor: `${action.color}10`
                    }
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

export default GECMobileView;