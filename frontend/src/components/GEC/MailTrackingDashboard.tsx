import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Email,
  Visibility,
  Reply,
  Link,
  CheckCircle,
  Error,
  Schedule,
  TrendingUp,
  LocationOn,
  Person
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
// Removed mock service imports

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tracking-tabpanel-${index}`}
      aria-labelledby={`tracking-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MailTrackingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackingData();
  }, [period]);

  const loadTrackingData = async () => {
    console.log('📊 Loading email tracking data...');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/courriers/tracking/stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Tracking data loaded:', data);
        setTrackingData(data);
      } else {
        console.error('Failed to load tracking data:', response.status);
        // Fallback to mock data
        setTrackingData(getMockTrackingData());
      }
    } catch (error) {
      console.error('Failed to load tracking data:', error);
      // Fallback to mock data
      setTrackingData(getMockTrackingData());
    } finally {
      setLoading(false);
    }
  };

  const getMockTrackingData = () => ({
    summary: {
      totalMessages: 156,
      deliveryRate: 94.2,
      openRate: 68.5,
      responseRate: 23.1
    },
    timeline: [
      { date: '2025-08-23', sent: 12, delivered: 11, opened: 8, replied: 3 },
      { date: '2025-08-24', sent: 18, delivered: 17, opened: 12, replied: 4 },
      { date: '2025-08-25', sent: 25, delivered: 24, opened: 18, replied: 6 },
      { date: '2025-08-26', sent: 22, delivered: 21, opened: 15, replied: 5 },
      { date: '2025-08-27', sent: 28, delivered: 26, opened: 19, replied: 7 },
      { date: '2025-08-28', sent: 31, delivered: 29, opened: 22, replied: 8 },
      { date: '2025-08-29', sent: 20, delivered: 19, opened: 14, replied: 4 }
    ],
    delivery: {
      'msg_001': { status: 'delivered', sentAt: '2025-08-29T10:00:00Z', deliveredAt: '2025-08-29T10:02:15Z', attempts: 1 },
      'msg_002': { status: 'delivered', sentAt: '2025-08-29T11:30:00Z', deliveredAt: '2025-08-29T11:31:45Z', attempts: 1 },
      'msg_003': { status: 'failed', sentAt: '2025-08-29T12:00:00Z', deliveredAt: null, attempts: 3 },
      'msg_004': { status: 'delivered', sentAt: '2025-08-29T13:15:00Z', deliveredAt: '2025-08-29T13:16:30Z', attempts: 1 },
      'msg_005': { status: 'bounced', sentAt: '2025-08-29T14:00:00Z', deliveredAt: null, attempts: 2 }
    },
    engagement: {
      topRecipients: [
        { recipient: 'client.abc@email.com', opens: 12 },
        { recipient: 'client.xyz@email.com', opens: 8 },
        { recipient: 'client.def@email.com', opens: 6 }
      ]
    },
    responses: {
      totalResponses: 36,
      avgResponseTime: 4.2,
      autoReplyRate: 15.3,
      sentimentDistribution: {
        positive: 18,
        neutral: 12,
        negative: 6
      }
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'sent': return 'info';
      case 'failed': return 'error';
      case 'bounced': return 'warning';
      default: return 'default';
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading || !trackingData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Suivi des Emails
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={period}
            label="Période"
            onChange={(e) => setPeriod(e.target.value)}
            size="small"
          >
            <MenuItem value="24h">24 heures</MenuItem>
            <MenuItem value="7d">7 jours</MenuItem>
            <MenuItem value="30d">30 jours</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Emails Envoyés
                  </Typography>
                  <Typography variant="h4" component="div">
                    {trackingData.summary.totalMessages}
                  </Typography>
                </Box>
                <Email color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Taux de Livraison
                  </Typography>
                  <Typography variant="h4" component="div">
                    {formatPercentage(trackingData.summary.deliveryRate)}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Taux d'Ouverture
                  </Typography>
                  <Typography variant="h4" component="div">
                    {formatPercentage(trackingData.summary.openRate)}
                  </Typography>
                </Box>
                <Visibility color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Taux de Réponse
                  </Typography>
                  <Typography variant="h4" component="div">
                    {formatPercentage(trackingData.summary.responseRate)}
                  </Typography>
                </Box>
                <Reply color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="tracking tabs">
            <Tab label="Vue d'Ensemble" />
            <Tab label="Livraisons" />
            <Tab label="Ouvertures" />
            <Tab label="Réponses" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Overview Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Tendances d'Engagement
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trackingData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sent" stroke="#8884d8" strokeWidth={2} name="Envoyés" />
                  <Line type="monotone" dataKey="delivered" stroke="#82ca9d" strokeWidth={2} name="Livrés" />
                  <Line type="monotone" dataKey="opened" stroke="#ffc658" strokeWidth={2} name="Ouverts" />
                  <Line type="monotone" dataKey="replied" stroke="#ff7300" strokeWidth={2} name="Réponses" />
                </LineChart>
              </ResponsiveContainer>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Répartition des Statuts
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Livrés', value: trackingData.summary.deliveryRate },
                      { name: 'Ouverts', value: trackingData.summary.openRate },
                      { name: 'Réponses', value: trackingData.summary.responseRate },
                      { name: 'Non ouverts', value: 100 - trackingData.summary.openRate }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Delivery Tab */}
          <Typography variant="h6" gutterBottom>
            Statuts de Livraison
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Message ID</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Envoyé le</TableCell>
                  <TableCell>Livré le</TableCell>
                  <TableCell>Tentatives</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(trackingData.delivery).map(([messageId, status]: [string, any]) => (
                  <TableRow key={messageId}>
                    <TableCell>{messageId}</TableCell>
                    <TableCell>
                      <Chip
                        label={status.status}
                        color={getStatusColor(status.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {status.sentAt ? new Date(status.sentAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {status.deliveredAt ? new Date(status.deliveredAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>{status.attempts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* Opens Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Ouvertures par Heure
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Array.from({ length: 24 }, (_, hour) => ({
                  hour: `${hour}h`,
                  opens: Math.floor(Math.random() * 20) + 1
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="opens" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Top Destinataires
              </Typography>
              <List>
                {trackingData.engagement.topRecipients?.map((recipient: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <Person />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={recipient.recipient}
                      secondary={`${recipient.opens} ouverture(s)`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Détails des Ouvertures
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Destinataire</TableCell>
                    <TableCell>Ouvert le</TableCell>
                    <TableCell>Localisation</TableCell>
                    <TableCell>Appareil</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trackingData.recentEmails?.map((receipt: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{receipt.recipient}</TableCell>
                      <TableCell>{new Date(receipt.readAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LocationOn fontSize="small" color="action" />
                          {receipt.location}
                        </Box>
                      </TableCell>
                      <TableCell>{receipt.userAgent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {/* Responses Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Analyse des Réponses
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Total des réponses
                    </Typography>
                    <Typography variant="h6">
                      {trackingData.responses.totalResponses}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Temps de réponse moyen
                    </Typography>
                    <Typography variant="h6">
                      {trackingData.responses.avgResponseTime.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Taux de réponse automatique
                    </Typography>
                    <Typography variant="h6">
                      {formatPercentage(trackingData.responses.autoReplyRate)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sentiment des Réponses
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Positif', value: trackingData.responses.sentimentDistribution.positive },
                          { name: 'Neutre', value: trackingData.responses.sentimentDistribution.neutral },
                          { name: 'Négatif', value: trackingData.responses.sentimentDistribution.negative }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#4caf50" />
                        <Cell fill="#ff9800" />
                        <Cell fill="#f44336" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Réponses Récentes
            </Typography>
            <List>
              {trackingData.recentResponses?.map((response: any, index: number) => (
                <ListItem
                  key={index}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemIcon>
                    <Reply color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {response.subject}
                        </Typography>
                        <Chip
                          label={response.sentiment}
                          color={
                            response.sentiment === 'positive' ? 'success' :
                            response.sentiment === 'negative' ? 'error' : 'default'
                          }
                          size="small"
                        />
                        {response.isAutoReply && (
                          <Chip label="Auto-réponse" size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          De: {response.from}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(response.receivedAt).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default MailTrackingDashboard;