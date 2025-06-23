import React from 'react';
import { PriorityBordereau } from '../../types/alerts.d';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Chip,
  Link,
  IconButton,
  Tooltip,
} from '@mui/material';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface Props {
  priorityList?: PriorityBordereau[];
}

const PriorityList: React.FC<Props> = ({ priorityList }) => {
  if (!priorityList || priorityList.length === 0) {
    return <Typography>Aucun bordereau prioritaire.</Typography>;
  }

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Bordereaux prioritaires
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Date réception</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Equipe</TableCell>
            <TableCell>Niveau</TableCell>
            <TableCell>Raison</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {priorityList.map((b) => (
            <TableRow key={b.bordereau.id}>
              <TableCell>
                <Link
                  href={`/bordereaux/${b.bordereau.id}`}
                  target="_blank"
                  rel="noopener"
                  underline="hover"
                >
                  {b.bordereau.id}
                </Link>
              </TableCell>
              <TableCell>
                {b.bordereau.dateReception
                  ? new Date(b.bordereau.dateReception).toLocaleDateString()
                  : '-'}
              </TableCell>
              <TableCell>{b.bordereau.statut}</TableCell>
              <TableCell>
                {/* If you have team name, display it, else fallback to teamId */}
                {b.bordereau.teamName || b.bordereau.teamId || '-'}
              </TableCell>
              <TableCell>
                <Chip
                  label={alertLevelLabel(b.alertLevel)}
                  sx={{
                    backgroundColor: alertLevelColor(b.alertLevel),
                    color: '#fff',
                  }}
                />
              </TableCell>
              <TableCell>{b.reason}</TableCell>
              <TableCell>
                <Tooltip title="Voir le bordereau">
                  <IconButton
                    component="a"
                    href={`/bordereaux/${b.bordereau.id}`}
                    target="_blank"
                    rel="noopener"
                    size="small"
                  >
                    <OpenInNewIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

export default PriorityList;