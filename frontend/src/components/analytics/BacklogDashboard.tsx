import React from 'react';
import { Card, CardContent, Typography, Grid, Chip } from '@mui/material';

interface BacklogDashboardProps {
  data: { title: string; status: string; description?: string }[];
}

const statusColor = (status: string) => {
  switch (status) {
    case 'green':
    case 'success':
      return 'success';
    case 'orange':
    case 'warning':
      return 'warning';
    case 'red':
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

const BacklogDashboard: React.FC<BacklogDashboardProps> = ({ data }) => (
  <div>
    <Typography variant="h5" gutterBottom>Backlog Overview</Typography>
    <Grid container spacing={2}>
      {data.map((item, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{item.title}</Typography>
              <Chip
                label={item.status}
                color={statusColor(item.status)}
                size="small"
                style={{ marginTop: 8 }}
              />
              {item.description && (
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                  {item.description}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </div>
);

export default BacklogDashboard;