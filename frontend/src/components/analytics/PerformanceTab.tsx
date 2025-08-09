import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  filters: any;
  dateRange: any;
}

const PerformanceTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData({
      departmentPerformance: [
        { department: 'SCAN', slaCompliance: 92, avgTime: 2.1, workload: 156 },
        { department: 'BO', slaCompliance: 87, avgTime: 3.2, workload: 203 },
        { department: 'Gestion', slaCompliance: 84, avgTime: 4.1, workload: 178 },
        { department: 'Finance', slaCompliance: 91, avgTime: 2.8, workload: 89 }
      ],
      teamRanking: [
        { name: 'Équipe A', processed: 245, slaRate: 94 },
        { name: 'Équipe B', processed: 198, slaRate: 89 },
        { name: 'Équipe C', processed: 167, slaRate: 86 }
      ]
    });
  }, [filters, dateRange]);

  if (!data) return <Typography>Chargement...</Typography>;

  const getSLAColor = (rate: number) => {
    if (rate >= 90) return 'success';
    if (rate >= 80) return 'warning';
    return 'error';
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Performance par Département</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="slaCompliance" fill="#1976d2" name="SLA %" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
      
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Classement des Équipes</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Département</TableCell>
                <TableCell>Conformité SLA</TableCell>
                <TableCell>Temps Moyen</TableCell>
                <TableCell>Charge de Travail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.departmentPerformance.map((dept: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{dept.department}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${dept.slaCompliance}%`} 
                      color={getSLAColor(dept.slaCompliance) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{dept.avgTime}j</TableCell>
                  <TableCell>{dept.workload}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default PerformanceTab;