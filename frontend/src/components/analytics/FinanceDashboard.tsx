import React from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';

interface FinanceDashboardProps {
  data: { totalRevenue?: number; totalExpenses?: number; [key: string]: any };
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ data }) => (
  <div>
    <Typography variant="h5" gutterBottom>Finance Overview</Typography>
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1">Total Revenue</Typography>
            <Typography variant="h6" color="primary">
              {data.totalRevenue !== undefined ? data.totalRevenue : '-'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1">Total Expenses</Typography>
            <Typography variant="h6" color="error">
              {data.totalExpenses !== undefined ? data.totalExpenses : '-'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      {/* Add more finance KPIs as needed */}
    </Grid>
  </div>
);

export default FinanceDashboard;