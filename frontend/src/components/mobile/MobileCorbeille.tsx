import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Chip, IconButton, Box, Badge } from '@mui/material';
import { Refresh, Assignment, Schedule, Warning } from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface CorbeilleItem {
  id: string;
  reference: string;
  client?: { name: string };
  statut: string;
  dateReception: string;
  priority?: number;
}

interface CorbeilleData {
  items: CorbeilleItem[];
  count: number;
  type: string;
}

const MobileCorbeille: React.FC = () => {
  const [corbeille, setCorbeille] = useState<CorbeilleData>({ items: [], count: 0, type: '' });
  const [loading, setLoading] = useState(true);

  const fetchCorbeille = async () => {
    try {
      setLoading(true);
      const { data } = await LocalAPI.get('/workflow/corbeille');
      setCorbeille(data);
    } catch (error) {
      console.error('Error fetching corbeille:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorbeille();
    const interval = setInterval(fetchCorbeille, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (statut: string) => {
    const colors: Record<string, string> = {
      'EN_ATTENTE': '#ff9800',
      'A_SCANNER': '#2196f3',
      'SCAN_EN_COURS': '#9c27b0',
      'SCANNE': '#4caf50',
      'A_AFFECTER': '#ff5722',
      'ASSIGNE': '#795548',
      'EN_COURS': '#607d8b',
      'TRAITE': '#8bc34a'
    };
    return colors[statut] || '#757575';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading corbeille...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
          <Badge badgeContent={corbeille.count} color="primary">
            <Assignment /> Corbeille
          </Badge>
        </Typography>
        <IconButton onClick={fetchCorbeille} size="small">
          <Refresh />
        </IconButton>
      </Box>

      {corbeille.items.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 3 }}>
          <CardContent>
            <Typography color="textSecondary">
              No items in your corbeille
            </Typography>
          </CardContent>
        </Card>
      ) : (
        corbeille.items.map((item) => (
          <Card key={item.id} sx={{ mb: 1, borderLeft: `4px solid ${getStatusColor(item.statut)}` }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {item.reference}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                    {item.client?.name || 'Unknown Client'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Schedule sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(item.dateReception)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Chip 
                    label={item.statut} 
                    size="small" 
                    sx={{ 
                      fontSize: '0.7rem',
                      height: 20,
                      backgroundColor: getStatusColor(item.statut),
                      color: 'white'
                    }} 
                  />
                  {item.priority && item.priority > 5 && (
                    <Warning sx={{ fontSize: 16, color: 'warning.main', mt: 0.5 }} />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default MobileCorbeille;