import React, { useState, useEffect } from 'react';
import { 
  Close as X, 
  CheckCircle, 
  Cancel as XCircle,
  CompareArrows,
  Error as ErrorIcon,
  CheckCircleOutline
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Alert
} from '@mui/material';

// Validation rules based on Attijari Bank specification table
const FIELD_SPECS = [
  { pos: 0, len: 1, name: 'Sens', type: 'numeric', value: '1' },
  { pos: 1, len: 2, name: 'Code valeur', type: 'numeric', value: '10' },
  { pos: 3, len: 1, name: 'Nature remettant', type: 'numeric', value: '1' },
  { pos: 4, len: 2, name: 'Code remettant', type: 'numeric' },
  { pos: 6, len: 3, name: 'Centre régional', type: 'spaces' },
  { pos: 9, len: 8, name: 'Date opération', type: 'date' },
  { pos: 17, len: 4, name: 'Numéro du lot', type: 'numeric' },
  { pos: 21, len: 2, name: 'Code enregistrement', type: 'numeric', value: '21' },
  { pos: 23, len: 3, name: 'Code devise', type: 'alphanumeric', value: '788' },
  { pos: 26, len: 2, name: 'Rang', type: 'numeric', value: '00' },
  { pos: 28, len: 15, name: 'Montant du virement', type: 'numeric' },
  { pos: 43, len: 7, name: 'Numéro du virement', type: 'numeric' },
  { pos: 50, len: 20, name: 'RIB du donneur', type: 'numeric' },
  { pos: 70, len: 30, name: 'Nom donneur', type: 'alphanumeric' },
  { pos: 100, len: 2, name: 'Code institution dest', type: 'numeric' },
  { pos: 102, len: 3, name: 'Centre dest', type: 'spaces' },
  { pos: 105, len: 20, name: 'RIB bénéficiaire', type: 'numeric' },
  { pos: 125, len: 30, name: 'Nom bénéficiaire', type: 'alphanumeric' },
  { pos: 155, len: 20, name: 'Référence dossier', type: 'alphanumeric' },
  { pos: 175, len: 1, name: 'Code compl', type: 'numeric' },
  { pos: 176, len: 2, name: 'Nb compl', type: 'numeric' },
  { pos: 178, len: 45, name: 'Motif opération', type: 'alphanumeric' },
  { pos: 223, len: 8, name: 'Date compensation', type: 'date' },
  { pos: 231, len: 8, name: 'Motif rejet', type: 'numeric' },
  { pos: 239, len: 1, name: 'Situation donneur', type: 'numeric' },
  { pos: 240, len: 1, name: 'Type compte', type: 'numeric' },
  { pos: 241, len: 1, name: 'Nature compte', type: 'alphanumeric' },
  { pos: 242, len: 1, name: 'Dossier change', type: 'alphanumeric' },
  { pos: 243, len: 37, name: 'Zone libre', type: 'spaces' }
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  successes?: string[];
}

interface TxtFormatValidatorProps {
  open: boolean;
  onClose: () => void;
  generatedContent: string;
}

const TxtFormatValidator: React.FC<TxtFormatValidatorProps> = ({ open, onClose, generatedContent }) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (open && generatedContent) {
      validateFormat();
    }
  }, [open, generatedContent]);

  const validateFormat = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const successes: string[] = [];
    
    const generatedLines = generatedContent.split('\n').filter(l => l.trim());

    if (generatedLines.length < 2) {
      errors.push('Fichier vide ou incomplet');
      setValidationResult({ isValid: false, errors, warnings });
      return;
    }

    // Validate each line against specification
    generatedLines.forEach((genLine, lineIndex) => {
      const lineNum = lineIndex + 1;

      // Check line length
      if (genLine.length !== 280) {
        errors.push(`Ligne ${lineNum}: longueur ${genLine.length} au lieu de 280`);
      } else {
        successes.push(`Ligne ${lineNum}: longueur correcte (280 caractères)`);
      }

      // Validate each field according to specification
      FIELD_SPECS.forEach(spec => {
        const segment = genLine.substring(spec.pos, spec.pos + spec.len);
        
        // Check fixed values
        if (spec.value && segment !== spec.value) {
          errors.push(`Ligne ${lineNum} - ${spec.name} [pos ${spec.pos}]: "${segment}" au lieu de "${spec.value}"`);
          return;
        }

        // Check field types
        if (spec.type === 'numeric' && !/^\d+$/.test(segment)) {
          errors.push(`Ligne ${lineNum} - ${spec.name} [pos ${spec.pos}]: doit être numérique "${segment}"`);
        } else if (spec.type === 'date' && !/^\d{8}$/.test(segment)) {
          errors.push(`Ligne ${lineNum} - ${spec.name} [pos ${spec.pos}]: format date invalide "${segment}"`);
        } else if (spec.type === 'spaces' && !/^ +$/.test(segment)) {
          errors.push(`Ligne ${lineNum} - ${spec.name} [pos ${spec.pos}]: doit contenir des espaces`);
        } else if (segment.length === spec.len) {
          successes.push(`Ligne ${lineNum} - ${spec.name}: OK`);
        }
      });
    });

    setValidationResult({ isValid: errors.length === 0, errors, warnings, successes });
  };

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle sx={{ bgcolor: validationResult?.isValid ? '#e8f5e9' : '#ffebee', borderBottom: '1px solid #ddd' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <CompareArrows sx={{ fontSize: 32, color: '#1976d2' }} />
            <Box>
              <Typography variant="h5" fontWeight={600}>
                Validation Format TXT ATTIJARI
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Vérification selon spécifications bancaires (29 champs, 280 caractères)
              </Typography>
            </Box>
          </Box>
          {validationResult && (
            <Chip 
              icon={validationResult.isValid ? <CheckCircleOutline /> : <ErrorIcon />}
              label={validationResult.isValid ? 'CONFORME' : 'NON CONFORME'}
              color={validationResult.isValid ? 'success' : 'error'}
              sx={{ fontSize: 16, fontWeight: 600, px: 2, py: 3 }}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {validationResult && (
          <>
            <Alert 
              severity={validationResult.isValid ? 'success' : 'error'} 
              sx={{ mb: 3, fontSize: 16 }}
              icon={validationResult.isValid ? <CheckCircle sx={{ fontSize: 28 }} /> : <XCircle sx={{ fontSize: 28 }} />}
            >
              <Typography variant="h6" fontWeight={600}>
                {validationResult.isValid 
                  ? '✓ Format validé - Prêt pour envoi bancaire' 
                  : '✗ Erreurs détectées - Correction requise'}
              </Typography>
            </Alert>

            {validationResult.errors.length > 0 && (
              <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <ErrorIcon color="error" sx={{ fontSize: 28 }} />
                  <Typography variant="h6" fontWeight={600} color="error">
                    {validationResult.errors.length} Erreur(s)
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {validationResult.errors.map((error, idx) => (
                    <Alert severity="error" sx={{ mb: 1 }} key={idx}>
                      <Typography variant="body2" fontFamily="monospace">
                        {error}
                      </Typography>
                    </Alert>
                  ))}
                </Box>
              </Paper>
            )}

            {validationResult.successes && validationResult.successes.length > 0 && (
              <Paper elevation={2} sx={{ p: 3, bgcolor: '#e8f5e9', border: '2px solid #4caf50' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <CheckCircleOutline color="success" sx={{ fontSize: 28 }} />
                  <Typography variant="h6" fontWeight={600} color="success">
                    {validationResult.successes.length} Champ(s) Valide(s)
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {validationResult.successes.slice(0, 10).map((success, idx) => (
                    <Alert severity="success" sx={{ mb: 0.5, py: 0.5 }} key={idx}>
                      <Typography variant="caption" fontFamily="monospace">
                        {success}
                      </Typography>
                    </Alert>
                  ))}
                  {validationResult.successes.length > 10 && (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      ... et {validationResult.successes.length - 10} autres champs valides
                    </Typography>
                  )}
                </Box>
              </Paper>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: '#fafafa', borderTop: '1px solid #ddd' }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          size="large"
          sx={{ px: 4 }}
        >
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { TxtFormatValidator };
