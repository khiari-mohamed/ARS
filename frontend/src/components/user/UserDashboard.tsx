import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Person,
  Email,
  Business,
  Schedule,
  Assignment,
  TrendingUp,
  Notifications,
  History,
  Assessment
} from '@mui/icons-material';
import { User, ROLE_LABELS } from '../../types/user.d';
import { fetchUserPerformance, fetchUserActivity, fetchUserAuditLogs } from '../../api/usersApi';

interface Props {
  user: User;
  onClose: () => void;
}

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
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserDashboard: React.FC<Props> = ({ user, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [performance, setPerformance] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [perfData, activityData, logsData] = await Promise.all([
          fetchUserPerformance(user.id),
          fetchUserActivity(user.id),
          fetchUserAuditLogs(user.id)
        ]);
        
        setPerformance(perfData);
        setActivity(activityData);
        setAuditLogs(logsData);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user.id]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* User Header */}
      <Box display="flex" alignItems="center" mb={3} p={2} bgcolor="grey.50" borderRadius={1}>
        <Avatar
          src={user.photo}
          sx={{ width: 80, height: 80, mr: 3 }}
        >
          {user.fullName.charAt(0)}
        </Avatar>
        <Box flex={1}>
          <Typography variant="h5" gutterBottom>
            {user.fullName}
          </Typography>
          <Box display="flex" gap={1} mb={1}>
            <Chip 
              label={ROLE_LABELS[user.role]} 
              color="primary" 
              size="small" 
            />
            <Chip 
              label={user.active ? 'Actif' : 'Inactif'} 
              color={user.active ? 'success' : 'error'} 
              size="small" 
            />
            {activity?.isOnline && (
              <Chip 
                label="En ligne" 
                color="success" 
                variant="outlined" 
                size="small" 
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {user.email} • {user.department || 'Aucun département'}
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Informations" icon={<Person />} />
          <Tab label="Performance" icon={<Assessment />} />
          <Tab label="Activité" icon={<TrendingUp />} />
          <Tab label="Historique" icon={<History />} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations personnelles
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><Person /></ListItemIcon>
                    <ListItemText 
                      primary="Nom complet" 
                      secondary={user.fullName} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Email /></ListItemIcon>
                    <ListItemText 
                      primary="Email" 
                      secondary={user.email} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Business /></ListItemIcon>
                    <ListItemText 
                      primary="Département" 
                      secondary={user.department || 'Non défini'} 
                    />
                  </ListItem>
                  {user.team && (
                    <ListItem>
                      <ListItemText 
                        primary="Équipe" 
                        secondary={user.team} 
                      />
                    </ListItem>
                  )}
                  {user.phone && (
                    <ListItem>
                      <ListItemText 
                        primary="Téléphone" 
                        secondary={user.phone} 
                      />
                    </ListItem>
                  )}
                  {user.position && (
                    <ListItem>
                      <ListItemText 
                        primary="Poste" 
                        secondary={user.position} 
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations système
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Rôle" 
                      secondary={ROLE_LABELS[user.role]} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Statut" 
                      secondary={user.active ? 'Compte actif' : 'Compte désactivé'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Créé le" 
                      secondary={new Date(user.createdAt).toLocaleDateString()} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Dernière modification" 
                      secondary={new Date(user.updatedAt).toLocaleDateString()} 
                    />
                  </ListItem>
                  {activity?.lastLogin && (
                    <ListItem>
                      <ListItemText 
                        primary="Dernière connexion" 
                        secondary={new Date(activity.lastLogin).toLocaleString()} 
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {performance && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Documents traités
                  </Typography>
                  <Typography variant="h4">
                    {performance.processedDocuments}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Conformité SLA
                  </Typography>
                  <Typography variant="h4">
                    {performance.slaCompliance}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={performance.slaCompliance} 
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Temps moyen
                  </Typography>
                  <Typography variant="h4">
                    {performance.avgProcessingTime}h
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Score qualité
                  </Typography>
                  <Typography variant="h4">
                    {performance.qualityScore}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={performance.qualityScore} 
                    color={performance.qualityScore > 80 ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tâches en cours
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Tâches terminées</Typography>
                    <Typography>{performance.completedTasks}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Tâches en attente</Typography>
                    <Typography>{performance.pendingTasks}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography color="error">Tâches en retard</Typography>
                    <Typography color="error">{performance.overdueItems}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Temps d'activité
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Heures actives (30j)</Typography>
                    <Typography>{performance.activeHours}h</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Temps moyen/session</Typography>
                    <Typography>{activity?.averageSessionTime}h</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {activity && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Activité récente (30 jours)
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><Schedule /></ListItemIcon>
                      <ListItemText 
                        primary="Connexions totales" 
                        secondary={activity.totalLogins} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Assignment /></ListItemIcon>
                      <ListItemText 
                        primary="Documents traités" 
                        secondary={activity.documentsProcessed} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><TrendingUp /></ListItemIcon>
                      <ListItemText 
                        primary="Tâches terminées" 
                        secondary={activity.tasksCompleted} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Statut de connexion
                  </Typography>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box 
                      width={12} 
                      height={12} 
                      borderRadius="50%" 
                      bgcolor={activity.isOnline ? 'success.main' : 'grey.400'}
                      mr={1}
                    />
                    <Typography>
                      {activity.isOnline ? 'En ligne' : 'Hors ligne'}
                    </Typography>
                  </Box>
                  {activity.lastLogin && (
                    <Typography variant="body2" color="text.secondary">
                      Dernière connexion: {new Date(activity.lastLogin).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Historique des actions
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Détails</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.action} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {log.details && typeof log.details === 'object' 
                          ? JSON.stringify(log.details, null, 2).substring(0, 100) + '...'
                          : log.details || '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="text.secondary">
                          Aucune action enregistrée
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

export default UserDashboard;