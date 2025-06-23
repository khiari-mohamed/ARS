import React, { useEffect, useState } from 'react';
import { fetchClientAnalytics } from '../../../services/clientService';
import { Paper, Grid, Typography, Alert, Skeleton, Chip, Button, Stack } from '@mui/material';
import { getSLAColor } from '../../../utils/slaColor';
// You need to create this utility file if not present
import { exportToExcel, exportToPDF } from '../../../utils/export';

interface Props {
  clientId: string;
  reglementDelay?: number; // Optionally passed from parent if not in kpi
}

const KPITab: React.FC<Props> = ({ clientId, reglementDelay }) => {
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKpi = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClientAnalytics(clientId);
      setKpi(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpi();
    // eslint-disable-next-line
  }, [clientId]);

  // Determine reglementDelay: prefer from kpi, fallback to prop
  const regDelay = kpi?.reglementDelay ?? reglementDelay;

  let slaColor: 'green' | 'orange' | 'red' = 'green';
  if (kpi?.avgSLA !== undefined && regDelay !== undefined) {
    slaColor = getSLAColor(kpi.avgSLA, regDelay);
  }

  // Export handlers
  const handleExportExcel = () => {
    if (!kpi) return;
    exportToExcel([{
      bordereauxCount: kpi.bordereauxCount,
      reclamationsCount: kpi.reclamationsCount,
      avgSLA: kpi.avgSLA,
      reglementDelay: regDelay
    }], 'client_kpi');
  };

  const handleExportPDF = () => {
    if (!kpi) return;
    exportToPDF(
      ['bordereauxCount', 'reclamationsCount', 'avgSLA', 'reglementDelay'],
      [{
        bordereauxCount: kpi.bordereauxCount,
        reclamationsCount: kpi.reclamationsCount,
        avgSLA: kpi.avgSLA,
        reglementDelay: regDelay
      }],
      'client_kpi'
    );
  };

  // Real AI recommendation
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  useEffect(() => {
    const fetchAI = async () => {
      if (!clientId) return;
      try {
        const res = await import('../../../services/clientService').then(m => m.fetchClientAIRecommendations(clientId));
        setAiRecommendation(res.recommendation);
      } catch {
        setAiRecommendation(null);
      }
    };
    fetchAI();
  }, [clientId]);

  return (
    <Paper sx={{ padding: 2 }}>
      <Typography variant="h6">Client KPIs</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={handleExportExcel} disabled={!kpi}>Export Excel</Button>
        <Button variant="outlined" onClick={handleExportPDF} disabled={!kpi}>Export PDF</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Skeleton variant="rectangular" height={60} />
      ) : !kpi ? (
        <Typography>No KPI data found.</Typography>
      ) : (
        <Grid container spacing={2}>
          <Grid item>
            <Typography><strong>Bordereaux Count:</strong> {kpi?.bordereauxCount ?? '-'}</Typography>
          </Grid>
          <Grid item>
            <Typography><strong>Reclamations Count:</strong> {kpi?.reclamationsCount ?? '-'}</Typography>
          </Grid>
          <Grid item>
            <Typography>
              <strong>Average SLA (days):</strong> {kpi?.avgSLA ?? '-'}{' '}
              <Chip
                label={slaColor.toUpperCase()}
                sx={{
                  backgroundColor:
                    slaColor === 'green'
                      ? '#4caf50'
                      : slaColor === 'orange'
                      ? '#ff9800'
                      : '#f44336',
                  color: '#fff',
                  ml: 1,
                }}
              />
            </Typography>
            {slaColor === 'red' && (
              <Alert severity="error" sx={{ mt: 1 }}>
                SLA breach detected! Average SLA exceeds contractual delay.
              </Alert>
            )}
            {slaColor === 'orange' && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                SLA at risk. Average SLA is approaching contractual delay.
              </Alert>
            )}
          </Grid>
          {aiRecommendation && (
            <Grid item xs={12}>
              <Alert severity={aiRecommendation.startsWith('⚠️') ? 'warning' : 'success'} sx={{ mt: 2 }}>
                {aiRecommendation}
              </Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Paper>
  );
};

export default KPITab;