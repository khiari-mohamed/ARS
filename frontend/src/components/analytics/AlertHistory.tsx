import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress
} from '@mui/material';
import { useAlertHistory } from '../../hooks/useAlertsQuery';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';

const AlertHistory: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: history = [], isLoading } = useAlertHistory({});

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Historique des Alertes
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Niveau</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((alert: any) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{alert.alertType}</TableCell>
                  <TableCell>
                    <Chip
                      label={alertLevelLabel(alert.alertLevel)}
                      sx={{
                        backgroundColor: alertLevelColor(alert.alertLevel),
                        color: '#fff',
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{alert.message}</TableCell>
                  <TableCell>
                    <Chip
                      label={alert.resolved ? 'Résolu' : 'Actif'}
                      color={alert.resolved ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={history.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
          labelRowsPerPage="Lignes par page:"
        />
      </CardContent>
    </Card>
  );
};

export default AlertHistory;