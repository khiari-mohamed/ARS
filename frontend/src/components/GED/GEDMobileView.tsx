import React from 'react';
import { 
  Box, Card, CardContent, Typography, Grid, Button
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

interface Props {
  onTabChange: (tab: number) => void;
}

const GEDMobileView: React.FC<Props> = ({ onTabChange }) => {
  const quickActions = [
    { label: 'Dashboard', tab: 0, icon: '📊', color: '#2e7d32' },
    { label: 'Ingestion', tab: 1, icon: '📤', color: '#1976d2' },
    { label: 'Corbeille', tab: 2, icon: '📋', color: '#ed6c02' },
    { label: 'Recherche', tab: 3, icon: '🔍', color: '#9c27b0' },
    { label: 'Rapports', tab: 4, icon: '📄', color: '#d32f2f' }
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* Mobile Header */}
      <Card elevation={3} sx={{ mb: 2, background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <DescriptionIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Module GED
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Gestion électronique des documents
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

export default GEDMobileView;