import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Box,
  CircularProgress
} from '@mui/material';
import { Report, Warning } from '@mui/icons-material';

interface ReclamationAlertsProps {
  reclamations?: any[];
  data?: any[];
  loading?: boolean;
}

const ReclamationAlerts: React.FC<ReclamationAlertsProps> = ({ reclamations, data, loading }) => {
  const reclamationData = reclamations || data || [];
  
  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Alertes Réclamations ({reclamationData.length})
        </Typography>
        
        {reclamationData.length === 0 ? (
          <Typography color="text.secondary">
            Aucune réclamation récente
          </Typography>
        ) : (
          <List>
            {reclamationData.slice(0, 5).map((reclamation, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Report color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={`Réclamation #${reclamation.reclamation.id}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {reclamation.reason}
                      </Typography>
                      <Typography variant="caption">
                        Statut: {reclamation.status}
                      </Typography>
                    </Box>
                  }
                />
                <Chip
                  label="Critique"
                  color="error"
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default ReclamationAlerts;