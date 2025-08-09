import React, { useEffect, useState } from 'react';
import { 
  Table, TableHead, TableRow, TableCell, TableBody, Typography, 
  Alert, Skeleton, Chip, Paper, LinearProgress, Box
} from '@mui/material';

interface Claim {
  id: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
  dueDate?: string;
}

interface Props {
  contractId: string;
}

const ContractClaimsTab: React.FC<Props> = ({ contractId }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock data - replace with actual API call
      const mockData: Claim[] = [
        {
          id: '1',
          type: 'Délai de traitement',
          severity: 'medium',
          status: 'open',
          description: 'Retard dans le traitement du dossier',
          createdAt: '2025-01-10',
          dueDate: '2025-01-20'
        }
      ];
      setClaims(mockData);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [contractId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'warning';
      case 'closed': return 'success';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getSLACountdown = (dueDate?: string) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Expiré', color: 'error', progress: 100 };
    if (diffDays <= 1) return { label: `${diffDays}j restant`, color: 'warning', progress: 80 };
    return { label: `${diffDays}j restants`, color: 'success', progress: Math.max(0, (7 - diffDays) / 7 * 100) };
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Réclamations Associées ({claims.length})
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Skeleton variant="rectangular" height={200} />
      ) : claims.length === 0 ? (
        <Typography color="textSecondary">Aucune réclamation trouvée.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Sévérité</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Date Création</TableCell>
              <TableCell>SLA</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {claims.map(claim => {
              const slaCountdown = getSLACountdown(claim.dueDate);
              return (
                <TableRow key={claim.id}>
                  <TableCell>{claim.type}</TableCell>
                  <TableCell>
                    <Chip 
                      label={claim.severity} 
                      color={getSeverityColor(claim.severity) as any} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={claim.status} 
                      color={getStatusColor(claim.status) as any} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{claim.description}</TableCell>
                  <TableCell>{new Date(claim.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {slaCountdown ? (
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="caption" color={`${slaCountdown.color}.main`}>
                          {slaCountdown.label}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={slaCountdown.progress} 
                          color={slaCountdown.color as any}
                          sx={{ mt: 0.5, height: 4 }}
                        />
                      </Box>
                    ) : (
                      <Typography variant="caption" color="textSecondary">N/A</Typography>
                    )}
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

export default ContractClaimsTab;