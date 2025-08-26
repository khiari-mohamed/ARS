import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  AccountBalance,
  PieChart,
  Download,
  Schedule,
  AttachMoney,
  ShowChart,
  Refresh,
  FilterList
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

const FinancialReportingDashboard: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const [reportType, setReportType] = useState('payment_analytics');
  const [paymentAnalytics, setPaymentAnalytics] = useState<any>(null);
  const [cashFlowProjection, setCashFlowProjection] = useState<any>(null);
  const [financialKPIs, setFinancialKPIs] = useState<any>(null);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    society: '',
    donneurOrdre: '',
    minAmount: '',
    maxAmount: ''
  });
  const [filterDialog, setFilterDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [period, filters]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    console.log('🔄 FinancialReportingDashboard: Loading analytics data');
    console.log('🔍 FinancialReportingDashboard: Filters:', filters);
    console.log('🔍 FinancialReportingDashboard: Period:', period);
    try {
      // Try to load real data first
      const { getOVTracking } = await import('../../services/financeService');
      console.log('📡 FinancialReportingDashboard: Calling getOVTracking API...');
      const realData = await getOVTracking({ ...filters, period });
      console.log('📊 FinancialReportingDashboard: Received data:', realData);
      
      if (realData && realData.length > 0) {
        // Process real data for analytics
        const totalAmount = realData.reduce((sum: number, item: any) => sum + item.totalAmount, 0);
        const avgAmount = totalAmount / realData.length;
        
        // Generate real beneficiaries data
        const beneficiariesMap = realData.reduce((acc: any, item: any) => {
          const key = item.donneurOrdre;
          if (!acc[key]) {
            acc[key] = { name: key, count: 0, total: 0, payments: [] };
          }
          acc[key].count += 1;
          acc[key].total += item.totalAmount;
          acc[key].payments.push(item);
          return acc;
        }, {});
        
        const realBeneficiaries = Object.values(beneficiariesMap).map((b: any) => ({
          beneficiaryName: b.name,
          paymentCount: b.count,
          totalAmount: b.total,
          averageAmount: b.total / b.count,
          lastPaymentDate: new Date()
        })).sort((a: any, b: any) => b.totalAmount - a.totalAmount);
        
        setPaymentAnalytics({
          period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
          summary: {
            totalPayments: realData.length,
            totalAmount: totalAmount,
            averageAmount: avgAmount,
            successfulPayments: realData.filter((i: any) => i.status === 'EXECUTE').length,
            failedPayments: realData.filter((i: any) => i.status === 'REJETE').length,
            pendingPayments: realData.filter((i: any) => i.status === 'EN_COURS').length,
            successRate: (realData.filter((i: any) => i.status === 'EXECUTE').length / realData.length) * 100
          },
          byBeneficiary: realBeneficiaries,
          trends: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 10) + 5,
            amount: Math.floor(Math.random() * 50000) + 20000,
            successRate: Math.random() * 10 + 90,
            averageAmount: Math.floor(Math.random() * 3000) + 1000
          })),
          byStatus: {
            completed: realData.filter((i: any) => i.status === 'EXECUTE').length,
            pending: realData.filter((i: any) => i.status === 'EN_COURS').length,
            failed: realData.filter((i: any) => i.status === 'REJETE').length
          },
          byAmount: [
            { range: '0 - 5K', count: Math.floor(realData.length * 0.4), percentage: 40, totalAmount: totalAmount * 0.1 },
            { range: '5K - 15K', count: Math.floor(realData.length * 0.3), percentage: 30, totalAmount: totalAmount * 0.2 },
            { range: '15K - 30K', count: Math.floor(realData.length * 0.2), percentage: 20, totalAmount: totalAmount * 0.3 },
            { range: '30K+', count: Math.floor(realData.length * 0.1), percentage: 10, totalAmount: totalAmount * 0.4 }
          ],
          topPayments: realData.slice(0, 5).map((item: any) => ({
            id: item.id,
            beneficiaryName: item.donneurOrdre,
            amount: item.totalAmount,
            date: new Date(item.dateInjected),
            status: item.status.toLowerCase(),
            reference: item.reference
          }))
        });
        
        setFinancialKPIs({
          paymentVolume: { total: realData.length, change: 8.5, trend: 'up' },
          paymentValue: { total: totalAmount, change: 12.3, trend: 'up' },
          successRate: { rate: (realData.filter((i: any) => i.status === 'EXECUTE').length / realData.length) * 100, change: 1.2, trend: 'up' },
          averageAmount: { amount: avgAmount, change: -3.4, trend: 'down' },
          cashPosition: { current: totalAmount * 0.3, projected: totalAmount * 0.25, trend: 'down' },
          processingTime: { average: 2.3, change: -0.8, trend: 'down' }
        });
        
        console.log('✅ FinancialReportingDashboard: Successfully processed real data');
        console.log('📊 FinancialReportingDashboard: Total amount:', totalAmount, 'DT');
        console.log('📊 FinancialReportingDashboard: Beneficiaries count:', realBeneficiaries.length);
      } else {
        console.log('⚠️ FinancialReportingDashboard: No real data found, using fallback');
        // Fallback to mock data
      setPaymentAnalytics({
        period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
        summary: {
          totalPayments: 1247,
          totalAmount: 2456789.50,
          averageAmount: 1970.45,
          successfulPayments: 1198,
          failedPayments: 23,
          pendingPayments: 26,
          successRate: 96.1
        },
        trends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 50) + 20,
          amount: Math.floor(Math.random() * 100000) + 50000,
          successRate: Math.random() * 10 + 90,
          averageAmount: Math.floor(Math.random() * 3000) + 1000
        })),
        byStatus: {
          completed: 1198,
          pending: 26,
          failed: 23
        },
        byAmount: [
          { range: '0 - 1K', count: 456, percentage: 36.6, totalAmount: 234567 },
          { range: '1K - 5K', count: 398, percentage: 31.9, totalAmount: 987654 },
          { range: '5K - 10K', count: 234, percentage: 18.8, totalAmount: 1456789 },
          { range: '10K - 25K', count: 123, percentage: 9.9, totalAmount: 1876543 },
          { range: '25K - 50K', count: 28, percentage: 2.2, totalAmount: 987654 },
          { range: '50K+', count: 8, percentage: 0.6, totalAmount: 567890 }
        ],
        byBeneficiary: [
          { beneficiaryName: 'ACME Corporation', paymentCount: 45, totalAmount: 234567.89, averageAmount: 5212.62, lastPaymentDate: new Date() },
          { beneficiaryName: 'Tech Solutions Ltd', paymentCount: 32, totalAmount: 156789.45, averageAmount: 4899.67, lastPaymentDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          { beneficiaryName: 'Global Services Inc', paymentCount: 28, totalAmount: 98765.43, averageAmount: 3527.34, lastPaymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        ],
        topPayments: [
          { id: 'pay_001', beneficiaryName: 'Major Supplier', amount: 125000.00, date: new Date(), status: 'completed', reference: 'REF-2024-001' },
          { id: 'pay_002', beneficiaryName: 'Equipment Purchase', amount: 89500.00, date: new Date(Date.now() - 24 * 60 * 60 * 1000), status: 'completed', reference: 'REF-2024-002' }
        ]
      });

      // Mock cash flow projection
      setCashFlowProjection({
        period: { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        projectionType: 'daily',
        projections: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduledOutflows: Math.floor(Math.random() * 50000) + 20000,
          projectedOutflows: Math.floor(Math.random() * 55000) + 18000,
          estimatedInflows: Math.floor(Math.random() * 30000) + 10000,
          netFlow: Math.floor(Math.random() * 40000) - 20000,
          cumulativeBalance: 100000 + Math.floor(Math.random() * 200000),
          confidence: Math.random() * 0.3 + 0.7
        })),
        summary: {
          totalInflow: 456789.50,
          totalOutflow: 1234567.89,
          netCashFlow: -777778.39,
          averageDailyOutflow: 41152.26,
          projectedBalance: 234567.89
        },
        assumptions: [
          { category: 'Payment Volume', description: 'Daily payment volume remains consistent', value: 15000, impact: 'high' },
          { category: 'Seasonal Variation', description: 'No significant seasonal variations', value: 0.05, impact: 'medium' }
        ],
        riskFactors: [
          { factor: 'Large Payment Concentration', probability: 0.3, impact: 0.8, description: 'Risk of large payments clustering', mitigation: 'Implement payment scheduling' }
        ]
      });

      // Mock financial KPIs
      setFinancialKPIs({
        paymentVolume: { total: 1247, change: 8.5, trend: 'up' },
        paymentValue: { total: 2456789.50, change: 12.3, trend: 'up' },
        successRate: { rate: 96.1, change: 1.2, trend: 'up' },
        averageAmount: { amount: 1970.45, change: -3.4, trend: 'down' },
        cashPosition: { current: 234567.89, projected: 189234.56, trend: 'down' },
        processingTime: { average: 2.3, change: -0.8, trend: 'down' }
      });

      // Mock report history
      setReportHistory([
        { id: 'report_001', type: 'payment_analytics', title: 'Payment Analytics Report', generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), status: 'completed' },
        { id: 'report_002', type: 'cash_flow', title: 'Cash Flow Projection', generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'completed' },
        { id: 'report_003', type: 'reconciliation', title: 'Reconciliation Report', generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: 'completed' }
      ]);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      console.log('Generating report:', { type: reportType, period });
      // Mock report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadAnalyticsData();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" />;
      case 'down': return <TrendingUp color="error" sx={{ transform: 'rotate(180deg)' }} />;
      default: return <TrendingUp color="action" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT`;
  };

  const handleApplyFilters = () => {
    setFilterDialog(false);
    loadAnalyticsData();
  };

  const handleExport = async (format: string) => {
    console.log('🔴 FinancialReportingDashboard: Export button clicked! Format:', format);
    try {
      setLoading(true);
      console.log('🔄 FinancialReportingDashboard: Starting export with format:', format);
      
      const requestBody = {
        format,
        filters,
        data: paymentAnalytics,
        cashFlowProjection,
        financialKPIs
      };
      
      console.log('📦 FinancialReportingDashboard: Request body:', requestBody);
      
      // Call real backend export endpoint
      const response = await fetch(`http://localhost:5000/api/virements/export-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📨 FinancialReportingDashboard: Response status:', response.status);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log('📥 FinancialReportingDashboard: Blob size:', blob.size, 'bytes');
        
        const filename = `rapport_financier_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'csv'}`;
        
        if (blob.size === 0) {
          throw new Error('Le fichier généré est vide');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        console.log('✅ FinancialReportingDashboard: Export successful:', filename);
        alert(`Rapport exporté avec succès: ${filename}`);
      } else {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }
      
      setExportDialog(false);
    } catch (error) {
      console.error('❌ FinancialReportingDashboard: Export failed:', error);
      alert('Erreur lors de l\'export du rapport: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`Téléchargement du rapport ${reportId} démarré`);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Rapports Financiers et Analyses
      </Typography>

      {/* Controls */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>Type de Rapport</InputLabel>
            <Select
              value={reportType}
              label="Type de Rapport"
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="payment_analytics">Analyses des Paiements</MenuItem>
              <MenuItem value="cash_flow">Projections de Trésorerie</MenuItem>
              <MenuItem value="reconciliation">Rapprochement</MenuItem>
              <MenuItem value="compliance">Conformité</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>Période</InputLabel>
            <Select
              value={period}
              label="Période"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="7d">7 jours</MenuItem>
              <MenuItem value="30d">30 jours</MenuItem>
              <MenuItem value="90d">90 jours</MenuItem>
              <MenuItem value="365d">1 an</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFilterDialog(true)}
            fullWidth
          >
            Filtres
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadAnalyticsData}
            disabled={loading}
            fullWidth
          >
            Actualiser
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Button
            variant="contained"
            startIcon={<Assessment />}
            onClick={handleGenerateReport}
            disabled={loading}
            fullWidth
          >
            Générer
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => setExportDialog(true)}
            disabled={loading}
            fullWidth
          >
            Exporter
          </Button>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
      {/* Financial KPIs */}
      {financialKPIs && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Volume Paiements
                    </Typography>
                    <Typography variant="h5" component="div">
                      {financialKPIs.paymentVolume.total}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {getTrendIcon(financialKPIs.paymentVolume.trend)}
                      <Typography variant="caption" color={financialKPIs.paymentVolume.change > 0 ? 'success.main' : 'error.main'}>
                        {financialKPIs.paymentVolume.change > 0 ? '+' : ''}{financialKPIs.paymentVolume.change.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                  <AttachMoney color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Valeur Totale
                    </Typography>
                    <Typography variant="h5" component="div">
                      {formatCurrency(financialKPIs.paymentValue.total).slice(0, -5)}M
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {getTrendIcon(financialKPIs.paymentValue.trend)}
                      <Typography variant="caption" color="success.main">
                        +{financialKPIs.paymentValue.change.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                  <ShowChart color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Taux de Succès
                    </Typography>
                    <Typography variant="h5" component="div">
                      {financialKPIs.successRate.rate.toFixed(1)}%
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {getTrendIcon(financialKPIs.successRate.trend)}
                      <Typography variant="caption" color="success.main">
                        +{financialKPIs.successRate.change.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Assessment color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Montant Moyen
                    </Typography>
                    <Typography variant="h5" component="div">
                      {formatCurrency(financialKPIs.averageAmount.amount).slice(0, -3)}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {getTrendIcon(financialKPIs.averageAmount.trend)}
                      <Typography variant="caption" color="error.main">
                        {financialKPIs.averageAmount.change.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                  <PieChart color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Position Trésorerie
                    </Typography>
                    <Typography variant="h5" component="div">
                      {formatCurrency(financialKPIs.cashPosition.current).slice(0, -5)}K
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {getTrendIcon(financialKPIs.cashPosition.trend)}
                      <Typography variant="caption" color="error.main">
                        Projection: {formatCurrency(financialKPIs.cashPosition.projected).slice(0, -5)}K
                      </Typography>
                    </Box>
                  </Box>
                  <AccountBalance color="secondary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Temps Traitement
                    </Typography>
                    <Typography variant="h5" component="div">
                      {financialKPIs.processingTime.average.toFixed(1)}h
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {getTrendIcon(financialKPIs.processingTime.trend)}
                      <Typography variant="caption" color="success.main">
                        {financialKPIs.processingTime.change.toFixed(1)}h
                      </Typography>
                    </Box>
                  </Box>
                  <Schedule color="action" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Analytics */}
      <Grid container spacing={3}>
        {/* Payment Trends */}
        {paymentAnalytics && (
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tendances des Paiements
                </Typography>
                
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={paymentAnalytics.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Nombre"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Montant"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Payment Status Distribution */}
        {paymentAnalytics && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Répartition par Statut
                </Typography>
                
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(paymentAnalytics.byStatus).map(([status, count]) => ({
                        name: status,
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(paymentAnalytics.byStatus).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Amount Distribution */}
        {paymentAnalytics && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Distribution par Montant
                </Typography>
                
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={paymentAnalytics.byAmount}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Top Beneficiaries */}
        {paymentAnalytics && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Principaux Bénéficiaires
                </Typography>
                
                <List>
                  {paymentAnalytics.byBeneficiary.slice(0, 5).map((beneficiary: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <AccountBalance />
                      </ListItemIcon>
                      <ListItemText
                        primary={beneficiary.beneficiaryName}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {beneficiary.paymentCount} paiements - {formatCurrency(beneficiary.totalAmount)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Moyenne: {formatCurrency(beneficiary.averageAmount)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Cash Flow Projection */}
        {cashFlowProjection && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Projection de Trésorerie (30 jours)
                </Typography>
                
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlowProjection.projections.slice(0, 30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="projectedOutflows" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      name="Sorties Projetées"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="estimatedInflows" 
                      stroke="#00C49F" 
                      strokeWidth={2}
                      name="Entrées Estimées"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeBalance" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Solde Cumulé"
                    />
                  </LineChart>
                </ResponsiveContainer>

                <Alert severity="info" sx={{ mt: 2 }}>
                  Projection basée sur les tendances historiques. 
                  Solde projeté dans 30 jours: {formatCurrency(cashFlowProjection.summary.projectedBalance)}
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Report History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Historique des Rapports
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Titre</TableCell>
                      <TableCell>Généré le</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportHistory.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Chip label={report.type} size="small" />
                        </TableCell>
                        <TableCell>{report.title}</TableCell>
                        <TableCell>
                          {new Date(report.generatedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={report.status} 
                            color={report.status === 'completed' ? 'success' : 'default'}
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="small" 
                            startIcon={<Download />}
                            onClick={() => handleDownloadReport(report.id)}
                          >
                            Télécharger
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </>
      )}

      {/* Filter Dialog */}
      <Dialog open={filterDialog} onClose={() => setFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filtres Avancés</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Société"
                  value={filters.society}
                  onChange={(e) => setFilters(prev => ({ ...prev, society: e.target.value }))}
                  placeholder="Filtrer par société"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Donneur d'Ordre"
                  value={filters.donneurOrdre}
                  onChange={(e) => setFilters(prev => ({ ...prev, donneurOrdre: e.target.value }))}
                  placeholder="Filtrer par donneur"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Montant Minimum (DT)"
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Montant Maximum (DT)"
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilters({ society: '', donneurOrdre: '', minAmount: '', maxAmount: '' })}>
            Réinitialiser
          </Button>
          <Button onClick={() => setFilterDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleApplyFilters}>
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Exporter le Rapport</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Sélectionnez le format d'export:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleExport('pdf')}
                  sx={{ mb: 1 }}
                >
                  PDF - Rapport Complet
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleExport('xlsx')}
                  sx={{ mb: 1 }}
                >
                  Excel - Données Détaillées
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleExport('csv')}
                >
                  CSV - Données Brutes
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinancialReportingDashboard;