// D:\ARS\frontend\src\components\reclamations\AIClassificationPanel.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import * as newAiService from '../../services/newAiService';
import {
  Card, CardContent, Typography, Grid, TextField, Button, Box,
  Paper, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Alert, Tabs, Tab,
  CircularProgress, Divider, List, ListItem, ListItemIcon,
  ListItemText, FormControl, InputLabel, Select, MenuItem,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Psychology, TrendingUp, Assessment, Lightbulb, SmartToy,
  Analytics, CheckCircle, Warning, Error, Info, ExpandMore,
  AutoFixHigh, Speed, Insights,
} from '@mui/icons-material';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY       = '#1e3a5f';
const NAVY_LIGHT = '#f0f4ff';
const BORDER     = 'rgba(0,0,0,0.08)';

// ─── Types (preserved 100%) ───────────────────────────────────────────────────
interface ClassificationResult {
  category: string;
  subcategory: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  estimatedResolutionTime: number;
  requiredSkills: string[];
  suggestedActions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  urgencyScore: number;
  keywords: string[];
}

interface ClassificationStats {
  totalClassified: number;
  accuracy: {
    overall: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  trends: {
    daily: Array<{ date: string; count: number; accuracy: number }>;
    categories: Array<{ category: string; trend: number }>;
  };
  performance: {
    avgProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
}

// ─── API functions (preserved 100%) ──────────────────────────────────────────
const classifyClaim = async (
  payload: { text: string; metadata?: any }
): Promise<ClassificationResult> => {
  const { data } = await LocalAPI.post('/reclamations/classify', payload);
  return {
    category:                data.category,
    subcategory:             data.subcategory,
    priority:                data.priority,
    confidence:              data.confidence,
    estimatedResolutionTime: data.estimatedResolutionTime,
    requiredSkills:          data.requiredSkills || [],
    suggestedActions:        data.suggestedActions || [],
    sentiment:               data.sentiment,
    urgencyScore:            data.urgencyScore,
    keywords:                data.keywords || [],
  };
};

const getClassificationStats = async (period = '30d'): Promise<ClassificationStats> => {
  const { data } = await LocalAPI.get('/reclamations/classification/stats', {
    params: { period },
  });
  return data;
};

const updateClassificationModel = async (feedbackData: any[]) => {
  const { data } = await LocalAPI.post('/reclamations/classification/feedback', {
    feedbackData,
  });
  return data;
};

const getAIRecommendations = async (period = '30d') =>
  newAiService.getAIRecommendations(period);

// ─── Visual helpers (preserved logic; sx versions for design system) ──────────
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'error';
    case 'high':   return 'warning';
    case 'medium': return 'info';
    case 'low':    return 'success';
    default:       return 'default';
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 90) return 'success';
  if (confidence >= 75) return 'info';
  if (confidence >= 60) return 'warning';
  return 'error';
};

// Maps priority → design-system color trio for table chips
const priorityChipSx = (priority: string) => {
  switch (priority) {
    case 'urgent': return { bgcolor: '#fdecea', color: '#b71c1c', border: '1px solid #ef9a9a' };
    case 'high':   return { bgcolor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80' };
    case 'medium': return { bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9' };
    case 'low':    return { bgcolor: '#e6f4ed', color: '#1b6b3a', border: '1px solid #a5d6a7' };
    default:       return { bgcolor: '#f4f7fb', color: '#546e7a', border: '1px solid #cfd8dc' };
  }
};

// Maps confidence → design-system color trio for table chips
const confidenceChipSx = (confidence: number) => {
  if (confidence >= 90) return { bgcolor: '#e6f4ed', color: '#1b6b3a', border: '1px solid #a5d6a7' };
  if (confidence >= 75) return { bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9' };
  if (confidence >= 60) return { bgcolor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80' };
  return { bgcolor: '#fdecea', color: '#b71c1c', border: '1px solid #ef9a9a' };
};

// ─── MetricBox: left-border accent box used throughout ───────────────────────
const MetricBox: React.FC<{
  label: string;
  value: React.ReactNode;
  accent: string;
  caption?: string;
}> = ({ label, value, accent, caption }) => (
  <Box sx={{
    p: 2, bgcolor: '#fff', borderRadius: 1.5,
    border: `1px solid ${BORDER}`,
    borderLeft: `4px solid ${accent}`,
  }}>
    <Typography variant="caption" sx={{
      color: '#546e7a', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.6px',
      fontSize: '0.68rem', display: 'block', mb: 0.6,
    }}>
      {label}
    </Typography>
    <Box>{value}</Box>
    {caption && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
        {caption}
      </Typography>
    )}
  </Box>
);

// ─── StatCard: icon-circle card for the stats dashboard ──────────────────────
const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  accent: string;
  iconBg: string;
  icon: React.ReactElement;
}> = ({ label, value, accent, iconBg, icon }) => (
  <Card elevation={0} sx={{
    border: `1px solid ${BORDER}`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 2,
    transition: 'box-shadow 0.2s',
    '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
  }}>
    <CardContent sx={{ p: '20px !important' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="caption" sx={{
            color: '#546e7a', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.6px',
            fontSize: '0.68rem', display: 'block', mb: 0.8,
          }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: NAVY, lineHeight: 1 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{
          width: 44, height: 44, borderRadius: '50%',
          bgcolor: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {React.cloneElement(icon, { sx: { color: accent, fontSize: 22 } } as any)}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ─── Inner tab nav header ─────────────────────────────────────────────────────
const INNER_TAB_SX = {
  minHeight: 48,
  '& .MuiTabs-indicator': { backgroundColor: NAVY, height: 3, borderRadius: '3px 3px 0 0' },
  '& .MuiTab-root': {
    minHeight: 48, fontSize: '0.82rem', fontWeight: 600,
    textTransform: 'none', color: '#546e7a',
    padding: '10px 20px',
    '&.Mui-selected': { color: NAVY },
    '&:hover:not(.Mui-selected)': { color: NAVY, bgcolor: 'rgba(30,58,95,0.05)' },
  },
};

// ─── Table header cell sx ─────────────────────────────────────────────────────
const TH_SX = {
  bgcolor: NAVY, color: '#fff',
  fontWeight: 700, fontSize: '0.70rem',
  textTransform: 'uppercase' as const, letterSpacing: '0.6px',
  whiteSpace: 'nowrap' as const, py: 1.5,
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 'none' },
};

// ─── Main component ───────────────────────────────────────────────────────────
const AIClassificationPanel: React.FC = () => {
  const [activeTab, setActiveTab]                     = useState(0);
  const [testText, setTestText]                       = useState('');
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [selectedPeriod, setSelectedPeriod]           = useState('30d');
  const [isTraining, setIsTraining]                   = useState(false);

  const queryClient = useQueryClient();

  // ── Queries (preserved 100%) ──────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading, error: statsError } =
    useQuery<ClassificationStats>(
      ['classification-stats', selectedPeriod],
      () => getClassificationStats(selectedPeriod),
      { refetchInterval: 60000, staleTime: 30000 },
    );

  const { data: recommendations, isLoading: recommendationsLoading, error: recommendationsError } =
    useQuery(
      ['ai-recommendations', selectedPeriod],
      () => getAIRecommendations(selectedPeriod),
      { refetchInterval: 300000, staleTime: 60000 },
    );

  // ── Mutations (preserved 100%) ────────────────────────────────────────────
  const classifyMutation = useMutation(classifyClaim, {
    onSuccess: (data) => { setClassificationResult(data); },
    onError:   (error) => { console.error('Classification error:', error); },
  });

  const trainModelMutation = useMutation(updateClassificationModel, {
    onSuccess: () => {
      queryClient.invalidateQueries(['classification-stats']);
      setIsTraining(false);
    },
  });

  // ── Handlers (preserved 100%) ─────────────────────────────────────────────
  const handleClassify = () => {
    if (!testText.trim()) return;
    setClassificationResult(null);
    classifyMutation.mutate({ text: testText });
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    try {
      const { data: recentClaims } = await LocalAPI.get('/reclamations', {
        params: { take: 50 },
      });
      const feedbackData = recentClaims.map((claim: any) => ({
        claimId:        claim.id,
        text:           claim.description,
        actualCategory: claim.type,
        actualPriority: claim.severity?.toLowerCase() || 'medium',
        correct:        true,
      }));
      trainModelMutation.mutate(feedbackData);
    } catch (error) {
      console.error('Failed to prepare training data:', error);
      setIsTraining(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 0 — Classification Test
  // ═══════════════════════════════════════════════════════════════════════════
  const renderClassificationTest = () => (
    <Grid container spacing={3}>

      {/* Left: main classification card */}
      <Grid item xs={12} md={8}>
        <Card elevation={0} sx={{
          border: `1px solid ${BORDER}`,
          borderLeft: `4px solid #2196f3`,
          borderRadius: 2,
        }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>

            {/* Card header */}
            <Box display="flex" alignItems="center" gap={1.5} mb={0.8}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%',
                bgcolor: 'rgba(33,150,243,0.09)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Psychology sx={{ color: '#2196f3', fontSize: 19 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>
                  Classification Automatique IA
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  NLP avancé · SVM · Random Forest · TF-IDF
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2.5, borderColor: '#e0e7ef' }} />

            {/* Textarea */}
            <TextField
              fullWidth
              multiline
              rows={7}
              label="Texte de réclamation à analyser"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Saisissez votre réclamation ici… L'IA analysera automatiquement le contenu, détectera les mots-clés, évaluera le sentiment, calculera l'urgence et proposera des actions spécifiques."
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5, fontSize: '0.92rem', lineHeight: 1.6,
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: NAVY },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: NAVY },
              }}
            />

            {/* Action buttons */}
            <Box display="flex" gap={1.5} flexWrap="wrap" mb={3}>
              <Button
                variant="contained"
                onClick={handleClassify}
                disabled={!testText.trim() || classifyMutation.isLoading}
                startIcon={
                  classifyMutation.isLoading
                    ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                    : <Psychology />
                }
                sx={{
                  bgcolor: NAVY, color: '#fff', fontWeight: 700,
                  textTransform: 'none', px: 3, py: 1.2, borderRadius: 1.5,
                  '&:hover': { bgcolor: '#2c5282' },
                }}
              >
                {classifyMutation.isLoading ? 'Analyse en cours…' : 'Analyser avec IA'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<Lightbulb />}
                onClick={() => setTestText(
                  "Je suis très mécontent du retard de traitement de mon dossier de remboursement. Cela fait maintenant 3 semaines que j'attends une réponse et personne ne me donne d'informations. C'est urgent car j'ai besoin de cet argent pour payer mes factures médicales."
                )}
                sx={{
                  borderColor: NAVY, color: NAVY, fontWeight: 600,
                  textTransform: 'none', px: 2, py: 1.2, borderRadius: 1.5,
                  '&:hover': { bgcolor: NAVY, color: '#fff' },
                }}
              >
                Exemple réclamation
              </Button>

              <Button
                variant="outlined"
                startIcon={<AutoFixHigh />}
                onClick={() => setTestText(
                  "Bonjour, je souhaite signaler un problème technique avec votre site web. Impossible de me connecter à mon espace client depuis ce matin. Le message d'erreur indique \"connexion impossible\". Pouvez-vous résoudre ce bug rapidement ?"
                )}
                sx={{
                  borderColor: '#546e7a', color: '#546e7a', fontWeight: 600,
                  textTransform: 'none', px: 2, py: 1.2, borderRadius: 1.5,
                  '&:hover': { bgcolor: '#546e7a', color: '#fff' },
                }}
              >
                Exemple technique
              </Button>
            </Box>

            {/* ── Classification results ── */}
            {classificationResult && (
              <Paper elevation={0} sx={{
                p: 3, borderRadius: 2,
                bgcolor: '#e6f4ed',
                border: '1px solid #a5d6a7',
                borderLeft: '4px solid #1b6b3a',
              }}>
                {/* Result header */}
                <Box display="flex" alignItems="center" gap={1.2} mb={2.5}>
                  <CheckCircle sx={{ color: '#1b6b3a', fontSize: 22 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1b6b3a' }}>
                    Analyse IA — Résultats
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {/* Row 1: Category · Priority · Sentiment */}
                  <Grid item xs={12} sm={4}>
                    <MetricBox
                      label="Catégorie détectée"
                      accent="#2196f3"
                      value={
                        <Chip
                          label={`${classificationResult.category} – ${classificationResult.subcategory}`}
                          size="small"
                          sx={{
                            bgcolor: '#e3f2fd', color: '#0d47a1',
                            border: '1px solid #90caf9',
                            fontWeight: 700, fontSize: '0.78rem',
                            borderRadius: 1, mt: 0.5,
                          }}
                        />
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MetricBox
                      label="Priorité calculée"
                      accent={priorityChipSx(classificationResult.priority).color as string}
                      value={
                        <Chip
                          label={`${classificationResult.priority.toUpperCase()} PRIORITÉ`}
                          size="small"
                          sx={{
                            ...priorityChipSx(classificationResult.priority),
                            fontWeight: 700, fontSize: '0.78rem',
                            borderRadius: 1, mt: 0.5,
                          }}
                        />
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MetricBox
                      label="Sentiment analysé"
                      accent={
                        classificationResult.sentiment === 'negative' ? '#b71c1c'
                        : classificationResult.sentiment === 'positive' ? '#1b6b3a'
                        : '#546e7a'
                      }
                      value={
                        <Chip
                          label={
                            classificationResult.sentiment === 'negative' ? 'NÉGATIF'
                            : classificationResult.sentiment === 'positive' ? 'POSITIF'
                            : 'NEUTRE'
                          }
                          size="small"
                          sx={{
                            ...(classificationResult.sentiment === 'negative'
                              ? { bgcolor: '#fdecea', color: '#b71c1c', border: '1px solid #ef9a9a' }
                              : classificationResult.sentiment === 'positive'
                              ? { bgcolor: '#e6f4ed', color: '#1b6b3a', border: '1px solid #a5d6a7' }
                              : { bgcolor: '#f4f7fb', color: '#546e7a', border: '1px solid #cfd8dc' }),
                            fontWeight: 700, fontSize: '0.78rem',
                            borderRadius: 1, mt: 0.5,
                          }}
                        />
                      }
                    />
                  </Grid>

                  {/* Row 2: Resolution time · Urgency · Confidence */}
                  <Grid item xs={12} sm={4}>
                    <MetricBox
                      label="Temps estimé (ML)"
                      accent="#00bcd4"
                      caption="Calculé par régression ML"
                      value={
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#00bcd4' }}>
                          {classificationResult.estimatedResolutionTime}h
                        </Typography>
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MetricBox
                      label="Score d'urgence"
                      accent="#f44336"
                      caption="Analyse multi-critères"
                      value={
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#f44336' }}>
                          {classificationResult.urgencyScore}/10
                        </Typography>
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MetricBox
                      label="Confiance IA"
                      accent="#4caf50"
                      caption="Distance frontière décision"
                      value={
                        <Box>
                          <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
                            <LinearProgress
                              variant="determinate"
                              value={classificationResult.confidence}
                              color={getConfidenceColor(classificationResult.confidence) as any}
                              sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                            />
                            <Typography variant="body1" fontWeight={800}
                              sx={{ ...confidenceChipSx(classificationResult.confidence),
                                    border: 'none', bgcolor: 'transparent',
                                    minWidth: 40, textAlign: 'right' }}>
                              {classificationResult.confidence}%
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </Grid>

                  {/* Skills */}
                  <Grid item xs={12} sm={6}>
                    <MetricBox
                      label="Compétences requises (ML)"
                      accent="#9c27b0"
                      value={
                        <Box display="flex" gap={0.8} flexWrap="wrap" mt={0.6}>
                          {(classificationResult.requiredSkills || []).map((skill, i) => (
                            <Chip key={i} label={skill} size="small" sx={{
                              bgcolor: '#f3e5f5', color: '#6a1b9a',
                              border: '1px solid #ce93d8',
                              fontWeight: 600, fontSize: '0.72rem', borderRadius: 1, height: 22,
                            }} />
                          ))}
                        </Box>
                      }
                    />
                  </Grid>

                  {/* Keywords */}
                  <Grid item xs={12} sm={6}>
                    <MetricBox
                      label="Mots-clés TF-IDF extraits"
                      accent="#2196f3"
                      value={
                        <Box display="flex" gap={0.8} flexWrap="wrap" mt={0.6}>
                          {(classificationResult.keywords || []).map((kw, i) => (
                            <Chip key={i} label={`#${kw}`} size="small" sx={{
                              bgcolor: '#e3f2fd', color: '#0d47a1',
                              border: '1px solid #90caf9',
                              fontWeight: 600, fontSize: '0.72rem', borderRadius: 1, height: 22,
                            }} />
                          ))}
                        </Box>
                      }
                    />
                  </Grid>

                  {/* Suggested actions */}
                  <Grid item xs={12}>
                    <MetricBox
                      label="Actions recommandées (arbre de décision)"
                      accent="#4caf50"
                      value={
                        <List dense disablePadding sx={{ mt: 0.6 }}>
                          {(classificationResult.suggestedActions || []).map((action, i) => (
                            <ListItem key={i} disablePadding sx={{
                              py: 0.8, px: 1.5, mb: 0.5,
                              bgcolor: '#f4f7fb', borderRadius: 1,
                            }}>
                              <ListItemIcon sx={{ minWidth: 30 }}>
                                <CheckCircle sx={{ color: '#1b6b3a', fontSize: 15 }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={action}
                                primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 500 }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      }
                    />
                  </Grid>
                </Grid>
              </Paper>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Right: Performance sidebar */}
      <Grid item xs={12} md={4}>
        <Card elevation={0} sx={{
          border: `1px solid ${BORDER}`,
          borderLeft: `4px solid #00bcd4`,
          borderRadius: 2,
          height: 'fit-content',
        }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>

            {/* Sidebar header */}
            <Box display="flex" alignItems="center" gap={1.2} mb={2.5}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%',
                bgcolor: 'rgba(0,188,212,0.09)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Speed sx={{ color: '#00bcd4', fontSize: 19 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>
                  Performance IA
                </Typography>
                <Typography variant="caption" color="text.secondary">Temps réel</Typography>
              </Box>
            </Box>

            {stats?.performance ? (
              <Box display="flex" flexDirection="column" gap={1.5}>
                <MetricBox
                  label="Temps traitement IA"
                  accent="#4caf50"
                  caption="TF-IDF + SVM + RF"
                  value={
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#4caf50' }}>
                      {stats.performance.avgProcessingTime || 0.25}s
                    </Typography>
                  }
                />
                <MetricBox
                  label="Taux de succès ML"
                  accent="#2196f3"
                  caption="Classifications réussies"
                  value={
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#2196f3' }}>
                      {stats.performance.successRate || 94}%
                    </Typography>
                  }
                />
                <MetricBox
                  label="Précision globale"
                  accent="#00bcd4"
                  caption="Modèles entraînés"
                  value={
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#00bcd4' }}>
                      {stats.accuracy?.overall || 92}%
                    </Typography>
                  }
                />
                <MetricBox
                  label="Classifications totales"
                  accent="#9c27b0"
                  caption="Données d'apprentissage"
                  value={
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#9c27b0' }}>
                      {stats.totalClassified || 0}
                    </Typography>
                  }
                />
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={28} sx={{ color: NAVY }} />
              </Box>
            )}

            <Divider sx={{ my: 2.5, borderColor: '#e0e7ef' }} />

            <Button
              variant="contained"
              fullWidth
              startIcon={
                isTraining
                  ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                  : <AutoFixHigh />
              }
              onClick={handleTrainModel}
              disabled={isTraining}
              sx={{
                bgcolor: NAVY, fontWeight: 700,
                textTransform: 'none', py: 1.3, borderRadius: 1.5,
                '&:hover': { bgcolor: '#2c5282' },
              }}
            >
              {isTraining ? 'Entraînement ML…' : 'Réentraîner les modèles IA'}
            </Button>

            <Typography variant="caption" color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', mt: 1.2 }}>
              Apprentissage continu avec feedback
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 1 — Stats
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStats = () => (
    <Box>
      {/* Header row */}
      <Box display="flex" alignItems="center" justifyContent="space-between"
        flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5} mb={3}>
        <Box display="flex" alignItems="center" gap={1.2}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: 'rgba(33,150,243,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Analytics sx={{ color: '#2196f3', fontSize: 19 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY }}>
            Analytics &amp; Métriques
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel sx={{ color: NAVY, '&.Mui-focused': { color: NAVY } }}>
            Période
          </InputLabel>
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            label="Période"
            sx={{
              borderRadius: 1.5,
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: NAVY },
            }}
          >
            <MenuItem value="7d">7 jours</MenuItem>
            <MenuItem value="30d">30 jours</MenuItem>
            <MenuItem value="90d">90 jours</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {statsLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={36} sx={{ color: NAVY }} />
        </Box>
      ) : statsError ? (
        <Alert severity="error" sx={{ borderRadius: 2, borderLeft: '4px solid #b71c1c' }}>
          Erreur lors du chargement des statistiques
        </Alert>
      ) : (
        <Grid container spacing={2.5}>
          {/* KPI stat cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Total Classifiées"
              value={stats?.totalClassified || 0}
              accent="#2196f3" iconBg="rgba(33,150,243,0.09)"
              icon={<Assessment />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Précision Globale"
              value={`${stats?.accuracy.overall || 0}%`}
              accent="#4caf50" iconBg="rgba(76,175,80,0.09)"
              icon={<TrendingUp />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Temps Moyen"
              value={`${stats?.performance?.avgProcessingTime || 0}s`}
              accent="#00bcd4" iconBg="rgba(0,188,212,0.09)"
              icon={<Speed />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Taux de Succès"
              value={`${stats?.performance?.successRate || 0}%`}
              accent="#9c27b0" iconBg="rgba(156,39,176,0.09)"
              icon={<CheckCircle />}
            />
          </Grid>

          {/* Category table */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{
              border: `1px solid ${BORDER}`, borderRadius: 2,
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
            }}>
              <CardContent sx={{ p: '20px !important' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}
                  pb={1.5} sx={{ borderBottom: '1px solid #e0e7ef' }}>
                  <Assessment sx={{ color: NAVY, fontSize: 18 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
                    Répartition par Catégorie
                  </Typography>
                </Box>
                <TableContainer sx={{
                  '&::-webkit-scrollbar': { height: 5 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: '#cfd8dc', borderRadius: 3 },
                }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['Catégorie', 'Nombre', 'Précision', 'Tendance'].map((h) => (
                          <TableCell key={h} sx={TH_SX}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(stats?.byCategory || {}).map(([category, count], idx) => {
                        const trend = stats?.trends?.categories?.find(
                          (c) => c.category === category
                        )?.trend || 0;
                        const acc = stats?.accuracy.byCategory?.[category] || 0;
                        return (
                          <TableRow key={category} sx={{
                            bgcolor: idx % 2 === 0 ? '#f4f7fb' : '#fff',
                            '&:hover': { bgcolor: '#e8f0fe' },
                          }}>
                            <TableCell sx={{ borderRight: '1px solid #e0e7ef' }}>
                              <Chip label={category} size="small" sx={{
                                bgcolor: '#e3f2fd', color: '#0d47a1',
                                border: '1px solid #90caf9',
                                fontWeight: 600, fontSize: '0.72rem', borderRadius: 1, height: 22,
                              }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.81rem', fontWeight: 600,
                              color: NAVY, borderRight: '1px solid #e0e7ef' }}>
                              {count as number}
                            </TableCell>
                            <TableCell sx={{ borderRight: '1px solid #e0e7ef' }}>
                              <Chip label={`${acc}%`} size="small" sx={{
                                ...confidenceChipSx(acc),
                                fontWeight: 700, fontSize: '0.72rem', borderRadius: 1, height: 22,
                              }} />
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <TrendingUp
                                  fontSize="small"
                                  sx={{
                                    color: trend > 0 ? '#1b6b3a' : '#b71c1c',
                                    transform: trend > 0 ? 'none' : 'rotate(180deg)',
                                  }}
                                />
                                <Typography variant="caption"
                                  sx={{ fontWeight: 600,
                                        color: trend > 0 ? '#1b6b3a' : '#b71c1c' }}>
                                  {Math.abs(trend)}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Priority table */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{
              border: `1px solid ${BORDER}`, borderRadius: 2,
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
            }}>
              <CardContent sx={{ p: '20px !important' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}
                  pb={1.5} sx={{ borderBottom: '1px solid #e0e7ef' }}>
                  <Speed sx={{ color: NAVY, fontSize: 18 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
                    Répartition par Priorité
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['Priorité', 'Nombre', 'Pourcentage', 'Précision'].map((h) => (
                          <TableCell key={h} sx={TH_SX}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(stats?.byPriority || {}).map(([priority, count], idx) => {
                        const percentage = (stats?.totalClassified && stats.totalClassified > 0)
                          ? ((count as number / stats.totalClassified) * 100).toFixed(1)
                          : '0';
                        const acc = stats?.accuracy.byPriority?.[priority] || 0;
                        return (
                          <TableRow key={priority} sx={{
                            bgcolor: idx % 2 === 0 ? '#f4f7fb' : '#fff',
                            '&:hover': { bgcolor: '#e8f0fe' },
                          }}>
                            <TableCell sx={{ borderRight: '1px solid #e0e7ef' }}>
                              <Chip
                                label={priority.toUpperCase()}
                                size="small"
                                sx={{
                                  ...priorityChipSx(priority),
                                  fontWeight: 700, fontSize: '0.72rem',
                                  borderRadius: 1, height: 22,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.81rem', fontWeight: 600,
                              color: NAVY, borderRight: '1px solid #e0e7ef' }}>
                              {count as number}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.81rem', color: '#546e7a',
                              borderRight: '1px solid #e0e7ef' }}>
                              {percentage}%
                            </TableCell>
                            <TableCell>
                              <Chip label={`${acc}%`} size="small" sx={{
                                ...confidenceChipSx(acc),
                                fontWeight: 700, fontSize: '0.72rem',
                                borderRadius: 1, height: 22,
                              }} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 2 — Recommendations
  // ═══════════════════════════════════════════════════════════════════════════
  const renderRecommendations = () => {
    if (recommendationsLoading) {
      return (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={36} sx={{ color: NAVY }} />
        </Box>
      );
    }

    if (recommendationsError) {
      return (
        <Alert severity="error"
          sx={{ borderRadius: 2, borderLeft: '4px solid #b71c1c' }}>
          Erreur lors du chargement des recommandations IA
        </Alert>
      );
    }

    return (
      <Box>
        {/* Section header */}
        <Box display="flex" alignItems="center" gap={1.2} mb={2.5}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: 'rgba(156,39,176,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Insights sx={{ color: '#9c27b0', fontSize: 19 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>
              Recommandations IA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Basé sur les performances des {selectedPeriod} derniers
              {recommendations?.generatedAt && (
                <> · Généré le {new Date(recommendations.generatedAt).toLocaleString('fr-FR')}</>
              )}
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{
          mb: 3, borderRadius: 1.5,
          bgcolor: '#e3f2fd', border: '1px solid #90caf9',
          borderLeft: '4px solid #0d47a1',
          '& .MuiAlert-icon': { color: '#0d47a1' },
        }}>
          <Typography variant="body2" sx={{ color: '#0d47a1', fontWeight: 500 }}>
            Analyse basée sur les tendances détectées et les métriques de performance du modèle.
          </Typography>
        </Alert>

        <Grid container spacing={2.5}>
          {/* Priority issues accordion */}
          <Grid item xs={12} md={6}>
            <Accordion elevation={0} defaultExpanded sx={{
              border: `1px solid ${BORDER}`,
              borderRadius: '12px !important',
              overflow: 'hidden',
              '&:before': { display: 'none' },
            }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: NAVY }} />}
                sx={{
                  bgcolor: '#f4f7fb',
                  borderBottom: `1px solid #e0e7ef`,
                  '&.Mui-expanded': { bgcolor: '#e8f0fe' },
                  px: 2.5,
                }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning sx={{ color: '#e65100', fontSize: 19 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
                    Améliorations Prioritaires
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <List dense disablePadding>
                  {recommendations?.priorityIssues?.map((issue: any, index: number) => (
                    <ListItem key={index} sx={{
                      px: 2.5, py: 1.2,
                      bgcolor: index % 2 === 0 ? '#f4f7fb' : '#fff',
                      borderBottom: '1px solid #e0e7ef',
                      '&:last-child': { borderBottom: 'none' },
                    }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {issue.severity === 'urgent' ? (
                          <Error sx={{ color: '#b71c1c', fontSize: 17 }} />
                        ) : issue.severity === 'high' ? (
                          <Warning sx={{ color: '#e65100', fontSize: 17 }} />
                        ) : (
                          <Info sx={{ color: '#0d47a1', fontSize: 17 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600, color: NAVY, fontSize: '0.82rem' }}>
                            {issue.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {issue.description} · Impact : {issue.impact}
                          </Typography>
                        }
                      />
                    </ListItem>
                  )) || (
                    <ListItem sx={{ px: 2.5, py: 2 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ color: '#1b6b3a', fontSize: 17 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b6b3a', fontSize: '0.82rem' }}>
                            Aucun problème critique détecté
                          </Typography>
                        }
                        secondary="Le système fonctionne dans les paramètres optimaux"
                      />
                    </ListItem>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Optimizations accordion */}
          <Grid item xs={12} md={6}>
            <Accordion elevation={0} defaultExpanded sx={{
              border: `1px solid ${BORDER}`,
              borderRadius: '12px !important',
              overflow: 'hidden',
              '&:before': { display: 'none' },
            }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: NAVY }} />}
                sx={{
                  bgcolor: '#f4f7fb',
                  borderBottom: `1px solid #e0e7ef`,
                  '&.Mui-expanded': { bgcolor: '#e8f0fe' },
                  px: 2.5,
                }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Lightbulb sx={{ color: '#1b6b3a', fontSize: 19 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
                    Optimisations Suggérées
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <List dense disablePadding>
                  {recommendations?.optimizations?.map((opt: any, index: number) => (
                    <ListItem key={index} sx={{
                      px: 2.5, py: 1.2,
                      bgcolor: index % 2 === 0 ? '#f4f7fb' : '#fff',
                      borderBottom: '1px solid #e0e7ef',
                      '&:last-child': { borderBottom: 'none' },
                    }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {opt.type === 'vocabulary' ? (
                          <CheckCircle sx={{ color: '#1b6b3a', fontSize: 17 }} />
                        ) : opt.type === 'performance' ? (
                          <TrendingUp sx={{ color: '#2196f3', fontSize: 17 }} />
                        ) : (
                          <AutoFixHigh sx={{ color: '#9c27b0', fontSize: 17 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600, color: NAVY, fontSize: '0.82rem' }}>
                            {opt.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {opt.description} · {opt.estimatedImprovement} · Effort : {opt.effort}
                          </Typography>
                        }
                      />
                    </ListItem>
                  )) || (
                    <ListItem sx={{ px: 2.5, py: 2 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <TrendingUp sx={{ color: '#2196f3', fontSize: 17 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600, color: NAVY, fontSize: '0.82rem' }}>
                            Système optimisé
                          </Typography>
                        }
                        secondary="Aucune optimisation majeure requise actuellement"
                      />
                    </ListItem>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Action plan */}
          <Grid item xs={12}>
            <Card elevation={0} sx={{
              border: `1px solid ${BORDER}`, borderRadius: 2,
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
            }}>
              <CardContent sx={{ p: '20px !important' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2.5}
                  pb={1.5} sx={{ borderBottom: '1px solid #e0e7ef' }}>
                  <Assessment sx={{ color: NAVY, fontSize: 18 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
                    Plan d'Action Recommandé
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {/* Urgent */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{
                      p: 2.5, borderRadius: 2,
                      bgcolor: '#fdecea', border: '1px solid #ef9a9a',
                      borderLeft: '4px solid #b71c1c', height: '100%',
                    }}>
                      <Typography variant="subtitle2"
                        sx={{ color: '#b71c1c', fontWeight: 700, mb: 1.5 }}>
                        {recommendations?.actionPlan?.urgent?.title || 'Urgent — Cette semaine'}
                      </Typography>
                      <Typography variant="body2" component="div"
                        sx={{ color: '#546e7a', lineHeight: 1.8 }}>
                        {recommendations?.actionPlan?.urgent?.items?.map((item: string, i: number) => (
                          <Box key={i} display="flex" alignItems="flex-start" gap={0.8} mb={0.5}>
                            <Error sx={{ color: '#b71c1c', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                            <span>{item}</span>
                          </Box>
                        )) || (
                          <>
                            <Box display="flex" alignItems="flex-start" gap={0.8} mb={0.5}>
                              <Error sx={{ color: '#b71c1c', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                              <span>Surveiller les métriques de performance</span>
                            </Box>
                            <Box display="flex" alignItems="flex-start" gap={0.8}>
                              <Error sx={{ color: '#b71c1c', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                              <span>Valider les classifications récentes</span>
                            </Box>
                          </>
                        )}
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Important */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{
                      p: 2.5, borderRadius: 2,
                      bgcolor: '#fff8e1', border: '1px solid #ffcc80',
                      borderLeft: '4px solid #e65100', height: '100%',
                    }}>
                      <Typography variant="subtitle2"
                        sx={{ color: '#e65100', fontWeight: 700, mb: 1.5 }}>
                        {recommendations?.actionPlan?.important?.title || 'Important — Ce mois'}
                      </Typography>
                      <Typography variant="body2" component="div"
                        sx={{ color: '#546e7a', lineHeight: 1.8 }}>
                        {recommendations?.actionPlan?.important?.items?.map((item: string, i: number) => (
                          <Box key={i} display="flex" alignItems="flex-start" gap={0.8} mb={0.5}>
                            <Warning sx={{ color: '#e65100', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                            <span>{item}</span>
                          </Box>
                        )) || (
                          <>
                            <Box display="flex" alignItems="flex-start" gap={0.8} mb={0.5}>
                              <Warning sx={{ color: '#e65100', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                              <span>Enrichir le vocabulaire métier</span>
                            </Box>
                            <Box display="flex" alignItems="flex-start" gap={0.8}>
                              <Warning sx={{ color: '#e65100', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                              <span>Optimiser les temps de traitement</span>
                            </Box>
                          </>
                        )}
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Planned */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{
                      p: 2.5, borderRadius: 2,
                      bgcolor: '#e6f4ed', border: '1px solid #a5d6a7',
                      borderLeft: '4px solid #1b6b3a', height: '100%',
                    }}>
                      <Typography variant="subtitle2"
                        sx={{ color: '#1b6b3a', fontWeight: 700, mb: 1.5 }}>
                        {recommendations?.actionPlan?.planned?.title || 'Planifié — Ce trimestre'}
                      </Typography>
                      <Typography variant="body2" component="div"
                        sx={{ color: '#546e7a', lineHeight: 1.8 }}>
                        {recommendations?.actionPlan?.planned?.items?.map((item: string, i: number) => (
                          <Box key={i} display="flex" alignItems="flex-start" gap={0.8} mb={0.5}>
                            <CheckCircle sx={{ color: '#1b6b3a', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                            <span>{item}</span>
                          </Box>
                        )) || (
                          <>
                            <Box display="flex" alignItems="flex-start" gap={0.8} mb={0.5}>
                              <CheckCircle sx={{ color: '#1b6b3a', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                              <span>Développer la classification multi-langue</span>
                            </Box>
                            <Box display="flex" alignItems="flex-start" gap={0.8}>
                              <CheckCircle sx={{ color: '#1b6b3a', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                              <span>Automatiser le réentraînement</span>
                            </Box>
                          </>
                        )}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Root render
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ bgcolor: '#f4f7fb', minHeight: '100vh', p: { xs: 0, sm: 0 } }}>

      {/* ── Module header ───────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{
        p: { xs: 2.5, sm: 3 }, mb: 3,
        background: `linear-gradient(135deg, ${NAVY} 0%, #2c5282 100%)`,
        color: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2,
      }}>
        <Box display="flex" alignItems="flex-start" gap={1.5}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <SmartToy sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.2px', mb: 0.4 }}>
              Classification IA des Réclamations
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mb: 1.5 }}>
              Système intelligent de classification automatique utilisant l'IA avancée
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {[
                { icon: <Psychology sx={{ fontSize: 14 }} />, label: 'NLP Avancé' },
                { icon: <Assessment sx={{ fontSize: 14 }} />,  label: 'SVM + Random Forest' },
                { icon: <TrendingUp sx={{ fontSize: 14 }} />,  label: 'TF-IDF' },
                { icon: <AutoFixHigh sx={{ fontSize: 14 }} />, label: 'Apprentissage Continu' },
              ].map(({ icon, label }) => (
                <Chip key={label}
                  icon={React.cloneElement(icon, { style: { color: '#fff' } } as any)}
                  label={label}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.30)',
                    fontWeight: 600, fontSize: '0.72rem', height: 24,
                    '& .MuiChip-icon': { color: '#fff' },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Inner tabs ──────────────────────────────────────────────────────── */}
      <Box sx={{
        bgcolor: NAVY_LIGHT, borderBottom: '1px solid #d0dff5',
        borderRadius: '8px 8px 0 0',
        border: `1px solid #d0dff5`, borderBottomColor: 'transparent',
        mb: 0,
      }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={INNER_TAB_SX}
        >
          <Tab label="Test Classification" icon={<Psychology />} iconPosition="start" />
          <Tab label="Analytics & Métriques"  icon={<Analytics />}  iconPosition="start" />
          <Tab label="Recommandations IA"     icon={<Insights />}   iconPosition="start" />
        </Tabs>
      </Box>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{
        border: `1px solid #d0dff5`,
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        p: { xs: 2, sm: 3 },
      }}>
        {activeTab === 0 && renderClassificationTest()}
        {activeTab === 1 && renderStats()}
        {activeTab === 2 && renderRecommendations()}
      </Paper>
    </Box>
  );
};

export default AIClassificationPanel;