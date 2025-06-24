import React, { useEffect, useState } from 'react';
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
import { getPrioritiesAI } from '../../services/analyticsService';

interface Props {
  items?: any[]; // Array of bordereaux or relevant objects for AI
}

const PriorityList: React.FC<Props> = ({ items }) => {
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!items || !items.length) return;
    setLoading(true);
    getPrioritiesAI(items)
      .then(data => setPriorities(data.priorities || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [items]);

  if (loading) return <Typography>Chargement des priorités IA...</Typography>;
  if (error) return <Typography color="error">Erreur: {error}</Typography>;
  if (!priorities.length) return <Typography>Aucun bordereau prioritaire.</Typography>;

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Bordereaux prioritaires (IA)
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Score de priorité</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {priorities.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{b.id}</TableCell>
              <TableCell>{b.priority_score}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

export default PriorityList;