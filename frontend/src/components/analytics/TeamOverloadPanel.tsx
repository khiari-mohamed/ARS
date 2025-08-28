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
import { Warning, Group } from '@mui/icons-material';

interface TeamOverloadPanelProps {
  overloads?: any[];
  data?: any[];
  loading?: boolean;
}

const TeamOverloadPanel: React.FC<TeamOverloadPanelProps> = ({ overloads, data, loading }) => {
  const teamData = overloads || data || [];
  
  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Surcharge d'Équipe ({teamData.length})
        </Typography>
        
        {teamData.length === 0 ? (
          <Typography color="text.secondary">
            Aucune surcharge détectée
          </Typography>
        ) : (
          <List>
            {teamData.map((overload, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Group color={overload.alert === 'red' ? 'error' : 'warning'} />
                </ListItemIcon>
                <ListItemText
                  primary={overload.team.fullName}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {overload.reason}
                      </Typography>
                      <Typography variant="caption">
                        Charge: {overload.count} dossiers
                      </Typography>
                    </Box>
                  }
                />
                <Chip
                  label={overload.alert === 'red' ? 'Critique' : 'Alerte'}
                  color={overload.alert === 'red' ? 'error' : 'warning'}
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

export default TeamOverloadPanel;