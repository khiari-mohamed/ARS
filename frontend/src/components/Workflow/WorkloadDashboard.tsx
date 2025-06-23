import React, { useEffect, useState } from 'react';
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from '@mui/material';
import { getWorkflowAssignments } from '../../api/workflowApi';

const WorkloadDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkflowAssignments().then(data => {
      setAssignments(data);
      setLoading(false);
    });
  }, []);

  // Calcul de la charge par gestionnaire
  const workload: Record<string, number> = {};
  assignments.forEach(a => {
    if (a.status !== 'COMPLETED') {
      const key = a.assigneeName || a.assigneeId;
      workload[key] = (workload[key] || 0) + 1;
    }
  });

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Charge de travail par gestionnaire</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Gestionnaire</TableCell>
            <TableCell>Nombre de tâches en cours</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(workload).map(([assignee, count]) => (
            <TableRow key={assignee}>
              <TableCell>{assignee}</TableCell>
              <TableCell>{count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default WorkloadDashboard;
