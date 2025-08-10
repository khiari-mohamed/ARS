import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  Error,
  TrendingUp,
  TrendingDown,
  Settings,
  Lightbulb,
  Assessment
} from '@mui/icons-material';
import { fetchClientRiskAssessment, updateClientRiskThresholds } from '../../services/clientService';

interface Props {
  clientId: string;
}

const riskLevelConfig = {
  low: { color: 'success', icon: <CheckCircle />, label: 'Low Risk' },
  medium: { color: 'warning', icon: <Warning />, label: 'Medium Risk' },
  high: { color: 'error', icon: <Error />, label: 'High Risk' },
  critical: { color: 'error', icon: <Error />, label: 'Critical Risk' }
};

const ClientRiskAssessment: React.FC<Props> = ({ clientId }) => {
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [thresholdsDialogOpen, setThresholdsDialogOpen] = useState(false);
  const [thresholds, setThresholds] = useState({
    slaBreachThreshold: 70,
    complaintVolumeThreshold: 5,
    delayRateThreshold: 20,
    volumeOverloadThreshold: 50
  });

  useEffect(() => {
    loadRiskAssessment();
  }, [clientId]);

  const loadRiskAssessment = async () => {
    setLoading(true);
    try {
      const data = await fetchClientRiskAssessment(clientId);
      setAssessment(data);
    } catch (error) {
      console.error('Failed to load risk assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateThresholds = async () => {
    try {
      await updateClientRiskThresholds(clientId, thresholds);
      setThresholdsDialogOpen(false);
      loadRiskAssessment(); // Reload to see updated assessment
    } catch (error) {
      console.error('Failed to update thresholds:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (!assessment) {
    return (
      <Typography variant="h6" color="text.secondary" align="center">
        No risk assessment data available
      </Typography>
    );
  }

  const { riskScore, riskLevel, riskFactors, recommendations } = assessment;
  const config = riskLevelConfig[riskLevel as keyof typeof riskLevelConfig];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          Risk Assessment
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Settings />}
          onClick={() => setThresholdsDialogOpen(true)}
          size="small"
        >
          Configure Thresholds
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Risk Score Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                {config.icon}
                <Typography variant="h4" ml={1} fontWeight={600}>
                  {riskScore}
                </Typography>
              </Box>
              <Typography variant="h6" gutterBottom>
                Risk Score
              </Typography>
              <Chip
                label={config.label}
                color={config.color as any}
                sx={{ mb: 2 }}
              />
              <LinearProgress
                variant="determinate"
                value={Math.min(riskScore, 100)}
                color={config.color as any}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Score out of 100
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Factors */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Risk Factors
            </Typography>
            {riskFactors.length > 0 ? (
              <List>
                {riskFactors.map((factor: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Warning color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={factor} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="success">
                No significant risk factors identified
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recommendations
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {recommendations.map((recommendation: string, index: number) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2">
                        {recommendation}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Risk Level Breakdown */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Risk Level Guidelines
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" color="success.main">
                      Low (0-24)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Minimal risk, continue monitoring
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Warning color="warning" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" color="warning.main">
                      Medium (25-49)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Moderate risk, implement preventive measures
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Error color="error" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" color="error.main">
                      High (50-69)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      High risk, immediate action required
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Error color="error" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" color="error.main">
                      Critical (70+)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Critical risk, escalate immediately
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Thresholds Configuration Dialog */}
      <Dialog open={thresholdsDialogOpen} onClose={() => setThresholdsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Risk Thresholds</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="SLA Breach Threshold (%)"
                type="number"
                value={thresholds.slaBreachThreshold}
                onChange={(e) => setThresholds(prev => ({ 
                  ...prev, 
                  slaBreachThreshold: parseInt(e.target.value) 
                }))}
                helperText="Percentage of SLA breaches that triggers risk"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Complaint Volume Threshold"
                type="number"
                value={thresholds.complaintVolumeThreshold}
                onChange={(e) => setThresholds(prev => ({ 
                  ...prev, 
                  complaintVolumeThreshold: parseInt(e.target.value) 
                }))}
                helperText="Number of complaints per month that triggers risk"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Delay Rate Threshold (%)"
                type="number"
                value={thresholds.delayRateThreshold}
                onChange={(e) => setThresholds(prev => ({ 
                  ...prev, 
                  delayRateThreshold: parseInt(e.target.value) 
                }))}
                helperText="Percentage of delayed processing that triggers risk"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Volume Overload Threshold"
                type="number"
                value={thresholds.volumeOverloadThreshold}
                onChange={(e) => setThresholds(prev => ({ 
                  ...prev, 
                  volumeOverloadThreshold: parseInt(e.target.value) 
                }))}
                helperText="Number of active bordereaux that triggers overload risk"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThresholdsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateThresholds}>
            Update Thresholds
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientRiskAssessment;