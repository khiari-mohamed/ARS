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
import { PriorityHigh, Assignment } from '@mui/icons-material';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';

interface PriorityListProps {
  items?: any[];
  alerts?: any[];
  loading?: boolean;
}

const PriorityList: React.FC<PriorityListProps> = ({ items, alerts, loading }) => {
  const data = items || alerts || [];
  
  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Bordereaux Prioritaires ({data.length})
        </Typography>
        
        {data.length === 0 ? (
          <Typography color="text.secondary">
            Aucun bordereau prioritaire
          </Typography>
        ) : (
          <List>
            {data.slice(0, 10).map((item, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <PriorityHigh color={item.alertLevel === 'red' ? 'error' : 'warning'} />
                </ListItemIcon>
                <ListItemText
                  primary={`Bordereau #${item.bordereau.id}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.reason}
                      </Typography>
                      <Typography variant="caption">
                        SLA: {item.daysSinceReception} jours
                      </Typography>
                    </Box>
                  }
                />
                <Chip
                  label={alertLevelLabel(item.alertLevel)}
                  sx={{
                    backgroundColor: alertLevelColor(item.alertLevel),
                    color: '#fff',
                  }}
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

export default PriorityList;