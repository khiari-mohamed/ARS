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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Science,
  CheckCircle,
  Error,
  ExpandMore,
  AccountBalance,
  Public,
  Security
} from '@mui/icons-material';

const MultiBankFormatManager: React.FC = () => {
  const [formats, setFormats] = useState<any[]>([]);
  const [formatDialog, setFormatDialog] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<any>(null);
  const [testData, setTestData] = useState<any>({});
  const [validationResult, setValidationResult] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Mock data
      setFormats([
        {
          id: 'sepa_credit_transfer',
          name: 'SEPA Credit Transfer',
          bankCode: 'SEPA',
          country: 'EU',
          formatType: 'SEPA',
          active: true,
          fields: [
            { name: 'messageId', type: 'string', required: true, maxLength: 35, description: 'Message Identification' },
            { name: 'debtorName', type: 'string', required: true, maxLength: 70, description: 'Debtor Name' },
            { name: 'debtorIban', type: 'iban', required: true, description: 'Debtor IBAN' },
            { name: 'creditorName', type: 'string', required: true, maxLength: 70, description: 'Creditor Name' },
            { name: 'creditorIban', type: 'iban', required: true, description: 'Creditor IBAN' },
            { name: 'amount', type: 'amount', required: true, description: 'Transaction Amount' },
            { name: 'currency', type: 'string', required: true, maxLength: 3, description: 'Currency Code' }
          ],
          validation: {
            ibanValidation: true,
            bicValidation: true,
            amountValidation: true,
            dateValidation: true
          }
        },
        {
          id: 'swift_mt103',
          name: 'SWIFT MT103',
          bankCode: 'SWIFT',
          country: 'INTERNATIONAL',
          formatType: 'SWIFT',
          active: true,
          fields: [
            { name: 'senderReference', type: 'string', required: true, maxLength: 16, description: 'Sender Reference' },
            { name: 'valueDate', type: 'date', required: true, description: 'Value Date' },
            { name: 'currency', type: 'string', required: true, maxLength: 3, description: 'Currency Code' },
            { name: 'amount', type: 'amount', required: true, description: 'Transaction Amount' },
            { name: 'orderingCustomer', type: 'string', required: true, maxLength: 140, description: 'Ordering Customer' },
            { name: 'beneficiaryCustomer', type: 'string', required: true, maxLength: 140, description: 'Beneficiary Customer' }
          ],
          validation: {
            ibanValidation: false,
            bicValidation: true,
            amountValidation: true,
            dateValidation: true
          }
        },
        {
          id: 'french_domestic',
          name: 'French Domestic Transfer',
          bankCode: 'FR_DOM',
          country: 'FR',
          formatType: 'DOMESTIC',
          active: true,
          fields: [
            { name: 'numeroOrdre', type: 'string', required: true, maxLength: 20, description: 'Numéro d\'ordre' },
            { name: 'dateExecution', type: 'date', required: true, description: 'Date d\'exécution' },
            { name: 'nomDebiteur', type: 'string', required: true, maxLength: 35, description: 'Nom du débiteur' },
            { name: 'ibanDebiteur', type: 'iban', required: true, description: 'IBAN du débiteur' },
            { name: 'nomBeneficiaire', type: 'string', required: true, maxLength: 35, description: 'Nom du bénéficiaire' },
            { name: 'ibanBeneficiaire', type: 'iban', required: true, description: 'IBAN du bénéficiaire' },
            { name: 'montant', type: 'amount', required: true, description: 'Montant' },
            { name: 'devise', type: 'string', required: true, maxLength: 3, description: 'Devise' }
          ],
          validation: {
            ibanValidation: true,
            bicValidation: false,
            amountValidation: true,
            dateValidation: true
          }
        }
      ]);

      setStatistics({
        totalFormats: 3,
        activeFormats: 3,
        byType: { 'SEPA': 1, 'SWIFT': 1, 'DOMESTIC': 1 },
        byCountry: { 'EU': 1, 'INTERNATIONAL': 1, 'FR': 1 }
      });
    } catch (error) {
      console.error('Failed to load bank formats:', error);
    }
  };

  const handleTestFormat = async (format: any) => {
    setSelectedFormat(format);
    setTestData({});
    setValidationResult(null);
    setTestDialog(true);
  };

  const handleValidateTestData = async () => {
    if (!selectedFormat) return;

    try {
      // Mock validation
      const errors: any[] = [];
      const warnings: any[] = [];

      // Check required fields
      for (const field of selectedFormat.fields) {
        if (field.required && (!testData[field.name] || testData[field.name] === '')) {
          errors.push({
            field: field.name,
            message: `${field.description} is required`,
            value: testData[field.name],
            rule: 'required'
          });
        }
      }

      // Mock some validation results
      if (testData.amount && Number(testData.amount) <= 0) {
        errors.push({
          field: 'amount',
          message: 'Amount must be positive',
          value: testData.amount,
          rule: 'positive_amount'
        });
      }

      if (testData.currency && testData.currency !== 'EUR' && selectedFormat.id === 'sepa_credit_transfer') {
        errors.push({
          field: 'currency',
          message: 'Currency must be EUR for SEPA transfers',
          value: testData.currency,
          rule: 'sepa_currency'
        });
      }

      setValidationResult({
        success: errors.length === 0,
        errors,
        warnings,
        data: errors.length === 0 ? testData : undefined
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getFormatTypeColor = (type: string) => {
    switch (type) {
      case 'SEPA': return 'primary';
      case 'SWIFT': return 'secondary';
      case 'DOMESTIC': return 'success';
      case 'ACH': return 'info';
      default: return 'default';
    }
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'iban': return <AccountBalance />;
      case 'bic': return <Public />;
      case 'amount': return '€';
      case 'date': return '📅';
      default: return '📝';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gestion des Formats Bancaires Multi-Banques
      </Typography>

      {/* Statistics */}
      {statistics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Formats
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.totalFormats}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Formats Actifs
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.activeFormats}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Types Supportés
                </Typography>
                <Typography variant="h4" component="div">
                  {Object.keys(statistics.byType).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Pays Supportés
                </Typography>
                <Typography variant="h4" component="div">
                  {Object.keys(statistics.byCountry).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Bank Formats Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Formats Bancaires ({formats.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setFormatDialog(true)}
            >
              Nouveau Format
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Format</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Pays</TableCell>
                  <TableCell>Champs</TableCell>
                  <TableCell>Validation</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formats.map((format) => (
                  <TableRow key={format.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {format.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.bankCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={format.formatType}
                        color={getFormatTypeColor(format.formatType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{format.country}</TableCell>
                    <TableCell>{format.fields.length} champs</TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        {format.validation.ibanValidation && (
                          <Chip label="IBAN" size="small" variant="outlined" />
                        )}
                        {format.validation.bicValidation && (
                          <Chip label="BIC" size="small" variant="outlined" />
                        )}
                        {format.validation.amountValidation && (
                          <Chip label="Amount" size="small" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={format.active ? 'Actif' : 'Inactif'}
                        color={format.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleTestFormat(format)}
                        >
                          <Science />
                        </IconButton>
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Format Details */}
      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
          Détails des Formats
        </Typography>
        {formats.map((format) => (
          <Accordion key={format.id}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {format.name}
                </Typography>
                <Chip
                  label={format.formatType}
                  color={getFormatTypeColor(format.formatType) as any}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Informations Générales
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Code Banque" secondary={format.bankCode} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Pays" secondary={format.country} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Type" secondary={format.formatType} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Champs Requis ({format.fields.length})
                  </Typography>
                  <List dense>
                    {format.fields.slice(0, 5).map((field: any) => (
                      <ListItem key={field.name}>
                        <ListItemIcon>
                          {getFieldTypeIcon(field.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={field.description}
                          secondary={
                            <Box>
                              <Typography variant="caption">
                                {field.name} ({field.type})
                                {field.required && ' - Requis'}
                                {field.maxLength && ` - Max: ${field.maxLength}`}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                    {format.fields.length > 5 && (
                      <ListItem>
                        <ListItemText
                          primary={`... et ${format.fields.length - 5} autres champs`}
                          sx={{ fontStyle: 'italic' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Test Format Dialog */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Test de Format - {selectedFormat?.name}
        </DialogTitle>
        <DialogContent>
          {selectedFormat && (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Saisissez les données de test pour valider le format {selectedFormat.name}.
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {selectedFormat.fields.slice(0, 8).map((field: any) => (
                  <Grid item xs={12} sm={6} key={field.name}>
                    <TextField
                      fullWidth
                      label={field.description}
                      value={testData[field.name] || ''}
                      onChange={(e) => setTestData((prev: any) => ({ ...prev, [field.name]: e.target.value }))}
                      required={field.required}
                      type={field.type === 'amount' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                      helperText={`Type: ${field.type}${field.maxLength ? ` | Max: ${field.maxLength}` : ''}`}
                    />
                  </Grid>
                ))}
              </Grid>

              {validationResult && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity={validationResult.success ? 'success' : 'error'}>
                    {validationResult.success ? 'Validation réussie !' : 'Erreurs de validation détectées'}
                  </Alert>

                  {validationResult.errors.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="error" gutterBottom>
                        Erreurs:
                      </Typography>
                      <List dense>
                        {validationResult.errors.map((error: any, index: number) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Error color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary={error.message}
                              secondary={`Champ: ${error.field} | Valeur: ${error.value || 'vide'}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="warning.main" gutterBottom>
                        Avertissements:
                      </Typography>
                      <List dense>
                        {validationResult.warnings.map((warning: any, index: number) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Error color="warning" />
                            </ListItemIcon>
                            <ListItemText
                              primary={warning.message}
                              secondary={`Champ: ${warning.field}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Fermer</Button>
          <Button
            onClick={handleValidateTestData}
            variant="contained"
            disabled={!selectedFormat}
          >
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MultiBankFormatManager;