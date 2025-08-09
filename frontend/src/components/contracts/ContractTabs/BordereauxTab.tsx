import React, { useEffect, useState } from 'react';
import { 
  Table, TableHead, TableRow, TableCell, TableBody, Typography, 
  Alert, Skeleton, Chip, Paper, Box
} from '@mui/material';

interface Bordereau {
  id: string;
  reference: string;
  dateReception: string;
  statut: string;
  nombreBS: number;
  delaiReglement?: number;
}

interface Props {
  contractId: string;
}

const ContractBordereauxTab: React.FC<Props> = ({ contractId }) => {
  const [bordereaux, setBordereaux] = useState<Bordereau[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBordereaux = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock data - replace with actual API call
      const mockData: Bordereau[] = [
        {
          id: '1',
          reference: 'BDX/2025/001',
          dateReception: '2025-01-15',
          statut: 'EN_COURS',
          nombreBS: 25,
          delaiReglement: 3
        }
      ];
      setBordereaux(mockData);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBordereaux();
  }, [contractId]);

  const getSLAStatus = (delai?: number) => {
    if (!delai) return { label: 'N/A', color: 'default' };
    if (delai <= 2) return { label: 'À temps', color: 'success' };
    if (delai <= 5) return { label: 'Attention', color: 'warning' };
    return { label: 'En retard', color: 'error' };
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Bordereaux Associés ({bordereaux.length})
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Skeleton variant="rectangular" height={200} />
      ) : bordereaux.length === 0 ? (
        <Typography color="textSecondary">Aucun bordereau trouvé.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Référence</TableCell>
              <TableCell>Date Réception</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Nombre BS</TableCell>
              <TableCell>SLA</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bordereaux.map(b => {
              const sla = getSLAStatus(b.delaiReglement);
              return (
                <TableRow key={b.id}>
                  <TableCell>{b.reference}</TableCell>
                  <TableCell>{new Date(b.dateReception).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={b.statut} size="small" />
                  </TableCell>
                  <TableCell>{b.nombreBS}</TableCell>
                  <TableCell>
                    <Chip label={sla.label} color={sla.color as any} size="small" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default ContractBordereauxTab;