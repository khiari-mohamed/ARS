import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button, Box } from '@mui/material';

interface Props {
  filters: any;
  dateRange: any;
}

const SLARiskTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData({
      atRiskBordereaux: [
        { id: 'BDX/2025/001', client: 'Client A', daysRemaining: 1, status: 'warning', workload: 'high' },
        { id: 'BDX/2025/002', client: 'Client B', daysRemaining: -2, status: 'critical', workload: 'medium' },
        { id: 'BDX/2025/003', client: 'Client C', daysRemaining: 0, status: 'critical', workload: 'high' },
        { id: 'BDX/2025/004', client: 'Client D', daysRemaining: 2, status: 'warning', workload: 'low' }
      ],
      workloadDistribution: [
        { team: 'Équipe A', workload: 85, capacity: 100, risk: 'medium' },
        { team: 'Équipe B', workload: 95, capacity: 100, risk: 'high' },
        { team: 'Équipe C', workload: 65, capacity: 100, risk: 'low' }
      ]
    });
  }, [filters, dateRange]);

  if (!data) return <Typography>Chargement...</Typography>;

  const getSLAStatusChip = (daysRemaining: number) => {
    if (daysRemaining < 0) return <Chip label="🔴 En retard" color="error" size="small" />;
    if (daysRemaining === 0) return <Chip label="🔴 Critique" color="error" size="small" />;
    if (daysRemaining <= 1) return <Chip label="🟠 À risque" color="warning" size="small" />;
    return <Chip label="🟢 À temps" color="success" size="small" />;
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const handleReallocate = (bordereauId: string) => {
    console.log('Reallocating bordereau:', bordereauId);
    // Implementation for reallocation
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Bordereaux à Risque SLA</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Status SLA</TableCell>
                <TableCell>Jours Restants</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.atRiskBordereaux.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell>{getSLAStatusChip(item.daysRemaining)}</TableCell>
                  <TableCell>
                    {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)} jours de retard` : 
                     item.daysRemaining === 0 ? 'Échéance aujourd\'hui' :
                     `${item.daysRemaining} jour(s) restant(s)`}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handleReallocate(item.id)}
                      disabled={item.daysRemaining > 1}
                    >
                      Réallouer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Répartition de la Charge de Travail</Typography>
          <Grid container spacing={2}>
            {data.workloadDistribution.map((team: any, index: number) => {
              const percentage = Math.round((team.workload / team.capacity) * 100);
              return (
                <Grid item xs={12} md={4} key={index}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>{team.team}</Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="h4" color={`${getWorkloadColor(percentage)}.main`}>
                        {percentage}%
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {team.workload}/{team.capacity} dossiers
                      </Typography>
                    </Box>
                    <Chip 
                      label={team.risk === 'high' ? 'Surcharge' : team.risk === 'medium' ? 'Attention' : 'Normal'}
                      color={team.risk === 'high' ? 'error' : team.risk === 'medium' ? 'warning' : 'success'}
                      size="small"
                    />
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default SLARiskTab;