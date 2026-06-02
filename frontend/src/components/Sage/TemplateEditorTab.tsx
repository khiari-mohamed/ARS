import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Select, MenuItem,
  FormControl, InputLabel, Alert, Divider, Card, CardContent,
  IconButton, Chip, Stack, Tooltip, Paper, Slider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormControlLabel,
  Stepper, Step, StepLabel, StepContent,
} from '@mui/material';
import {
  Save, Add, Delete, Edit, Upload, DragIndicator,
  Visibility, Code, ArrowBack, ArrowForward, Info,
  HelpOutline, PictureAsPdf, TextSnippet,
  Image as ImageIcon, FormatSize, Margin, ViewCompact,
  CheckCircle, LooksOne, LooksTwo, Looks3, Looks4,
  Close, Description,
} from '@mui/icons-material';

const API   = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const token  = () => localStorage.getItem('token');
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' });

// ─── TXT Field ────────────────────────────────────────────────────────────────
interface FieldDef {
  key:       string;
  label:     string;
  color:     string;
  textColor: string;
  start:     number;
  width:     number;
  sample:    string;
  editable:  boolean;
  fixed:     boolean;
}

// ─── PDF Layout ───────────────────────────────────────────────────────────────
interface PdfLayout {
  pageFormat:        'A4' | 'A3' | 'Letter';
  orientation:       'portrait' | 'landscape';
  marginTop:         number;
  marginBottom:      number;
  marginLeft:        number;
  marginRight:       number;
  headerEnabled:     boolean;
  headerHeight:      number;
  headerText:        string;
  headerFontSize:    number;
  headerAlign:       'left' | 'center' | 'right';
  headerBorder:      boolean;
  logoEnabled:       boolean;
  logoPosition:      'left' | 'center' | 'right';
  logoWidth:         number;
  logoHeight:        number;
  logoPath:          string;
  footerEnabled:     boolean;
  footerHeight:      number;
  footerText:        string;
  footerFontSize:    number;
  footerAlign:       'left' | 'center' | 'right';
  footerPageNumbers: boolean;
  footerBorder:      boolean;
  bodyFontSize:      number;
  bodyFontFamily:    string;
  tableHeaderBg:     string;
  tableRowAlt:       boolean;
  tableRowAltColor:  string;
  tableBorderColor:  string;
}

const DEFAULT_PDF_LAYOUT: PdfLayout = {
  pageFormat: 'A4', orientation: 'portrait',
  marginTop: 20, marginBottom: 20, marginLeft: 15, marginRight: 15,
  headerEnabled: true, headerHeight: 25, headerText: 'ARS GED — Ordre de Virement',
  headerFontSize: 11, headerAlign: 'center', headerBorder: true,
  logoEnabled: false, logoPosition: 'left', logoWidth: 40, logoHeight: 15, logoPath: '',
  footerEnabled: true, footerHeight: 15, footerText: 'Document généré automatiquement par la GED ARS',
  footerFontSize: 8, footerAlign: 'center', footerPageNumbers: true, footerBorder: true,
  bodyFontSize: 9, bodyFontFamily: 'Helvetica',
  tableHeaderBg: '#1e3a5f', tableRowAlt: true, tableRowAltColor: '#f5f8ff', tableBorderColor: '#dde3ef',
};

const DEFAULT_FIELDS: FieldDef[] = [
  { key:'codeJournal',  label:'Code Journal',        color:'#1e3a5f', textColor:'#fff',     start:0,   width:6,  sample:'ATT411',                               editable:true,  fixed:false },
  { key:'date',         label:'Date JJMMAAAA',        color:'#0d47a1', textColor:'#fff',     start:6,   width:8,  sample:'01042026',                             editable:true,  fixed:false },
  { key:'numOrdre',     label:'N° Ordre',             color:'#1565c0', textColor:'#fff',     start:14,  width:5,  sample:'28554',                                editable:true,  fixed:false },
  { key:'padding',      label:'Espaces (fixe)',        color:'#546e7a', textColor:'#cfd8dc', start:19,  width:8,  sample:'        ',                             editable:false, fixed:true  },
  { key:'compte',       label:'Compte (16 chars)',     color:'#6a1b9a', textColor:'#fff',     start:27,  width:16, sample:'53220900        ',                     editable:true,  fixed:false },
  { key:'libelle',      label:'Libellé ORDV (35c)',    color:'#4a148c', textColor:'#e1bee7', start:43,  width:35, sample:'ORDV GM N: 28554                   ',   editable:true,  fixed:false },
  { key:'refCHQ',       label:'CHQ+Date+D/C (12c)',    color:'#880e4f', textColor:'#fff',     start:78,  width:12, sample:'CHQ01042026C',                         editable:true,  fixed:false },
  { key:'montant',      label:'Montant (20c)',          color:'#b71c1c', textColor:'#fff',     start:90,  width:20, sample:'1118,732            ',                 editable:true,  fixed:false },
  { key:'numRepeat',    label:'N° Ordre répété (17c)', color:'#e65100', textColor:'#fff',     start:110, width:17, sample:'28554            ',                    editable:true,  fixed:false },
  { key:'libelleCompl', label:'GM: Label (23c)',        color:'#2e7d32', textColor:'#fff',     start:127, width:23, sample:'GM: PGH02-2026 UNOVMARS',             editable:true,  fixed:false },
];

interface Template {
  id?:       string;
  name:      string;
  type:      'TXT' | 'PDF';
  structure: { fields?: FieldDef[]; lineFormat?: string; pdfLayout?: PdfLayout; };
  isDefault?: boolean;
}

function totalChars(fields: FieldDef[]) {
  return fields.reduce((m, f) => Math.max(m, f.start + f.width), 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT
// ═══════════════════════════════════════════════════════════════════════════════
const Segment: React.FC<{ field: FieldDef; selected: boolean; onSelect: () => void; charWidth: number }> = ({ field, selected, onSelect, charWidth }) => (
  <Tooltip title={`${field.label} | début: ${field.start} | largeur: ${field.width}`} placement="top" arrow>
    <Box onClick={onSelect} sx={{
      position: 'absolute', left: field.start * charWidth, width: field.width * charWidth - 1, height: '100%',
      bgcolor: field.color, cursor: field.editable ? 'pointer' : 'default',
      border: selected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
      borderRadius: selected ? '3px' : '2px', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      transition: 'box-shadow 0.15s, border 0.15s',
      boxShadow: selected ? '0 0 0 3px rgba(255,255,255,0.5)' : 'none', zIndex: selected ? 2 : 1,
      '&:hover': field.editable ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.7)', zIndex: 3 } : {},
    }}>
      {field.width * charWidth > 30 && (
        <Typography variant="caption" sx={{ color: field.textColor, fontSize: '0.6rem', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', px: 0.5, userSelect: 'none' }}>
          {field.label}
        </Typography>
      )}
    </Box>
  </Tooltip>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PDF PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════
const PdfPreview: React.FC<{ layout: PdfLayout }> = ({ layout }) => {
  const isLandscape = layout.orientation === 'landscape';
  const W = isLandscape ? 280 : 198;
  const H = isLandscape ? 198 : 280;
  const S = 1.6;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Box sx={{ width: W * S, height: H * S, bgcolor: '#fff', border: '1px solid #c0c0c0', boxShadow: '4px 4px 12px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
        {/* Margin guide */}
        <Box sx={{ position: 'absolute', top: layout.marginTop * S, left: layout.marginLeft * S, right: layout.marginRight * S, bottom: layout.marginBottom * S, border: '1px dashed #cce0ff', pointerEvents: 'none' }} />

        {/* Header */}
        {layout.headerEnabled && (
          <Box sx={{ position: 'absolute', top: layout.marginTop * S, left: layout.marginLeft * S, right: layout.marginRight * S, height: layout.headerHeight * S, bgcolor: '#f0f4ff', borderBottom: layout.headerBorder ? '1.5px solid #1e3a5f' : 'none', display: 'flex', alignItems: 'center', justifyContent: layout.headerAlign === 'center' ? 'center' : layout.headerAlign === 'right' ? 'flex-end' : 'flex-start', px: 1, gap: 0.5 }}>
            {layout.logoEnabled && layout.logoPosition === 'left' && (
              layout.logoPath ? (
                <Box component="img" src={layout.logoPath} sx={{ maxWidth: layout.logoWidth * S * 0.4, maxHeight: layout.logoHeight * S * 0.4, objectFit: 'contain' }} />
              ) : (
                <Box sx={{ width: layout.logoWidth * S * 0.4, height: layout.logoHeight * S * 0.4, bgcolor: '#dde3ef', borderRadius: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon sx={{ fontSize: '0.6rem', color: '#546e7a' }} />
                </Box>
              )
            )}
            <Typography sx={{ fontSize: Math.max(5, layout.headerFontSize * 0.5) + 'px', fontWeight: 700, color: '#1e3a5f', fontFamily: 'sans-serif' }}>
              {layout.headerText || 'En-tête'}
            </Typography>
            {layout.logoEnabled && layout.logoPosition === 'right' && (
              layout.logoPath ? (
                <Box component="img" src={layout.logoPath} sx={{ maxWidth: layout.logoWidth * S * 0.4, maxHeight: layout.logoHeight * S * 0.4, objectFit: 'contain' }} />
              ) : (
                <Box sx={{ width: layout.logoWidth * S * 0.4, height: layout.logoHeight * S * 0.4, bgcolor: '#dde3ef', borderRadius: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon sx={{ fontSize: '0.6rem', color: '#546e7a' }} />
                </Box>
              )
            )}
          </Box>
        )}

        {/* Body */}
        <Box sx={{ position: 'absolute', top: (layout.marginTop + (layout.headerEnabled ? layout.headerHeight : 0)) * S + 4, left: layout.marginLeft * S, right: layout.marginRight * S, bottom: (layout.marginBottom + (layout.footerEnabled ? layout.footerHeight : 0)) * S + 4, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', bgcolor: layout.tableHeaderBg, mb: 0.3 }}>
            {['N° Ordre', 'Date', 'Client', 'Montant', 'Statut'].map((col, i) => (
              <Box key={i} sx={{ flex: i === 2 ? 2 : 1, px: 0.5, py: 0.3 }}>
                <Typography sx={{ fontSize: '4px', color: '#fff', fontWeight: 700, fontFamily: 'sans-serif' }}>{col}</Typography>
              </Box>
            ))}
          </Box>
          {[0, 1, 2, 3, 4, 5, 6].map(r => (
            <Box key={r} sx={{ display: 'flex', bgcolor: layout.tableRowAlt && r % 2 === 1 ? layout.tableRowAltColor : '#fff', borderBottom: `0.5px solid ${layout.tableBorderColor}` }}>
              {[0, 1, 2, 3, 4].map((c, i) => (
                <Box key={c} sx={{ flex: i === 2 ? 2 : 1, px: 0.5, py: 0.25 }}>
                  <Box sx={{ height: 3, bgcolor: '#d0d8e8', borderRadius: 0.5, width: ['60%', '70%', '85%', '55%', '50%'][i] }} />
                </Box>
              ))}
            </Box>
          ))}
        </Box>

        {/* Footer */}
        {layout.footerEnabled && (
          <Box sx={{ position: 'absolute', bottom: layout.marginBottom * S, left: layout.marginLeft * S, right: layout.marginRight * S, height: layout.footerHeight * S, bgcolor: '#f8faff', borderTop: layout.footerBorder ? '1.5px solid #dde3ef' : 'none', display: 'flex', alignItems: 'center', px: 1, gap: 2 }}>
            <Typography sx={{ fontSize: '4px', color: '#546e7a', fontFamily: 'sans-serif', flex: 1, textAlign: layout.footerAlign }}>
              {layout.footerText}
            </Typography>
            {layout.footerPageNumbers && (
              <Typography sx={{ fontSize: '4px', color: '#546e7a', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>Page 1/1</Typography>
            )}
          </Box>
        )}

        <Box sx={{ position: 'absolute', top: 2, right: 4 }}>
          <Typography sx={{ fontSize: '5px', color: '#90a4ae', fontFamily: 'monospace' }}>
            {layout.pageFormat} {layout.orientation === 'landscape' ? 'Paysage' : 'Portrait'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PDF CONFIG PANEL
// ═══════════════════════════════════════════════════════════════════════════════
const PdfConfigPanel: React.FC<{ layout: PdfLayout; onChange: (p: Partial<PdfLayout>) => void; editMode: boolean }> = ({ layout, onChange, editMode }) => {
  const SH: React.FC<{ icon: React.ReactNode; title: string; sub?: string }> = ({ icon, title, sub }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.2, bgcolor: '#f0f4ff', borderBottom: '1px solid #dde3ef' }}>
      <Box sx={{ color: '#1e3a5f' }}>{icon}</Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
    </Box>
  );

  const LF: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>{label}</Typography>
      {children}
    </Box>
  );

  return (
    <Grid container spacing={2.5}>
      {/* Left: config */}
      <Grid item xs={12} md={7}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Mise en page */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2, overflow: 'hidden' }}>
            <SH icon={<ViewCompact />} title="Mise en page" sub="Format, orientation, marges (mm)" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <LF label="Format de page">
                    <FormControl fullWidth size="small" disabled={!editMode}>
                      <Select value={layout.pageFormat} onChange={e => onChange({ pageFormat: e.target.value as any })}>
                        <MenuItem value="A4">A4 (210×297 mm)</MenuItem>
                        <MenuItem value="A3">A3 (297×420 mm)</MenuItem>
                        <MenuItem value="Letter">Letter (216×279 mm)</MenuItem>
                      </Select>
                    </FormControl>
                  </LF>
                </Grid>
                <Grid item xs={6}>
                  <LF label="Orientation">
                    <FormControl fullWidth size="small" disabled={!editMode}>
                      <Select value={layout.orientation} onChange={e => onChange({ orientation: e.target.value as any })}>
                        <MenuItem value="portrait">Portrait (vertical)</MenuItem>
                        <MenuItem value="landscape">Paysage (horizontal)</MenuItem>
                      </Select>
                    </FormControl>
                  </LF>
                </Grid>
                {([['marginTop','Haut'],['marginBottom','Bas'],['marginLeft','Gauche'],['marginRight','Droite']] as [keyof PdfLayout, string][]).map(([k, l]) => (
                  <Grid item xs={6} key={k as string}>
                    <LF label={`Marge ${l} (mm)`}>
                      <TextField size="small" type="number" fullWidth disabled={!editMode}
                        value={layout[k] as number}
                        onChange={e => onChange({ [k]: parseInt(e.target.value) || 0 } as any)}
                        inputProps={{ min: 0, max: 50 }} />
                    </LF>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* En-tête */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2, overflow: 'hidden' }}>
            <SH icon={<Description />} title="En-tête" sub="Texte, police, alignement, bordure" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel control={<Switch checked={layout.headerEnabled} disabled={!editMode} size="small" onChange={e => onChange({ headerEnabled: e.target.checked })} />}
                    label={<Typography variant="body2" fontWeight={600}>Activer l'en-tête</Typography>} />
                </Grid>
                {layout.headerEnabled && <>
                  <Grid item xs={12}>
                    <LF label="Texte de l'en-tête">
                      <TextField size="small" fullWidth disabled={!editMode} value={layout.headerText} onChange={e => onChange({ headerText: e.target.value })} placeholder="Ex: ARS GED — Ordre de Virement" />
                    </LF>
                  </Grid>
                  <Grid item xs={4}><LF label="Hauteur (mm)"><TextField size="small" type="number" fullWidth disabled={!editMode} value={layout.headerHeight} onChange={e => onChange({ headerHeight: parseInt(e.target.value) || 10 })} inputProps={{ min: 5, max: 60 }} /></LF></Grid>
                  <Grid item xs={4}><LF label="Taille police (pt)"><TextField size="small" type="number" fullWidth disabled={!editMode} value={layout.headerFontSize} onChange={e => onChange({ headerFontSize: parseInt(e.target.value) || 10 })} inputProps={{ min: 6, max: 24 }} /></LF></Grid>
                  <Grid item xs={4}>
                    <LF label="Alignement">
                      <FormControl fullWidth size="small" disabled={!editMode}>
                        <Select value={layout.headerAlign} onChange={e => onChange({ headerAlign: e.target.value as any })}>
                          <MenuItem value="left">Gauche</MenuItem><MenuItem value="center">Centre</MenuItem><MenuItem value="right">Droite</MenuItem>
                        </Select>
                      </FormControl>
                    </LF>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel control={<Switch checked={layout.headerBorder} disabled={!editMode} size="small" onChange={e => onChange({ headerBorder: e.target.checked })} />}
                      label={<Typography variant="body2">Ligne de séparation sous l'en-tête</Typography>} />
                  </Grid>
                </>}
              </Grid>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2, overflow: 'hidden' }}>
            <SH icon={<ImageIcon />} title="Logo" sub="Image, position, dimensions" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel control={<Switch checked={layout.logoEnabled} disabled={!editMode} size="small" onChange={e => onChange({ logoEnabled: e.target.checked })} />}
                    label={<Typography variant="body2" fontWeight={600}>Afficher le logo</Typography>} />
                </Grid>
                {layout.logoEnabled && <>
                  <Grid item xs={12}>
                    <LF label="Logo (PNG, JPG ou SVG)">
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                          variant="outlined"
                          component="label"
                          disabled={!editMode}
                          startIcon={<Upload />}
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        >
                          Télécharger Logo
                          <input
                            type="file"
                            hidden
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  onChange({ logoPath: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </Button>
                        {layout.logoPath && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              component="img"
                              src={layout.logoPath}
                              sx={{ maxHeight: 40, maxWidth: 80, border: '1px solid #dde3ef', borderRadius: 1 }}
                            />
                            <IconButton
                              size="small"
                              disabled={!editMode}
                              onClick={() => onChange({ logoPath: '' })}
                              sx={{ color: '#b71c1c' }}
                            >
                              <Delete sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </LF>
                  </Grid>
                  <Grid item xs={4}>
                    <LF label="Position">
                      <FormControl fullWidth size="small" disabled={!editMode}>
                        <Select value={layout.logoPosition} onChange={e => onChange({ logoPosition: e.target.value as any })}>
                          <MenuItem value="left">Gauche</MenuItem><MenuItem value="center">Centre</MenuItem><MenuItem value="right">Droite</MenuItem>
                        </Select>
                      </FormControl>
                    </LF>
                  </Grid>
                  <Grid item xs={4}><LF label="Largeur (mm)"><TextField size="small" type="number" fullWidth disabled={!editMode} value={layout.logoWidth} onChange={e => onChange({ logoWidth: parseInt(e.target.value) || 30 })} inputProps={{ min: 5, max: 100 }} /></LF></Grid>
                  <Grid item xs={4}><LF label="Hauteur (mm)"><TextField size="small" type="number" fullWidth disabled={!editMode} value={layout.logoHeight} onChange={e => onChange({ logoHeight: parseInt(e.target.value) || 15 })} inputProps={{ min: 5, max: 60 }} /></LF></Grid>
                </>}
              </Grid>
            </CardContent>
          </Card>

          {/* Corps */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2, overflow: 'hidden' }}>
            <SH icon={<FormatSize />} title="Corps du document" sub="Police, tableau, couleurs" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <LF label="Police">
                    <FormControl fullWidth size="small" disabled={!editMode}>
                      <Select value={layout.bodyFontFamily} onChange={e => onChange({ bodyFontFamily: e.target.value })}>
                        <MenuItem value="Helvetica">Helvetica</MenuItem>
                        <MenuItem value="Times-Roman">Times Roman</MenuItem>
                        <MenuItem value="Courier">Courier (monospace)</MenuItem>
                      </Select>
                    </FormControl>
                  </LF>
                </Grid>
                <Grid item xs={6}>
                  <LF label="Taille corps (pt)">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField size="small" type="number" disabled={!editMode} value={layout.bodyFontSize} onChange={e => onChange({ bodyFontSize: parseInt(e.target.value) || 9 })} inputProps={{ min: 6, max: 16 }} sx={{ width: 70 }} />
                      <Slider size="small" value={layout.bodyFontSize} min={6} max={16} step={1} disabled={!editMode} onChange={(_, v) => onChange({ bodyFontSize: v as number })} sx={{ flex: 1, color: '#6a1b9a' }} />
                    </Box>
                  </LF>
                </Grid>
                <Grid item xs={6}>
                  <LF label="Couleur en-tête tableau">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box component="input" type="color" value={layout.tableHeaderBg} disabled={!editMode} onChange={(e: any) => onChange({ tableHeaderBg: e.target.value })}
                        style={{ width: 36, height: 32, border: '1px solid #dde3ef', borderRadius: 4, cursor: editMode ? 'pointer' : 'not-allowed', padding: 2 }} />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#546e7a', fontSize: '0.78rem' }}>{layout.tableHeaderBg}</Typography>
                    </Box>
                  </LF>
                </Grid>
                <Grid item xs={6}>
                  <LF label="Couleur bordure tableau">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box component="input" type="color" value={layout.tableBorderColor} disabled={!editMode} onChange={(e: any) => onChange({ tableBorderColor: e.target.value })}
                        style={{ width: 36, height: 32, border: '1px solid #dde3ef', borderRadius: 4, cursor: editMode ? 'pointer' : 'not-allowed', padding: 2 }} />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#546e7a', fontSize: '0.78rem' }}>{layout.tableBorderColor}</Typography>
                    </Box>
                  </LF>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel control={<Switch checked={layout.tableRowAlt} disabled={!editMode} size="small" onChange={e => onChange({ tableRowAlt: e.target.checked })} />}
                    label={<Typography variant="body2">Lignes alternées (zèbre)</Typography>} />
                  {layout.tableRowAlt && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Box component="input" type="color" value={layout.tableRowAltColor} disabled={!editMode} onChange={(e: any) => onChange({ tableRowAltColor: e.target.value })}
                        style={{ width: 36, height: 32, border: '1px solid #dde3ef', borderRadius: 4, cursor: editMode ? 'pointer' : 'not-allowed', padding: 2 }} />
                      <Typography variant="caption" color="text.secondary">Couleur des lignes paires</Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Pied de page */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2, overflow: 'hidden' }}>
            <SH icon={<Margin />} title="Pied de page" sub="Texte, numérotation, bordure" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel control={<Switch checked={layout.footerEnabled} disabled={!editMode} size="small" onChange={e => onChange({ footerEnabled: e.target.checked })} />}
                    label={<Typography variant="body2" fontWeight={600}>Activer le pied de page</Typography>} />
                </Grid>
                {layout.footerEnabled && <>
                  <Grid item xs={12}>
                    <LF label="Texte du pied de page">
                      <TextField size="small" fullWidth disabled={!editMode} value={layout.footerText} onChange={e => onChange({ footerText: e.target.value })} placeholder="Ex: Document généré automatiquement par la GED ARS" />
                    </LF>
                  </Grid>
                  <Grid item xs={4}><LF label="Hauteur (mm)"><TextField size="small" type="number" fullWidth disabled={!editMode} value={layout.footerHeight} onChange={e => onChange({ footerHeight: parseInt(e.target.value) || 10 })} inputProps={{ min: 5, max: 40 }} /></LF></Grid>
                  <Grid item xs={4}><LF label="Taille police (pt)"><TextField size="small" type="number" fullWidth disabled={!editMode} value={layout.footerFontSize} onChange={e => onChange({ footerFontSize: parseInt(e.target.value) || 8 })} inputProps={{ min: 6, max: 14 }} /></LF></Grid>
                  <Grid item xs={4}>
                    <LF label="Alignement">
                      <FormControl fullWidth size="small" disabled={!editMode}>
                        <Select value={layout.footerAlign} onChange={e => onChange({ footerAlign: e.target.value as any })}>
                          <MenuItem value="left">Gauche</MenuItem><MenuItem value="center">Centre</MenuItem><MenuItem value="right">Droite</MenuItem>
                        </Select>
                      </FormControl>
                    </LF>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={layout.footerPageNumbers} disabled={!editMode} size="small" onChange={e => onChange({ footerPageNumbers: e.target.checked })} />}
                      label={<Typography variant="body2">Numérotation des pages (Page X/Y)</Typography>} />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={layout.footerBorder} disabled={!editMode} size="small" onChange={e => onChange({ footerBorder: e.target.checked })} />}
                      label={<Typography variant="body2">Ligne de séparation</Typography>} />
                  </Grid>
                </>}
              </Grid>
            </CardContent>
          </Card>
        </Box>
      </Grid>

      {/* Right: live PDF preview */}
      <Grid item xs={12} md={5}>
        <Box sx={{ position: 'sticky', top: 16 }}>
          <Card elevation={0} sx={{ border: '2px solid #6A1B9A22', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.2, bgcolor: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 1 }}>
              <PictureAsPdf sx={{ color: '#ef9a9a', fontSize: '1rem' }} />
              <Typography variant="subtitle2" sx={{ color: '#e3f2fd', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Aperçu PDF en temps réel
              </Typography>
            </Box>
            <CardContent sx={{ bgcolor: '#e8edf5' }}>
              <PdfPreview layout={layout} />
              <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {[
                  { label: `${layout.pageFormat} ${layout.orientation === 'portrait' ? 'Portrait' : 'Paysage'}`, color: '#1e3a5f' },
                  { label: `Marges ${layout.marginTop}/${layout.marginLeft}mm`, color: '#6a1b9a' },
                  { label: `Corps ${layout.bodyFontSize}pt`, color: '#0d47a1' },
                  layout.headerEnabled && { label: 'En-tête ✓', color: '#2e7d32' },
                  layout.footerEnabled && { label: 'Pied ✓', color: '#2e7d32' },
                  layout.logoEnabled   && { label: 'Logo ✓',  color: '#e65100' },
                ].filter(Boolean).map((t: any, i) => (
                  <Chip key={i} label={t.label} size="small" sx={{ bgcolor: t.color + '18', color: t.color, fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Grid>
    </Grid>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELP GUIDE DIALOG (French)
// ═══════════════════════════════════════════════════════════════════════════════
const HelpGuideDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [tab, setTab] = useState<'txt' | 'pdf'>('txt');

  const txtSteps = [
    {
      icon: <LooksOne sx={{ color: '#1e3a5f', fontSize: '1.4rem' }} />,
      title: 'Créer ou importer un template TXT',
      body: (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Cliquez sur <strong>« Nouveau »</strong> pour créer un template vierge, ou sur <strong>« Importer »</strong> pour charger un fichier <code>.txt</code> Sage existant.
          </Typography>
          <Alert severity="info" sx={{ mt: 1, fontSize: '0.78rem', borderRadius: 1.5 }}>
            💡 Si vous importez un vrai fichier TXT Sage (ex: <code>2026ORDRE_DE_VIRMENT…TXT</code>), le système détecte automatiquement les positions de tous les champs et remplit l'aperçu.
          </Alert>
        </Box>
      ),
    },
    {
      icon: <LooksTwo sx={{ color: '#6A1B9A', fontSize: '1.4rem' }} />,
      title: 'Lire la règle visuelle colorée',
      body: (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            La <strong>règle colorée</strong> représente une ligne TXT complète (150 caractères). Chaque bloc de couleur est un champ. Les numéros au-dessus indiquent les colonnes.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mt: 1, mb: 1 }}>
            {[{ c: '#1e3a5f', l: 'Code Journal (6c)' }, { c: '#0d47a1', l: 'Date (8c)' }, { c: '#6a1b9a', l: 'Compte (16c)' }, { c: '#880e4f', l: 'CHQ+D/C (12c)' }, { c: '#b71c1c', l: 'Montant (20c)' }, { c: '#2e7d32', l: 'GM: Label (23c)' }].map(f => (
              <Chip key={f.c} label={f.l} size="small" sx={{ bgcolor: f.c, color: '#fff', fontSize: '0.65rem', fontWeight: 700 }} />
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary">
            En dessous, la <strong>ligne verte monospace</strong> est exactement ce qui sera écrit dans le fichier .TXT.
          </Typography>
        </Box>
      ),
    },
    {
      icon: <Looks3 sx={{ color: '#b71c1c', fontSize: '1.4rem' }} />,
      title: 'Sélectionner et éditer un champ',
      body: (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Cliquez sur un bloc coloré</strong> dans la règle — un panneau d'édition apparaît avec :
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, mt: 0.5, mb: 0 }}>
            {[
              '← → Position de début (colonne de départ du champ)',
              'Largeur : nombre de caractères (modifiable avec le slider)',
              'Valeur exemple : ce qui s\'affiche dans l\'aperçu vert',
              'Boutons de décalage rapide : −10, −5, −1, +1, +5, +10 colonnes',
            ].map((t, i) => (
              <Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{t}</Typography>
            ))}
          </Box>
          <Alert severity="success" sx={{ mt: 1, fontSize: '0.78rem', borderRadius: 1.5 }}>
            ✅ L'aperçu se met à jour <strong>instantanément</strong> à chaque modification.
          </Alert>
        </Box>
      ),
    },
    {
      icon: <Looks4 sx={{ color: '#2e7d32', fontSize: '1.4rem' }} />,
      title: 'Enregistrer le template',
      body: (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Cliquez d'abord sur <strong>« Modifier »</strong> pour activer l'édition. Faites vos modifications, puis cliquez sur <strong>« Enregistrer »</strong>.
          </Typography>
          <Alert severity="warning" sx={{ mt: 1, fontSize: '0.78rem', borderRadius: 1.5 }}>
            ⚠️ Le format TXT Sage est <strong>strict</strong> — chaque champ a une position fixe. Ne changez les positions que si la Finance vous fournit un nouveau modèle.
          </Alert>
        </Box>
      ),
    },
  ];

  const pdfSteps = [
    {
      icon: <LooksOne sx={{ color: '#1e3a5f', fontSize: '1.4rem' }} />,
      title: 'Créer un template PDF',
      body: (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Cliquez sur <strong>« Nouveau »</strong> puis changez le type sur <strong>PDF</strong> dans le menu déroulant. Le panneau de configuration PDF s'affiche automatiquement.
          </Typography>
          <Alert severity="info" sx={{ mt: 1, fontSize: '0.78rem', borderRadius: 1.5 }}>
            💡 L'aperçu de la page (à droite) reflète chaque changement en temps réel — pas besoin de générer un fichier pour voir le résultat.
          </Alert>
        </Box>
      ),
    },
    {
      icon: <LooksTwo sx={{ color: '#6A1B9A', fontSize: '1.4rem' }} />,
      title: 'Configurer la mise en page',
      body: (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>Dans la section <strong>« Mise en page »</strong> :</Typography>
          <Box component="ul" sx={{ pl: 2.5, mt: 0.5, mb: 0 }}>
            {['Format : A4 (standard), A3 (grand format), Letter (USA)', 'Orientation : Portrait (vertical) ou Paysage (horizontal)', 'Marges : espaces autour du contenu en millimètres (haut, bas, gauche, droite)'].map((t, i) => (
              <Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{t}</Typography>
            ))}
          </Box>
        </Box>
      ),
    },
    {
      icon: <Looks3 sx={{ color: '#b71c1c', fontSize: '1.4rem' }} />,
      title: 'Configurer l\'en-tête et le logo',
      body: (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Dans <strong>« En-tête »</strong> : activez l'en-tête, saisissez le texte (ex: <em>ARS GED — Ordre de Virement</em>), choisissez l'alignement et la taille de police.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Dans <strong>« Logo »</strong> : activez le logo, indiquez le chemin de votre image (PNG ou SVG), choisissez sa position (gauche / centre / droite) et sa taille en millimètres.
          </Typography>
        </Box>
      ),
    },
    {
      icon: <Looks4 sx={{ color: '#2e7d32', fontSize: '1.4rem' }} />,
      title: 'Configurer le corps et le pied de page',
      body: (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Dans <strong>« Corps »</strong> : choisissez la police (Helvetica recommandé), la taille de texte, la couleur de l'en-tête du tableau et activez les lignes alternées (zèbre) pour la lisibilité.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Dans <strong>« Pied de page »</strong> : saisissez le texte, activez la numérotation automatique des pages (Page 1/N) et la ligne de séparation.
          </Typography>
          <Alert severity="success" sx={{ mt: 1, fontSize: '0.78rem', borderRadius: 1.5 }}>
            ✅ Cliquez sur <strong>« Enregistrer »</strong> — le template PDF sera disponible lors de la génération des documents.
          </Alert>
        </Box>
      ),
    },
  ];

  const steps = tab === 'txt' ? txtSteps : pdfSteps;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ bgcolor: '#1e3a5f', p: 0 }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <HelpOutline sx={{ color: '#90caf9', fontSize: '1.4rem' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Guide d'utilisation — Templates</Typography>
              <Typography variant="caption" sx={{ color: '#90caf9' }}>Comment configurer un template TXT Sage ou PDF</Typography>
            </Box>
            <IconButton onClick={onClose} sx={{ color: '#90caf9', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}><Close /></IconButton>
          </Box>
          {/* Tabs */}
          <Box sx={{ display: 'flex', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
            {[{ k: 'txt', icon: <TextSnippet sx={{ fontSize: '1rem' }} />, label: 'Template TXT Sage' }, { k: 'pdf', icon: <PictureAsPdf sx={{ fontSize: '1rem' }} />, label: 'Template PDF' }].map(t => (
              <Box key={t.k} onClick={() => setTab(t.k as any)}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 3, py: 1.3, cursor: 'pointer', borderBottom: tab === t.k ? '3px solid #90caf9' : '3px solid transparent', color: tab === t.k ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: tab === t.k ? 700 : 400, fontSize: '0.85rem', transition: 'all 0.2s', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}>
                {t.icon} {t.label}
              </Box>
            ))}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          <Stepper orientation="vertical" nonLinear>
            {steps.map((step, i) => (
              <Step key={i} active expanded>
                <StepLabel StepIconComponent={() => step.icon}
                  sx={{ '& .MuiStepLabel-label': { fontWeight: 700, color: '#1e3a5f', fontSize: '0.92rem' } }}>
                  {step.title}
                </StepLabel>
                <StepContent>
                  <Box sx={{ mt: 0.5, mb: 1 }}>{step.body}</Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <CheckCircle sx={{ color: '#2e7d32', mt: 0.2, flexShrink: 0 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 0.3 }}>Bonne pratique</Typography>
                <Typography variant="body2" color="text.secondary">
                  {tab === 'txt'
                    ? 'Importez toujours un vrai fichier TXT produit par Sage comme référence. Le système analyse automatiquement les positions exactes de chaque champ et pré-remplit le template — vous n\'aurez qu\'à vérifier et enregistrer.'
                    : 'Commencez par le format et les marges, puis l\'en-tête, puis le pied de page. L\'aperçu visuel à droite vous permet de valider la mise en page sans générer de document.'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e8edf5' }}>
        <Button onClick={onClose} variant="contained" sx={{ fontWeight: 700, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#163059' }, px: 4 }}>
          J'ai compris
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const TemplateEditorTab: React.FC = () => {
  const [templates,        setTemplates]        = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editMode,         setEditMode]         = useState(false);
  const [importError,      setImportError]      = useState<string | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [charWidth,        setCharWidth]        = useState(8);
  const [helpOpen,         setHelpOpen]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const monoRef      = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (monoRef.current) {
      const w = monoRef.current.getBoundingClientRect().width;
      if (w > 0) setCharWidth(w);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${API}/finance/sage/templates`, { headers: headers() });
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
      setTemplates([]);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const url = selectedTemplate.id ? `${API}/finance/sage/templates/${selectedTemplate.id}` : `${API}/finance/sage/templates`;
      const res = await fetch(url, { 
        method: selectedTemplate.id ? 'PUT' : 'POST', 
        headers: headers(), 
        body: JSON.stringify(selectedTemplate) 
      });
      if (!res.ok) throw new Error('Failed to save template');
      await loadTemplates();
      setEditMode(false);
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Erreur lors de l\'enregistrement du template');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`${API}/finance/sage/templates/${id}/set-default`, {
        method: 'POST',
        headers: headers(),
      });
      if (!res.ok) throw new Error('Failed to set default');
      await loadTemplates();
      alert('✅ Template défini comme défaut');
    } catch (err) {
      console.error('Error setting default:', err);
      alert('Erreur lors de la définition du template par défaut');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    try {
      const res = await fetch(`${API}/finance/sage/templates/${id}`, { 
        method: 'DELETE', 
        headers: headers() 
      });
      if (!res.ok) throw new Error('Failed to delete template');
      await loadTemplates();
      setSelectedTemplate(null);
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Erreur lors de la suppression du template');
    }
  };

  const createNewTemplate = () => {
    setSelectedTemplate({ name: 'Nouveau Template', type: 'TXT', structure: { fields: DEFAULT_FIELDS.map(f => ({ ...f })), lineFormat: 'FIXED_WIDTH' } });
    setEditMode(true); setSelectedFieldKey(null);
  };

  const handleImportClick = () => { setImportError(null); fileInputRef.current?.click(); };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setImportError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fields: FieldDef[] = [];
      if (ext === 'txt' || ext === 'asc') {
        const text = await file.text(); const lines = text.split('\n').filter(l => l.trim());
        if (!lines.length) throw new Error('Fichier vide');
        fields = parseTxtLine(lines[0]);
      } else { fields = DEFAULT_FIELDS.map(f => ({ ...f })); }
      setSelectedTemplate({ name: file.name.replace(/\.[^/.]+$/, ''), type: 'TXT', structure: { fields, lineFormat: 'FIXED_WIDTH' } });
      setEditMode(true); setSelectedFieldKey(null);
    } catch (err: any) { setImportError(`Erreur import: ${err.message}`); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseTxtLine = (line: string): FieldDef[] => {
    const F = DEFAULT_FIELDS.map(f => ({ ...f }));
    if (/^[A-Z]{3}\d{3}/.test(line)) F.find(f => f.key === 'codeJournal')!.sample = line.substring(0, 6);
    if (/^\d{8}$/.test(line.substring(6, 14))) F.find(f => f.key === 'date')!.sample = line.substring(6, 14);
    F.find(f => f.key === 'numOrdre')!.sample     = line.substring(14, 19);
    F.find(f => f.key === 'compte')!.sample       = line.substring(27, 43);
    F.find(f => f.key === 'libelle')!.sample      = line.substring(43, 78);
    F.find(f => f.key === 'refCHQ')!.sample       = line.substring(78, 90);
    F.find(f => f.key === 'montant')!.sample      = line.substring(90, 110);
    F.find(f => f.key === 'numRepeat')!.sample    = line.substring(110, 127);
    F.find(f => f.key === 'libelleCompl')!.sample = line.substring(127, 150);
    return F;
  };

  const updateField = useCallback((key: string, patch: Partial<FieldDef>) => {
    if (!selectedTemplate?.structure.fields) return;
    setSelectedTemplate(prev => {
      if (!prev?.structure.fields) return prev;
      return { ...prev, structure: { ...prev.structure, fields: prev.structure.fields.map(f => f.key === key ? { ...f, ...patch } : f) } };
    });
  }, [selectedTemplate]);

  const shiftField = (key: string, delta: number) => {
    const f = selectedTemplate?.structure.fields?.find(f => f.key === key);
    if (f) updateField(key, { start: Math.max(0, f.start + delta) });
  };

  const updatePdfLayout = useCallback((patch: Partial<PdfLayout>) => {
    setSelectedTemplate(prev => {
      if (!prev) return prev;
      const cur = prev.structure.pdfLayout || DEFAULT_PDF_LAYOUT;
      return { ...prev, structure: { ...prev.structure, pdfLayout: { ...cur, ...patch } } };
    });
  }, []);

  const selectedField = selectedTemplate?.structure.fields?.find(f => f.key === selectedFieldKey);
  const totalWidth    = selectedTemplate?.structure.fields ? totalChars(selectedTemplate.structure.fields) : 150;
  const rulerNumbers  = Array.from({ length: Math.ceil(totalWidth / 10) }, (_, i) => i * 10);

  return (
    <Box>
      {/* Hidden mono measure span */}
      <Box sx={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <span ref={monoRef} style={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre' }}>X</span>
      </Box>

      <HelpGuideDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, mb: 3, borderBottom: '2px solid #e8edf5' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>Gestion des Templates Sage</Typography>
          <Typography variant="caption" color="text.secondary">Éditeur visuel TXT et PDF en temps réel</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<HelpOutline />} variant="outlined" onClick={() => setHelpOpen(true)}
            sx={{ fontWeight: 600, borderColor: '#0d47a1', color: '#0d47a1', '&:hover': { borderColor: '#1e3a5f', bgcolor: 'rgba(13,71,161,0.04)' } }}>
            Guide
          </Button>
          <Button startIcon={<Add />} variant="contained" onClick={createNewTemplate}
            sx={{ fontWeight: 600, bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}>
            Nouveau
          </Button>
          <Button startIcon={<Upload />} variant="outlined" onClick={handleImportClick}
            sx={{ fontWeight: 600, borderColor: '#6A1B9A', color: '#6A1B9A', '&:hover': { borderColor: '#4A148C', bgcolor: 'rgba(106,27,154,0.04)' } }}>
            Importer
          </Button>
          <input ref={fileInputRef} type="file" accept=".txt,.asc,.xlsx,.xls,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleFileImport} />
        </Stack>
      </Box>

      {importError && <Alert severity="error" onClose={() => setImportError(null)} sx={{ mb: 2, borderRadius: 1.5 }}>{importError}</Alert>}

      <Grid container spacing={2.5}>
        {/* ── Template list ── */}
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2 }}>
            <CardContent>
              <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 0.5 }}>Templates</Typography>
                <Typography variant="caption" color="text.secondary">{templates.length} disponible(s)</Typography>
              </Box>
              {templates.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8faff', borderRadius: 2, border: '1px dashed #c5d4e8' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Aucun template</Typography>
                  <Typography variant="caption" color="text.secondary">Créez ou importez pour commencer</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {templates.map(t => (
                    <Box key={t.id} onClick={() => { setSelectedTemplate(t); setEditMode(false); setSelectedFieldKey(null); }}
                      sx={{ px: 1.5, py: 1.2, borderRadius: 1.5, cursor: 'pointer', border: selectedTemplate?.id === t.id ? '2px solid #6A1B9A' : '1px solid #dde3ef', bgcolor: selectedTemplate?.id === t.id ? '#f3e5f5' : '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s', '&:hover': { bgcolor: '#f0f4ff', borderColor: '#d0dff5' } }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: selectedTemplate?.id === t.id ? '#6A1B9A' : '#1e3a5f' }}>{t.name}</Typography>
                          {t.isDefault && <Chip label="Défaut" size="small" sx={{ fontSize: '0.55rem', fontWeight: 700, height: 16, bgcolor: '#4caf50', color: '#fff' }} />}
                        </Box>
                        <Chip label={t.type} size="small" sx={{ mt: 0.3, fontSize: '0.6rem', fontWeight: 700, height: 17, bgcolor: t.type === 'TXT' ? '#e3f2fd' : '#fce4ec', color: t.type === 'TXT' ? '#0d47a1' : '#880e4f' }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.3 }}>
                        {!t.isDefault && (
                          <Tooltip title="Définir comme défaut">
                            <IconButton size="small" onClick={e => { e.stopPropagation(); handleSetDefault(t.id!); }} sx={{ color: '#4caf50', '&:hover': { bgcolor: '#e8f5e9' }, p: 0.4 }}>
                              <CheckCircle sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton size="small" onClick={e => { e.stopPropagation(); setSelectedTemplate(t); setEditMode(true); }} sx={{ color: '#1e3a5f', '&:hover': { bgcolor: '#e8f0fe' }, p: 0.4 }}><Edit sx={{ fontSize: '0.9rem' }} /></IconButton>
                        <IconButton size="small" onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id!); }} sx={{ color: '#b71c1c', '&:hover': { bgcolor: '#fdecea' }, p: 0.4 }}><Delete sx={{ fontSize: '0.9rem' }} /></IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Main editor ── */}
        <Grid item xs={12} md={9}>
          {!selectedTemplate ? (
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 6, textAlign: 'center', bgcolor: '#f8faff', borderRadius: 2, border: '1px dashed #c5d4e8', minHeight: 300 }}>
                  <Typography variant="h6" color="text.secondary" fontWeight={600} mb={0.5}>Aucun template sélectionné</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>Sélectionnez un template ou créez-en un nouveau</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button startIcon={<Add />} variant="outlined" onClick={createNewTemplate} sx={{ borderColor: '#6A1B9A', color: '#6A1B9A', fontWeight: 600 }}>Créer</Button>
                    <Button startIcon={<HelpOutline />} variant="text" onClick={() => setHelpOpen(true)} sx={{ color: '#0d47a1', fontWeight: 600 }}>Voir le guide</Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

              {/* Name + type + actions */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2 }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField size="small" label="Nom du Template" value={selectedTemplate.name}
                      onChange={e => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                      disabled={!editMode} sx={{ flex: 1, minWidth: 200 }} />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Type</InputLabel>
                      <Select value={selectedTemplate.type} label="Type" disabled={!editMode}
                        onChange={e => {
                          const t = e.target.value as 'TXT' | 'PDF';
                          setSelectedTemplate({ ...selectedTemplate, type: t, structure: t === 'TXT' ? { fields: DEFAULT_FIELDS.map(f => ({ ...f })), lineFormat: 'FIXED_WIDTH' } : { pdfLayout: DEFAULT_PDF_LAYOUT } });
                          setSelectedFieldKey(null);
                        }}>
                        <MenuItem value="TXT"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TextSnippet sx={{ fontSize: '1rem', color: '#0d47a1' }} /> TXT (Sage Comptabilité)</Box></MenuItem>
                        <MenuItem value="PDF"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PictureAsPdf sx={{ fontSize: '1rem', color: '#880e4f' }} /> PDF (Document)</Box></MenuItem>
                      </Select>
                    </FormControl>
                    <Stack direction="row" spacing={1}>
                      {editMode ? (
                        <>
                          <Button startIcon={<Save />} variant="contained" onClick={handleSaveTemplate} sx={{ fontWeight: 600, bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}>Enregistrer</Button>
                          <Button variant="outlined" onClick={() => { setEditMode(false); loadTemplates(); }} sx={{ fontWeight: 600 }}>Annuler</Button>
                        </>
                      ) : (
                        <Button startIcon={<Edit />} variant="contained" onClick={() => setEditMode(true)} sx={{ fontWeight: 600, bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}>Modifier</Button>
                      )}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

              {/* ══ TXT EDITOR ══ */}
              {selectedTemplate.type === 'TXT' && selectedTemplate.structure.fields && (
                <>
                  {/* Visualisation */}
                  <Card elevation={0} sx={{ border: '2px solid #6A1B9A22', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.2, bgcolor: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Visibility sx={{ color: '#90caf9', fontSize: '1rem' }} />
                      <Typography variant="subtitle2" sx={{ color: '#e3f2fd', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Visualisation Temps Réel — Ligne TXT (150 chars)</Typography>
                      <Chip label={`${totalWidth} chars`} size="small" sx={{ ml: 'auto', bgcolor: '#0d47a1', color: '#e3f2fd', fontWeight: 700, fontSize: '0.65rem', height: 18 }} />
                    </Box>
                    <CardContent sx={{ bgcolor: '#0d1117', p: '12px !important' }}>
                      <Box sx={{ overflowX: 'auto', pb: 1 }}>
                        <Box sx={{ minWidth: totalWidth * charWidth + 24, position: 'relative' }}>
                          {/* Numbers */}
                          <Box sx={{ position: 'relative', height: 14, mb: '3px' }}>
                            {rulerNumbers.map(pos => (
                              <Box key={pos} sx={{ position: 'absolute', left: pos * charWidth }}>
                                <Typography sx={{ fontSize: '0.55rem', color: '#4a6fa5', fontFamily: 'monospace', lineHeight: 1 }}>{pos}</Typography>
                              </Box>
                            ))}
                          </Box>
                          {/* Ticks */}
                          <Box sx={{ position: 'relative', height: 8, mb: '4px', borderBottom: '1px solid #1e3a5f' }}>
                            {Array.from({ length: totalWidth }, (_, i) => (
                              <Box key={i} sx={{ position: 'absolute', left: i * charWidth, width: 1, height: i % 10 === 0 ? 8 : i % 5 === 0 ? 5 : 3, bgcolor: i % 10 === 0 ? '#4a6fa5' : '#2d4a6a', bottom: 0 }} />
                            ))}
                          </Box>
                          {/* Segments */}
                          <Box sx={{ position: 'relative', height: 32, mb: '6px', userSelect: 'none' }}>
                            {[...selectedTemplate.structure.fields].sort((a, b) => a.start - b.start).map(f => (
                              <Segment key={f.key} field={f} selected={selectedFieldKey === f.key}
                                onSelect={() => f.editable && setSelectedFieldKey(selectedFieldKey === f.key ? null : f.key)} charWidth={charWidth} />
                            ))}
                          </Box>
                          {/* Monospace line */}
                          <Box sx={{ bgcolor: '#161b22', border: '1px solid #21262d', borderRadius: 1, px: 1, py: 0.8 }}>
                            <Box sx={{ position: 'relative', height: 20 }}>
                              {[...selectedTemplate.structure.fields].sort((a, b) => a.start - b.start).map(f => {
                                const val = f.sample.padEnd(f.width, ' ').substring(0, f.width);
                                return (
                                  <Typography key={f.key} component="span"
                                    onClick={() => f.editable && setSelectedFieldKey(selectedFieldKey === f.key ? null : f.key)}
                                    sx={{ position: 'absolute', left: f.start * charWidth, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px', color: selectedFieldKey === f.key ? '#fff' : f.fixed ? '#4a6fa5' : '#a8d8a8', bgcolor: selectedFieldKey === f.key ? f.color + '55' : 'transparent', cursor: f.editable ? 'pointer' : 'default', whiteSpace: 'pre', transition: 'color 0.15s' }}>
                                    {val}
                                  </Typography>
                                );
                              })}
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      {/* Legend */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1.5 }}>
                        {selectedTemplate.structure.fields.map(f => (
                          <Chip key={f.key} label={`${f.key} [${f.start}:${f.start + f.width}]`} size="small"
                            onClick={() => f.editable && setSelectedFieldKey(selectedFieldKey === f.key ? null : f.key)}
                            sx={{ bgcolor: selectedFieldKey === f.key ? f.color : f.color + '33', color: selectedFieldKey === f.key ? '#fff' : f.color, fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700, height: 20, cursor: f.editable ? 'pointer' : 'default', border: selectedFieldKey === f.key ? `1px solid ${f.color}` : '1px solid transparent', transition: 'all 0.15s' }} />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Field editor */}
                  {selectedFieldKey && selectedField ? (
                    <Card elevation={0} sx={{ border: `2px solid ${selectedField.color}`, borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{ px: 2, py: 1.2, bgcolor: selectedField.color, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DragIndicator sx={{ color: selectedField.textColor, fontSize: '1rem' }} />
                        <Typography variant="subtitle2" sx={{ color: selectedField.textColor, fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Édition : {selectedField.label}
                        </Typography>
                        <Chip label={`pos ${selectedField.start} → ${selectedField.start + selectedField.width}`} size="small"
                          sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.25)', color: selectedField.textColor, fontWeight: 700, fontSize: '0.65rem', height: 18 }} />
                      </Box>
                      <CardContent>
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>Position de début</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <IconButton size="small" disabled={!editMode} onClick={() => shiftField(selectedField.key, -1)} sx={{ bgcolor: '#f0f4ff', '&:hover': { bgcolor: '#e3f2fd' } }}><ArrowBack sx={{ fontSize: '0.9rem' }} /></IconButton>
                              <TextField size="small" type="number" value={selectedField.start} disabled={!editMode} onChange={e => updateField(selectedField.key, { start: Math.max(0, parseInt(e.target.value) || 0) })} inputProps={{ min: 0, style: { textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 } }} sx={{ width: 80 }} />
                              <IconButton size="small" disabled={!editMode} onClick={() => shiftField(selectedField.key, 1)} sx={{ bgcolor: '#f0f4ff', '&:hover': { bgcolor: '#e3f2fd' } }}><ArrowForward sx={{ fontSize: '0.9rem' }} /></IconButton>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>Largeur (chars)</Typography>
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TextField size="small" type="number" value={selectedField.width} disabled={!editMode} onChange={e => updateField(selectedField.key, { width: Math.max(1, parseInt(e.target.value) || 1) })} inputProps={{ min: 1, style: { textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 } }} sx={{ width: 80 }} />
                              <Slider value={selectedField.width} min={1} max={50} step={1} disabled={!editMode} onChange={(_, v) => updateField(selectedField.key, { width: v as number })} sx={{ flex: 1, color: selectedField.color }} size="small" />
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>Valeur exemple (aperçu)</Typography>
                            <TextField size="small" fullWidth value={selectedField.sample} disabled={!editMode} onChange={e => updateField(selectedField.key, { sample: e.target.value })} inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }} sx={{ mt: 0.5 }} helperText={`${selectedField.sample.length}/${selectedField.width} chars`} error={selectedField.sample.length > selectedField.width} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>Label du champ</Typography>
                            <TextField size="small" fullWidth value={selectedField.label} disabled={!editMode} onChange={e => updateField(selectedField.key, { label: e.target.value })} sx={{ mt: 0.5 }} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>Résumé de position</Typography>
                            <Paper elevation={0} sx={{ mt: 0.5, p: 1.2, bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 1.5 }}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e3a5f' }}>
                                Col {selectedField.start} → {selectedField.start + selectedField.width - 1} &nbsp;|&nbsp; <strong>{selectedField.width}</strong> chars &nbsp;|&nbsp; Fin à <strong>{selectedField.start + selectedField.width}</strong>
                              </Typography>
                            </Paper>
                          </Grid>
                          {editMode && (
                            <Grid item xs={12}>
                              <Divider sx={{ mb: 1.5, borderColor: '#e8edf5' }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>Déplacer rapidement</Typography>
                              <Stack direction="row" spacing={1} mt={0.8}>
                                {[-10, -5, -1, +1, +5, +10].map(delta => (
                                  <Button key={delta} size="small" variant="outlined" onClick={() => shiftField(selectedField.key, delta)}
                                    sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem', minWidth: 44, px: 1, borderColor: selectedField.color + '88', color: delta < 0 ? '#b71c1c' : '#2e7d32', '&:hover': { borderColor: selectedField.color, bgcolor: selectedField.color + '11' } }}>
                                    {delta > 0 ? `+${delta}` : delta}
                                  </Button>
                                ))}
                              </Stack>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert severity="info" icon={<Info />} sx={{ borderRadius: 1.5, bgcolor: '#e8f0fe', color: '#1e3a5f', '& .MuiAlert-icon': { color: '#1e3a5f' } }}>
                      Cliquez sur un segment coloré dans la règle pour sélectionner et éditer un champ. La prévisualisation se met à jour en temps réel.
                    </Alert>
                  )}

                  {/* Fields table */}
                  <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2 }}>
                    <Box sx={{ px: 2, py: 1.2, bgcolor: '#f8faff', borderBottom: '1px solid #e8edf5', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Code sx={{ color: '#1e3a5f', fontSize: '1rem' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 0.5 }}>Tous les champs — Vue tableau</Typography>
                    </Box>
                    <CardContent sx={{ p: '0 !important' }}>
                      <Box sx={{ overflowX: 'auto' }}>
                        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <Box component="thead">
                            <Box component="tr" sx={{ bgcolor: '#f0f4ff' }}>
                              {['Couleur', 'Clé', 'Label', 'Début', 'Largeur', 'Fin', 'Exemple', 'Action'].map(h => (
                                <Box key={h} component="th" sx={{ px: 1.5, py: 1, textAlign: 'left', fontWeight: 700, color: '#1e3a5f', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '2px solid #dde3ef', whiteSpace: 'nowrap' }}>{h}</Box>
                              ))}
                            </Box>
                          </Box>
                          <Box component="tbody">
                            {[...selectedTemplate.structure.fields].sort((a, b) => a.start - b.start).map((f, i) => (
                              <Box component="tr" key={f.key} onClick={() => f.editable && setSelectedFieldKey(f.key)}
                                sx={{ bgcolor: selectedFieldKey === f.key ? f.color + '15' : i % 2 === 0 ? '#fff' : '#fafafa', cursor: f.editable ? 'pointer' : 'default', '&:hover': { bgcolor: f.editable ? f.color + '12' : undefined }, borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.1s' }}>
                                <Box component="td" sx={{ px: 1.5, py: 0.9 }}><Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: f.color, border: '1px solid rgba(0,0,0,0.1)' }} /></Box>
                                <Box component="td" sx={{ px: 1.5, py: 0.9, fontFamily: 'monospace', fontWeight: 700, color: '#1e3a5f', fontSize: '0.72rem' }}>{f.key}</Box>
                                <Box component="td" sx={{ px: 1.5, py: 0.9, color: '#546e7a' }}>{f.label}</Box>
                                <Box component="td" sx={{ px: 1.5, py: 0.9, fontFamily: 'monospace', color: '#1565c0', fontWeight: 700 }}>{f.start}</Box>
                                <Box component="td" sx={{ px: 1.5, py: 0.9, fontFamily: 'monospace', color: '#6a1b9a', fontWeight: 700 }}>{f.width}</Box>
                                <Box component="td" sx={{ px: 1.5, py: 0.9, fontFamily: 'monospace', color: '#2e7d32', fontWeight: 700 }}>{f.start + f.width}</Box>
                                <Box component="td" sx={{ px: 1.5, py: 0.9 }}>
                                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', bgcolor: '#161b22', color: '#a8d8a8', px: 0.8, py: 0.2, borderRadius: 0.5, display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.sample}</Typography>
                                </Box>
                                <Box component="td" sx={{ px: 1.5, py: 0.9 }}>
                                  {f.editable && editMode && (
                                    <Stack direction="row" spacing={0.5}>
                                      <IconButton size="small" onClick={e => { e.stopPropagation(); shiftField(f.key, -1); }} sx={{ p: 0.3, bgcolor: '#fdecea', '&:hover': { bgcolor: '#ffcdd2' } }}><ArrowBack sx={{ fontSize: '0.8rem', color: '#b71c1c' }} /></IconButton>
                                      <IconButton size="small" onClick={e => { e.stopPropagation(); shiftField(f.key, 1); }} sx={{ p: 0.3, bgcolor: '#e8f5e9', '&:hover': { bgcolor: '#c8e6c9' } }}><ArrowForward sx={{ fontSize: '0.8rem', color: '#2e7d32' }} /></IconButton>
                                    </Stack>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ══ PDF EDITOR ══ */}
              {selectedTemplate.type === 'PDF' && (
                <PdfConfigPanel
                  layout={selectedTemplate.structure.pdfLayout || DEFAULT_PDF_LAYOUT}
                  onChange={updatePdfLayout}
                  editMode={editMode}
                />
              )}
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default TemplateEditorTab;