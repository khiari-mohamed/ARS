import React from 'react';
import { 
  Box, Card, CardContent, Typography, Grid, Button
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

interface Props {
  onTabChange: (tab: number) => void;
  tabs: Array<{ label: string }>;
}

const FinanceMobileView: React.FC<Props> = ({ onTabChange, tabs }) => {
  const actionStyles = [
    { icon: '💰', color: '#1976d2' },
    { icon: '📊', color: '#2e7d32' },
    { icon: '🏦', color: '#ed6c02' },
    { icon: '👥', color: '#9c27b0' },
    { icon: '⚠️', color: '#d32f2f' },
    { icon: '🏛️', color: '#795548' },
    { icon: '🔄', color: '#607d8b' },
    { icon: '📈', color: '#ff5722' },
    { icon: '📄', color: '#3f51b5' }
  ];
  const quickActions = tabs
    .map((tab, index) => ({ ...tab, tab: index, ...actionStyles[index] }))
    .filter(action => action.label !== 'Ordre de Virement');

  return (
    <Box sx={{ p: 2 }}>
      {/* Mobile Header */}
      <Card elevation={3} sx={{ mb: 2, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <AccountBalanceIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Module Finance
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Gestion des virements bancaires
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
              <Grid item xs={6} sm={4} key={index}>
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

export default FinanceMobileView;