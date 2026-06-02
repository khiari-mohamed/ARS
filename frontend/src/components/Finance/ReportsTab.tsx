import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Stack, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Checkbox, Alert, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import RefreshIcon from '@mui/icons-material/Refresh';

// ─── Shared table cell styles (mirrors dashboard design) ──────────────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.8,
  px: 1.5,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

// ─── Custom Tooltip for charts ─────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{
        bgcolor: '#1e3a5f',
        color: '#fff',
        px: 1.5, py: 1,
        borderRadius: 1.5,
        boxShadow: '0 4px 16px rgba(30,58,95,0.25)',
        fontSize: '0.78rem',
        minWidth: 120,
      }}>
        {label && <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#90caf9', fontWeight: 700 }}>{label}</Typography>}
        {payload.map((p: any, i: number) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.3 }}>
            <span style={{ color: p.color || '#90caf9' }}>{p.name}</span>
            <strong>{typeof p.value === 'number' && p.name === 'Montant' ? p.value.toLocaleString('fr-TN') + ' TND' : p.value}{p.unit || ''}</strong>
          </Box>
        ))}
      </Box>
    );
  }
  return null;
};

// ─── Status badge helper ───────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  EXECUTE:             { label: 'Exécuté',       bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  EN_COURS_EXECUTION:  { label: 'En cours',      bg: '#e3f2fd', color: '#0d47a1', border: '#90caf9' },
  REJETE:              { label: 'Rejeté',        bg: '#fdecea', color: '#b71c1c', border: '#ef9a9a' },
  NON_EXECUTE:         { label: 'Non exécuté',   bg: '#fff8e1', color: '#e65100', border: '#ffcc80' },
};
function getStatusStyle(status: string) {
  return STATUS_MAP[status] ?? { label: status, bg: '#f5f5f5', color: '#546e7a', border: '#cfd8dc' };
}

// ─── Component ────────────────────────────────────────────────────────────────
const ReportsTab: React.FC = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    society: '',
    donneurOrdre: ''
  });
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [customReportDialog, setCustomReportDialog] = useState(false);
  const [customReportOptions, setCustomReportOptions] = useState({
    includeCharts: true,
    includeDetails: true,
    includeSLA: true,
    includeExceptions: true,
    format: 'pdf'
  });
  const [statusData, setStatusData] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    loadReportData();
  }, [filters]);

  const loadReportData = async () => {
    setLoading(true);
    console.log('🔄 ReportsTab: Loading report data with filters:', filters);
    try {
      const queryParams = new URLSearchParams();
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.society) queryParams.append('societe', filters.society);
      if (filters.donneurOrdre) queryParams.append('donneurOrdre', filters.donneurOrdre);

      const [ordresVirement, suiviVirements, clients] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/suivi-virement/list?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/clients`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()).catch(() => [])
      ]);

      let filteredData = ordresVirement;
      if (filters.dateFrom || filters.dateTo) {
        filteredData = filteredData.filter((item: any) => {
          const itemDate = new Date(item.dateCreation);
          const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
          const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
          if (fromDate && itemDate < fromDate) return false;
          if (toDate && itemDate > toDate) return false;
          return true;
        });
      }

      if (filters.society) {
        filteredData = filteredData.filter((item: any) =>
          item.donneurOrdre?.nom?.toLowerCase().includes(filters.society.toLowerCase())
        );
      }

      if (filters.donneurOrdre) {
        filteredData = filteredData.filter((item: any) =>
          item.donneurOrdre?.nom?.toLowerCase().includes(filters.donneurOrdre.toLowerCase())
        );
      }

      console.log('📊 ReportsTab: Loaded data:', {
        ordresVirement: ordresVirement.length,
        suiviVirements: suiviVirements.length,
        clients: clients.length
      });

      const realData = filteredData;
      if (realData && realData.length > 0) {
        const statusCounts = realData.reduce((acc: any, item: any) => {
          acc[item.etatVirement] = (acc[item.etatVirement] || 0) + 1;
          return acc;
        }, {});

        const total = realData.length;
        const realStatusData = [
          { name: 'Exécuté',     value: Math.round((statusCounts['EXECUTE'] || 0) / total * 100),            color: '#4caf50', count: statusCounts['EXECUTE'] || 0 },
          { name: 'En Cours',    value: Math.round((statusCounts['EN_COURS_EXECUTION'] || 0) / total * 100), color: '#2196f3', count: statusCounts['EN_COURS_EXECUTION'] || 0 },
          { name: 'Rejeté',      value: Math.round((statusCounts['REJETE'] || 0) / total * 100),             color: '#f44336', count: statusCounts['REJETE'] || 0 },
          { name: 'Non Exécuté', value: Math.round((statusCounts['NON_EXECUTE'] || 0) / total * 100),        color: '#ff9800', count: statusCounts['NON_EXECUTE'] || 0 }
        ];

        setStatusData(realStatusData);

        const donneurGroups = realData.reduce((acc: any, item: any) => {
          const key = item.donneurOrdre?.nom || 'Unknown';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});

        const realSlaData = Object.keys(donneurGroups).slice(0, 5).map(society => {
          const items = donneurGroups[society];
          const executed = items.filter((i: any) => i.etatVirement === 'EXECUTE').length;
          const inProgress = items.filter((i: any) => i.etatVirement === 'EN_COURS_EXECUTION').length;
          const failed = items.filter((i: any) => i.etatVirement === 'REJETE').length;
          const total = items.length;
          return {
            society,
            onTime:  Math.round(executed / total * 100),
            atRisk:  Math.round(inProgress / total * 100),
            overdue: Math.round(failed / total * 100)
          };
        });

        setSlaData(realSlaData);

        const trendDays = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dayData = realData.filter((item: any) =>
            new Date(item.dateCreation).toDateString() === date.toDateString()
          );
          trendDays.push({
            date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
            total:    dayData.length,
            executed: dayData.filter((i: any) => i.etatVirement === 'EXECUTE').length,
            amount:   dayData.reduce((sum: number, i: any) => sum + (i.montantTotal || 0), 0)
          });
        }

        setTrendData(trendDays);
        setReportData(realData);
        console.log('✅ ReportsTab: Successfully processed real data');
      } else {
        console.log('⚠️ ReportsTab: No real data found');
        setStatusData([]);
        setSlaData([]);
        setTrendData([]);
        setReportData(null);
      }
    } catch (error) {
      console.error('❌ ReportsTab: Failed to load report data:', error);
      setStatusData([]);
      setSlaData([]);
      setTrendData([]);
      setReportData(null);
    } finally {
      setLoading(false);
      console.log('🏁 ReportsTab: Data loading completed');
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setLoading(true);
      console.log('🔄 ReportsTab: Starting export with format:', format);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/suivi-virement/export-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ format, filters, data: reportData, statusData, slaData, trendData })
      });

      if (response.ok) {
        const blob = await response.blob();
        const filename = `rapport_financier_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('✅ ReportsTab: Export successful:', filename);
        alert(`Rapport généré avec succès: ${filename}`);
      } else {
        throw new Error(`Export failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ ReportsTab: Export failed:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomReport = async () => {
    try {
      setLoading(true);
      console.log('🔄 ReportsTab: Starting custom report generation');

      const customData = {
        format: customReportOptions.format,
        filters,
        data: reportData,
        statusData:  customReportOptions.includeCharts ? statusData : [],
        slaData:     customReportOptions.includeSLA    ? slaData    : [],
        trendData:   customReportOptions.includeCharts ? trendData  : [],
        includeDetails:    customReportOptions.includeDetails,
        includeExceptions: customReportOptions.includeExceptions,
        generatedAt: new Date().toISOString()
      };

      console.log('📦 ReportsTab: Custom report data:', customData);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/suivi-virement/export-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(customData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const filename = `rapport_personnalise_${new Date().toISOString().split('T')[0]}.${customReportOptions.format === 'pdf' ? 'pdf' : 'csv'}`;

        if (blob.size === 0) throw new Error('Le fichier généré est vide');

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);

        console.log('✅ ReportsTab: Custom report generated successfully:', filename);
        alert(`Rapport personnalisé généré avec succès: ${filename}`);
      } else {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }

      setCustomReportDialog(false);
    } catch (error) {
      console.error('❌ ReportsTab: Custom report failed:', error);
      alert('Erreur lors de la génération du rapport personnalisé: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>

      {/* ── Page Header ── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e3a5f', letterSpacing: -0.5 }}>
            Historique &amp; Archives des Virements
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Rapports, statistiques et exports des ordres de virement
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadReportData}
          disabled={loading}
          variant="contained"
          size="small"
          sx={{ fontWeight: 600 }}
        >
          Actualiser
        </Button>
      </Box>

      {/* ── Filter Panel ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 3,
          bgcolor: '#f0f4ff',
          border: '1px solid #d0dff5',
          borderRadius: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          🔍 Filtres Avancés — Société / Date / Donneur / Utilisateur
        </Typography>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Date Début"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Date Fin"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Société"
              value={filters.society}
              onChange={(e) => setFilters({ ...filters, society: e.target.value })}
              size="small"
              fullWidth
              placeholder="Filtrer par société"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Donneur d'Ordre"
              value={filters.donneurOrdre}
              onChange={(e) => setFilters({ ...filters, donneurOrdre: e.target.value })}
              size="small"
              fullWidth
              placeholder="Filtrer par donneur"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Utilisateur"
              size="small"
              fullWidth
              placeholder="Filtrer par utilisateur"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              onClick={() => setFilters({ dateFrom: '', dateTo: '', society: '', donneurOrdre: '' })}
              size="small"
              fullWidth
              sx={{ height: 40 }}
            >
              Réinitialiser
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
          <CircularProgress sx={{ color: '#1e3a5f' }} />
          <Typography variant="body1" sx={{ ml: 2, color: '#546e7a' }}>Chargement des données...</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>

          {/* ── Pie Chart — Répartition par Statut ── */}
          <Grid item xs={12} md={5}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent>
                <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Répartition par Statut
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distribution des ordres de virement
                  </Typography>
                </Box>

                {statusData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240, color: '#90a4ae' }}>
                    <Typography variant="body2">Aucune donnée disponible</Typography>
                  </Box>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} formatter={(value: any, name: any) => [`${value}%`, name]} />
                      </PieChart>
                    </ResponsiveContainer>

                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                      {statusData.map((item, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            px: 1.5, py: 0.8,
                            borderRadius: 1.5,
                            bgcolor: `${item.color}12`,
                            border: `1px solid ${item.color}30`,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, bgcolor: item.color, borderRadius: '50%', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#37474f' }}>{item.name}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: '#78909c' }}>{item.count || 0} ord.</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: item.color, minWidth: 36, textAlign: 'right' }}>
                              {item.value}%
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Bar Chart — Conformité SLA ── */}
          <Grid item xs={12} md={7}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent>
                <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Conformité SLA par Société
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Analyse des délais d'exécution par donneur d'ordre
                  </Typography>
                </Box>

                {slaData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#90a4ae' }}>
                    <Typography variant="body2">Aucune donnée disponible</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={slaData} barSize={16} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" vertical={false} />
                      <XAxis
                        dataKey="society"
                        tick={{ fontSize: 11, fill: '#546e7a' }}
                        axisLine={{ stroke: '#e0e7ef' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: '#546e7a' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<ChartTooltip />} formatter={(value: any) => [`${value}%`]} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }}
                      />
                      <Bar dataKey="onTime"  fill="#4caf50" name="À temps"   radius={[3, 3, 0, 0]} />
                      <Bar dataKey="atRisk"  fill="#ff9800" name="À risque"  radius={[3, 3, 0, 0]} />
                      <Bar dataKey="overdue" fill="#f44336" name="En retard" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Line Chart — Évolution 7 jours ── */}
          <Grid item xs={12}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Évolution des Virements — 7 derniers jours
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Volume quotidien et montants traités
                  </Typography>
                </Box>

                {trendData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 260, color: '#90a4ae' }}>
                    <Typography variant="body2">Aucune donnée disponible</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#2196f3" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#546e7a' }}
                        axisLine={{ stroke: '#e0e7ef' }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: '#546e7a' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: '#ff9800' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} formatter={(value: any, name: any) => {
                        if (name === 'Montant') return [`${Number(value).toLocaleString('fr-TN')} TND`, name];
                        return [value, name];
                      }} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="total"
                        stroke="#2196f3"
                        strokeWidth={2.5}
                        name="Total"
                        dot={{ r: 4, fill: '#2196f3', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="executed"
                        stroke="#4caf50"
                        strokeWidth={2.5}
                        name="Exécutés"
                        dot={{ r: 4, fill: '#4caf50', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="amount"
                        stroke="#ff9800"
                        strokeWidth={2.5}
                        strokeDasharray="5 3"
                        name="Montant"
                        dot={{ r: 4, fill: '#ff9800', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── OV Records Table ── */}
          <Grid item xs={12}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  pb={1.5}
                  mb={2}
                  sx={{ borderBottom: '2px solid #e8edf5' }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                      📋 Liste des Ordres de Virement
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reportData ? `${Array.isArray(reportData) ? reportData.length : 0} enregistrement(s)` : 'Aucune donnée'}
                    </Typography>
                  </Box>
                </Box>

                {reportData && reportData.length > 0 ? (
                  <TableContainer
                    sx={{
                      borderRadius: 1.5,
                      border: '1px solid #dde3ef',
                      overflow: 'auto',
                      '&::-webkit-scrollbar': { height: 6, width: 6 },
                      '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
                      '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
                    }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={HEAD_CELL_SX}>Référence</TableCell>
                          <TableCell sx={HEAD_CELL_SX}>Client</TableCell>
                          <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Montant</TableCell>
                          <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut</TableCell>
                          <TableCell sx={HEAD_CELL_SX}>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.map((ov: any, index: number) => {
                          const st = getStatusStyle(ov.etatVirement);
                          return (
                            <TableRow
                              key={index}
                              sx={{
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                                '&:hover': { backgroundColor: '#e8f0fe' },
                                '&:last-child td': { borderBottom: 0 },
                              }}
                            >
                              <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                {ov.reference}
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontWeight: 600 }}>
                                {ov.bordereau?.client?.name || 'Entrée manuelle'}
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1b5e20' }}>
                                {ov.montantTotal?.toLocaleString('fr-TN')}{' '}
                                <span style={{ fontSize: '0.72rem', color: '#78909c' }}>TND</span>
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                                <Box
                                  sx={{
                                    display: 'inline-flex', alignItems: 'center',
                                    px: 1, py: 0.3, borderRadius: 1,
                                    fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap',
                                    backgroundColor: st.bg,
                                    color: st.color,
                                    border: `1px solid ${st.border}`,
                                  }}
                                >
                                  {st.label}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                                {new Date(ov.dateCreation).toLocaleDateString('fr-FR')}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box
                    sx={{
                      p: 5, textAlign: 'center',
                      bgcolor: '#f8faff', borderRadius: 2,
                      border: '1px dashed #c5d4e8',
                    }}
                  >
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Aucun ordre de virement trouvé
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Modifiez les filtres pour afficher les données
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Export Cards ── */}
          <Grid item xs={12}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box pb={1.5} mb={2.5} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    📈 Statistiques d'Export
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                    Revoir un ancien ordre de virement, télécharger à nouveau les fichiers, filtrer par société, date, donneur, etc.
                  </Typography>
                </Box>

                <Grid container spacing={2.5}>
                  {/* PDF */}
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid #ef9a9a',
                        borderLeft: '4px solid #f44336',
                        bgcolor: '#fff5f5',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(244,67,54,0.12)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 44, height: 44, borderRadius: '50%',
                          bgcolor: '#fdecea', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <PictureAsPdfIcon sx={{ color: '#f44336' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>Rapport PDF</Typography>
                          <Typography variant="caption" color="text.secondary">Rapport complet avec graphiques</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Générer un rapport complet avec tous les traitements enregistrés
                      </Typography>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => handleExport('pdf')}
                        fullWidth
                        disabled={loading}
                        sx={{ fontWeight: 600 }}
                      >
                        📄 Générer rapport PDF
                      </Button>
                    </Box>
                  </Grid>

                  {/* Excel */}
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid #a5d6a7',
                        borderLeft: '4px solid #4caf50',
                        bgcolor: '#f0fff4',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(76,175,80,0.12)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 44, height: 44, borderRadius: '50%',
                          bgcolor: '#e6f4ed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <TableViewIcon sx={{ color: '#4caf50' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>Export Excel</Typography>
                          <Typography variant="caption" color="text.secondary">Données détaillées pour analyse</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Exporter les données en format Excel pour analyse approfondie
                      </Typography>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<TableViewIcon />}
                        onClick={() => handleExport('excel')}
                        fullWidth
                        disabled={loading}
                        sx={{ fontWeight: 600 }}
                      >
                        📈 Exporter Excel
                      </Button>
                    </Box>
                  </Grid>

                  {/* Custom */}
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid #ffcc80',
                        borderLeft: '4px solid #ff9800',
                        bgcolor: '#fff8e1',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(255,152,0,0.12)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 44, height: 44, borderRadius: '50%',
                          bgcolor: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <GetAppIcon sx={{ color: '#ff9800' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>Rapport Personnalisé</Typography>
                          <Typography variant="caption" color="text.secondary">Configurer les sections</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Créer un rapport personnalisé avec les sections de votre choix
                      </Typography>
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<GetAppIcon />}
                        onClick={() => setCustomReportDialog(true)}
                        fullWidth
                        sx={{ fontWeight: 600 }}
                      >
                        📤 Configurer &amp; Exporter
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      )}

      {/* ── Custom Report Dialog ── */}
      <Dialog
        open={customReportDialog}
        onClose={() => setCustomReportDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>Rapport Personnalisé</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
              Sélectionnez les sections à inclure :
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
              {[
                { key: 'includeCharts',     label: 'Graphiques et statistiques' },
                { key: 'includeDetails',    label: 'Détails des transactions' },
                { key: 'includeSLA',        label: 'Analyse SLA' },
                { key: 'includeExceptions', label: 'Exceptions et alertes' },
              ].map(({ key, label }) => (
                <Box
                  key={key}
                  sx={{
                    px: 1.5, py: 0.5, borderRadius: 1.5,
                    bgcolor: customReportOptions[key as keyof typeof customReportOptions] ? '#f0f4ff' : '#fafafa',
                    border: `1px solid ${customReportOptions[key as keyof typeof customReportOptions] ? '#d0dff5' : '#e0e0e0'}`,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={customReportOptions[key as keyof typeof customReportOptions] as boolean}
                        onChange={(e) => setCustomReportOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                        size="small"
                        sx={{ '&.Mui-checked': { color: '#1e3a5f' } }}
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>}
                  />
                </Box>
              ))}
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Format d'export</InputLabel>
              <Select
                value={customReportOptions.format}
                onChange={(e) => setCustomReportOptions(prev => ({ ...prev, format: e.target.value }))}
                label="Format d'export"
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="word">Word</MenuItem>
              </Select>
            </FormControl>

            {reportData && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>
                Données disponibles : {Array.isArray(reportData) ? reportData.length : 0} enregistrement(s)
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setCustomReportDialog(false)} variant="outlined">Annuler</Button>
          <Button
            variant="contained"
            onClick={handleCustomReport}
            disabled={loading || !Object.values(customReportOptions).slice(0, 4).some(Boolean)}
            sx={{ fontWeight: 600 }}
          >
            Générer le rapport
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ReportsTab;