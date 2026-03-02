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
  CircularProgress,
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { Info } from '@mui/icons-material';
import { useAlertHistory } from '../../hooks/useAlertsQuery';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';
import { useAuth } from '../../contexts/AuthContext';

const AlertHistory: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [infoDialog, setInfoDialog] = useState(false);
  const { user } = useAuth();

  const { data: history = [], isLoading } = useAlertHistory({});

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Typography variant="h6">
            Historique des Alertes
          </Typography>
          <Tooltip title="Comment fonctionne le filtre ?">
            <IconButton onClick={() => setInfoDialog(true)} color="primary" size="small">
              <Info />
            </IconButton>
          </Tooltip>
        </Box>
        
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

      {/* Info Dialog */}
      <Dialog open={infoDialog} onClose={() => setInfoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          📊 Logique de Filtrage et Calcul SLA
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            🔍 Comment fonctionne le filtre des alertes ?
          </Typography>
          
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`
┌─────────────────────────────────────────────────────────────┐
│  ÉTAPE 1: Récupération des alertes non résolues            │
│  ✓ WHERE resolved = false                                   │
│  ✓ Résultat: 2684 alertes totales                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  ÉTAPE 2: Filtrage des alertes avec bordereau              │
│  ✓ Garde uniquement les alertes liées à un bordereau       │
│  ✗ Élimine 2278 alertes sans bordereau                     │
│  ✓ Résultat: 406 alertes                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  ÉTAPE 3: Filtrage par équipe (Chef d'équipe)              │
│  ✓ WHERE contract.teamLeaderId = ${user?.id?.substring(0, 8)}...       │
│  ✗ Élimine 259 alertes d'autres équipes                    │
│  ✓ Résultat: 147 alertes                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  ÉTAPE 4: Suppression des doublons                         │
│  ✓ Garde uniquement la dernière alerte par bordereau       │
│  ✗ Élimine 81 alertes dupliquées                           │
│  ✓ Résultat final: 66 alertes uniques                      │
└─────────────────────────────────────────────────────────────┘
            `}</pre>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ color: 'error.main', mt: 3 }}>
            ⚠️ Calcul du SLA et Génération des Alertes
          </Typography>
          
          <Box sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              📐 Formule de calcul:
            </Typography>
            <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, fontFamily: 'monospace', mb: 2 }}>
              <code>
                Pourcentage écoulé = (Jours depuis réception / Délai SLA) × 100
              </code>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              🚦 Règles d'alerte:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography>🟢 <strong>Normal (≤80%):</strong> Pas d'alerte</Typography>
              <Typography>🟠 <strong>Risque (80-100%):</strong> Alerte orange - Risque de retard</Typography>
              <Typography>🔴 <strong>Critique (&gt;100%):</strong> Alerte rouge - SLA dépassé</Typography>
            </Box>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ color: 'success.main', mt: 3 }}>
            📋 Exemple de calcul:
          </Typography>
          
          <Box sx={{ bgcolor: '#e8f5e9', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Bordereau:</strong> PGH-BR-23-NUTRIMIX
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Date de réception:</strong> 21/01/2026
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Délai SLA contractuel:</strong> 30 jours
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Jours écoulés:</strong> 35 jours
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ fontFamily: 'monospace', bgcolor: 'white', p: 1, borderRadius: 1 }}>
              Calcul: (35 / 30) × 100 = <strong style={{ color: 'red' }}>116.7%</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'error.main', fontWeight: 'bold' }}>
              ➜ Résultat: 🔴 ALERTE CRITIQUE - SLA dépassé de 5 jours
            </Typography>
          </Box>

          <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              💡 Note importante:
            </Typography>
            <Typography variant="body2">
              • Les alertes sont mises à jour automatiquement toutes les 30 secondes<br/>
              • Seules les alertes non résolues sont affichées<br/>
              • Un bordereau peut avoir plusieurs alertes historiques, mais seule la plus récente est affichée<br/>
              • Le délai SLA provient du contrat client ou du paramètre par défaut (30 jours)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialog(false)} variant="contained">
            Compris
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default AlertHistory;