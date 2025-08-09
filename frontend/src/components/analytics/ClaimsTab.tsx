import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  filters: any;
  dateRange: any;
}

const ClaimsTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData({
      claimsByType: [
        { type: 'Délai traitement', volume: 45, resolved: 38, avgResolutionTime: 2.3 },
        { type: 'Erreur saisie', volume: 23, resolved: 20, avgResolutionTime: 1.8 },
        { type: 'Document manquant', volume: 18, resolved: 15, avgResolutionTime: 3.1 },
        { type: 'Montant incorrect', volume: 12, resolved: 10, avgResolutionTime: 2.7 }
      ],
      claimsTrend: [
        { month: 'Jan', claims: 45, resolved: 38 },
        { month: 'Fév', claims: 52, resolved: 45 },
        { month: 'Mar', claims: 38, resolved: 35 }
      ]
    });
  }, [filters, dateRange]);

  if (!data) return <Typography>Chargement...</Typography>;

  const getResolutionRate = (resolved: number, total: number) => {
    return Math.round((resolved / total) * 100);
  };

  const getResolutionColor = (rate: number) => {
    if (rate >= 90) return 'success';
    if (rate >= 75) return 'warning';
    return 'error';
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Évolution des Réclamations</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.claimsTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="claims" fill="#f44336" name="Réclamations" />
              <Bar dataKey="resolved" fill="#4caf50" name="Résolues" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Top 5 Causes</Typography>
          {data.claimsByType.slice(0, 5).map((claim: any, index: number) => (
            <Paper key={index} variant="outlined" sx={{ p: 2, mb: 1 }}>
              <Typography variant="subtitle2">{claim.type}</Typography>
              <Typography variant="h6" color="error">{claim.volume}</Typography>
              <Typography variant="caption" color="textSecondary">
                {getResolutionRate(claim.resolved, claim.volume)}% résolues
              </Typography>
            </Paper>
          ))}
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Analyse Détaillée des Réclamations</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type de Réclamation</TableCell>
                <TableCell>Volume</TableCell>
                <TableCell>Résolues</TableCell>
                <TableCell>Taux de Résolution</TableCell>
                <TableCell>Temps Moyen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.claimsByType.map((claim: any, index: number) => {
                const resolutionRate = getResolutionRate(claim.resolved, claim.volume);
                return (
                  <TableRow key={index}>
                    <TableCell>{claim.type}</TableCell>
                    <TableCell>{claim.volume}</TableCell>
                    <TableCell>{claim.resolved}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${resolutionRate}%`}
                        color={getResolutionColor(resolutionRate) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{claim.avgResolutionTime}j</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ClaimsTab;