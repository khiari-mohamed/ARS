import React from 'react';
import { Card, CardContent, Typography, Grid, Chip } from '@mui/material';

interface AssignedTasksDashboardProps {
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

const AssignedTasksDashboard: React.FC<AssignedTasksDashboardProps> = ({ data }) => (
  <div>
    <Typography variant="h5" gutterBottom>Assigned Tasks</Typography>
    <Grid container spacing={2}>
      {data.map((task, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{task.title}</Typography>
              <Chip
                label={task.status}
                color={statusColor(task.status)}
                size="small"
                style={{ marginTop: 8 }}
              />
              {task.description && (
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                  {task.description}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </div>
);

export default AssignedTasksDashboard;