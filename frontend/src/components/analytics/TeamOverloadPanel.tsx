import React from 'react';
import { TeamOverloadAlert } from '../../types/alerts.d';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Chip,
  Box,
  CircularProgress,
  Alert as MuiAlert,
} from '@mui/material';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';

interface Props {
  overloads?: TeamOverloadAlert[];
  isLoading?: boolean;
  error?: Error | null;
}

const TeamOverloadPanel: React.FC<Props> = ({ overloads, isLoading = false, error = null }) => {
  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1} mt={2}>
        <CircularProgress size={20} />
        <Typography>Chargement des surcharges d'équipe...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <MuiAlert severity="error" sx={{ mt: 2 }}>
        Erreur lors du chargement des surcharges d'équipe : {error.message}
      </MuiAlert>
    );
  }

  if (!overloads || overloads.length === 0) {
    return <Typography>Aucune surcharge détectée.</Typography>;
  }

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Surcharge par équipe
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Equipe</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Date création</TableCell>
            <TableCell>Nb. Bordereaux</TableCell>
            <TableCell>Niveau</TableCell>
            <TableCell>Cause</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {overloads.map((o) => (
            <TableRow key={o.team.id}>
              <TableCell>{o.team.fullName}</TableCell>
              <TableCell>{o.team.email}</TableCell>
              <TableCell>
                {o.team.createdAt
                  ? new Date(o.team.createdAt).toLocaleDateString()
                  : '-'}
              </TableCell>
              <TableCell>{o.count}</TableCell>
              <TableCell>
                <Chip
                  label={alertLevelLabel(o.alert)}
                  sx={{
                    backgroundColor: alertLevelColor(o.alert),
                    color: '#fff',
                  }}
                />
              </TableCell>
              <TableCell>{o.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

export default TeamOverloadPanel;