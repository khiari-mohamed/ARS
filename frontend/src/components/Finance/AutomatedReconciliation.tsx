import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Upload,
  CheckCircle,
  Error,
  Warning,
  Sync,
  ExpandMore,
  AccountBalance,
  TrendingUp,
  Assessment
} from '@mui/icons-material';

const AutomatedReconciliation: React.FC = () => {
  const [statements, setStatements] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [reconciliationStats, setReconciliationStats] = useState<any>(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [processingDialog, setProcessingDialog] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<any>(null);
  const [processingStep, setProcessingStep] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Mock data
      setStatements([
        {
          id: 'stmt_001',
          bankCode: 'BNP',
          accountNumber: 'FR7630001007941234567890185',
          statementDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          openingBalance: 50000.00,
          closingBalance: 48500.00,
          transactionCount: 25,
          matchedTransactions: 22,
          status: 'reconciled',
          reconciliationRate: 88.0,
          processedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: 'stmt_002',
          bankCode: 'SG',
          accountNumber: 'FR7630003000111234567890189',
          statementDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          openingBalance: 75000.00,
          closingBalance: 72300.00,
          transactionCount: 18,
          matchedTransactions: 16,
          status: 'exception',
          reconciliationRate: 88.9,
          processedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'stmt_003',
          bankCode: 'CA',
          accountNumber: 'FR7630002000121234567890123',
          statementDate: new Date(),
          openingBalance: 25000.00,
          closingBalance: 23800.00,
          transactionCount: 12,
          matchedTransactions: 0,
          status: 'imported',
          reconciliationRate: 0,
          processedAt: null
        }
      ]);

      setExceptions([
        {
          id: 'exc_001',
          type: 'unmatched_payment',
          paymentId: 'pay_001',
          description: 'Payment to ACME Corp not found in bank statement',
          severity: 'medium',
          amount: 1500.00,
          status: 'open',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          suggestedActions: [
            'Check if payment is still pending',
            'Verify payment execution date',
            'Contact bank for transaction status'
          ]
        },
        {
          id: 'exc_002',
          type: 'amount_mismatch',
          paymentId: 'pay_002',
          transactionId: 'txn_002',
          description: 'Amount mismatch: Payment €1,500.00 vs Transaction €1,485.50',
          severity: 'high',
          amount: 14.50,
          status: 'investigating',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          suggestedActions: [
            'Review bank charges and fees',
            'Check for currency conversion',
            'Verify payment amount accuracy'
          ]
        },
        {
          id: 'exc_003',
          type: 'unmatched_transaction',
          transactionId: 'txn_003',
          description: 'Unmatched bank transaction: VIREMENT RECU DE UNKNOWN CLIENT',
          severity: 'low',
          amount: 250.00,
          status: 'open',
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          suggestedActions: [
            'Review transaction details',
            'Check for manual payment entries',
            'Verify counterparty information'
          ]
        }
      ]);

      setReconciliationStats({
        totalStatements: 12,
        processedStatements: 11,
        totalTransactions: 1456,
        matchedTransactions: 1289,
        unmatchedTransactions: 167,
        totalExceptions: 89,
        resolvedExceptions: 67,
        averageReconciliationRate: 88.5,
        averageProcessingTime: 2.3,
        matchingAccuracy: 94.2,
        exceptionResolutionRate: 75.3
      });
    } catch (error) {
      console.error('Failed to load reconciliation data:', error);
    }
  };

  const handleProcessStatement = async (statement: any) => {
    setSelectedStatement(statement);
    setProcessingStep(0);
    setProcessingDialog(true);

    // Simulate processing steps
    const steps = [
      'Analyse du relevé bancaire',
      'Recherche des paiements correspondants',
      'Rapprochement automatique',
      'Identification des exceptions',
      'Génération du rapport'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingStep(i + 1);
    }

    // Update statement status
    statement.status = 'reconciled';
    statement.matchedTransactions = Math.floor(statement.transactionCount * 0.9);
    statement.reconciliationRate = (statement.matchedTransactions / statement.transactionCount) * 100;
    statement.processedAt = new Date();

    setTimeout(() => {
      setProcessingDialog(false);
      loadData();
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reconciled': return 'success';
      case 'exception': return 'warning';
      case 'processing': return 'info';
      case 'imported': return 'default';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case 'unmatched_payment': return <Error />;
      case 'unmatched_transaction': return <Warning />;
      case 'amount_mismatch': return <TrendingUp />;
      default: return <Warning />;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Rapprochement Automatisé
      </Typography>

      {/* Statistics */}
      {reconciliationStats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Taux de Rapprochement
                </Typography>
                <Typography variant="h4" component="div">
                  {reconciliationStats.averageReconciliationRate.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={reconciliationStats.averageReconciliationRate}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Transactions Rapprochées
                </Typography>
                <Typography variant="h4" component="div">
                  {reconciliationStats.matchedTransactions}
                </Typography>
                <Typography variant="caption" color="success.main">
                  sur {reconciliationStats.totalTransactions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Exceptions Ouvertes
                </Typography>
                <Typography variant="h4" component="div">
                  {reconciliationStats.totalExceptions - reconciliationStats.resolvedExceptions}
                </Typography>
                <Typography variant="caption" color="warning.main">
                  {reconciliationStats.totalExceptions} au total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Temps de Traitement
                </Typography>
                <Typography variant="h4" component="div">
                  {reconciliationStats.averageProcessingTime.toFixed(1)}h
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Moyenne
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Bank Statements */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Relevés Bancaires ({statements.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Upload />}
                  onClick={() => setUploadDialog(true)}
                >
                  Importer Relevé
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Banque</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Transactions</TableCell>
                      <TableCell>Rapprochement</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statements.map((statement) => (
                      <TableRow key={statement.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {statement.bankCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {statement.accountNumber.slice(-4)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {new Date(statement.statementDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {statement.matchedTransactions}/{statement.transactionCount}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={statement.reconciliationRate}
                              sx={{ width: 80, height: 4 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {statement.reconciliationRate.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statement.status}
                            color={getStatusColor(statement.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {statement.status === 'imported' && (
                            <Button
                              size="small"
                              startIcon={<Sync />}
                              onClick={() => handleProcessStatement(statement)}
                            >
                              Traiter
                            </Button>
                          )}
                          {statement.status !== 'imported' && (
                            <Button size="small" startIcon={<Assessment />}>
                              Rapport
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Exceptions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Exceptions ({exceptions.length})
              </Typography>
              
              <List>
                {exceptions.map((exception) => (
                  <ListItem key={exception.id}>
                    <ListItemIcon>
                      {getExceptionIcon(exception.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {exception.type.replace('_', ' ')}
                          </Typography>
                          <Chip
                            label={exception.severity}
                            color={getSeverityColor(exception.severity) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {exception.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Montant: €{exception.amount.toFixed(2)}
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

        {/* Exception Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Détails des Exceptions
              </Typography>
              
              {exceptions.map((exception) => (
                <Accordion key={exception.id}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <Typography variant="subtitle1" fontWeight={600}>
                        {exception.description}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      <Chip
                        label={exception.severity}
                        color={getSeverityColor(exception.severity) as any}
                        size="small"
                      />
                      <Chip
                        label={exception.status}
                        color={exception.status === 'open' ? 'warning' : 'info'}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Informations
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText primary="Type" secondary={exception.type} />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Montant" secondary={`€${exception.amount.toFixed(2)}`} />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Créé le" secondary={new Date(exception.createdAt).toLocaleString()} />
                          </ListItem>
                          {exception.paymentId && (
                            <ListItem>
                              <ListItemText primary="ID Paiement" secondary={exception.paymentId} />
                            </ListItem>
                          )}
                          {exception.transactionId && (
                            <ListItem>
                              <ListItemText primary="ID Transaction" secondary={exception.transactionId} />
                            </ListItem>
                          )}
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Actions Suggérées
                        </Typography>
                        <List dense>
                          {exception.suggestedActions.map((action: string, index: number) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <CheckCircle fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={action} />
                            </ListItem>
                          ))}
                        </List>
                        <Box sx={{ mt: 2 }}>
                          <Button variant="outlined" size="small" sx={{ mr: 1 }}>
                            Résoudre
                          </Button>
                          <Button variant="outlined" size="small" color="warning">
                            Ignorer
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importer un Relevé Bancaire</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Formats supportés: CSV, XML, MT940, CAMT.053
          </Alert>
          <TextField
            fullWidth
            type="file"
            label="Fichier de relevé"
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Code Banque"
            placeholder="Ex: BNP, SG, CA"
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Numéro de Compte"
            placeholder="IBAN ou numéro de compte"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Annuler</Button>
          <Button variant="contained">Importer</Button>
        </DialogActions>
      </Dialog>

      {/* Processing Dialog */}
      <Dialog open={processingDialog} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>Traitement du Relevé en Cours</DialogTitle>
        <DialogContent>
          <Stepper activeStep={processingStep} orientation="vertical">
            {[
              'Analyse du relevé bancaire',
              'Recherche des paiements correspondants',
              'Rapprochement automatique',
              'Identification des exceptions',
              'Génération du rapport'
            ].map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
                <StepContent>
                  {processingStep === index && (
                    <LinearProgress sx={{ mt: 1, mb: 2 }} />
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
          
          {processingStep >= 5 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Rapprochement terminé avec succès !
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AutomatedReconciliation;