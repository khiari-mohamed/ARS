import { Alignment, Border, Fill, Font } from 'exceljs';

// ─── Brand Colors ────────────────────────────────────────────────────────────
export const COLORS = {
  // Primary palette
  PRIMARY:        'FF1E3A5F',   // Deep navy
  PRIMARY_LIGHT:  'FF2D5A8E',   // Medium blue
  ACCENT:         'FF0EA5E9',   // Sky blue
  ACCENT_LIGHT:   'FFE0F2FE',   // Very light blue

  // Status colors
  SUCCESS:        'FF10B981',
  SUCCESS_LIGHT:  'FFD1FAE5',
  WARNING:        'FFF59E0B',
  WARNING_LIGHT:  'FFFEF3C7',
  DANGER:         'FFEF4444',
  DANGER_LIGHT:   'FFFEE2E2',
  INFO:           'FF6366F1',
  INFO_LIGHT:     'FFE0E7FF',

  // Neutral
  WHITE:          'FFFFFFFF',
  GRAY_50:        'FFF8FAFC',
  GRAY_100:       'FFF1F5F9',
  GRAY_200:       'FFE2E8F0',
  GRAY_400:       'FF94A3B8',
  GRAY_600:       'FF475569',
  GRAY_800:       'FF1E293B',
  BLACK:          'FF0F172A',

  // Row alternation
  ROW_ODD:        'FFFFFFFF',
  ROW_EVEN:       'FFF8FAFC',

  // Sheet tab colors
  TAB_CLIENTS:    'FF1E3A5F',
  TAB_STATS:      'FF0EA5E9',
  TAB_ANALYSE:    'FF10B981',
  TAB_SLA:        'FFF59E0B',
};

// ─── Font Presets ─────────────────────────────────────────────────────────────
export const FONTS = {
  title: {
    name: 'Arial',
    size: 18,
    bold: true,
    color: { argb: COLORS.WHITE },
  } as Partial<Font>,

  subtitle: {
    name: 'Arial',
    size: 11,
    italic: true,
    color: { argb: COLORS.GRAY_400 },
  } as Partial<Font>,

  columnHeader: {
    name: 'Arial',
    size: 10,
    bold: true,
    color: { argb: COLORS.WHITE },
  } as Partial<Font>,

  sectionHeader: {
    name: 'Arial',
    size: 12,
    bold: true,
    color: { argb: COLORS.PRIMARY },
  } as Partial<Font>,

  dataCell: {
    name: 'Arial',
    size: 10,
    color: { argb: COLORS.GRAY_800 },
  } as Partial<Font>,

  dataCellBold: {
    name: 'Arial',
    size: 10,
    bold: true,
    color: { argb: COLORS.BLACK },
  } as Partial<Font>,

  statValue: {
    name: 'Arial',
    size: 22,
    bold: true,
    color: { argb: COLORS.PRIMARY },
  } as Partial<Font>,

  statLabel: {
    name: 'Arial',
    size: 9,
    color: { argb: COLORS.GRAY_600 },
  } as Partial<Font>,

  badge: {
    name: 'Arial',
    size: 9,
    bold: true,
    color: { argb: COLORS.WHITE },
  } as Partial<Font>,

  footerText: {
    name: 'Arial',
    size: 8,
    italic: true,
    color: { argb: COLORS.GRAY_400 },
  } as Partial<Font>,
};

// ─── Fill Presets ─────────────────────────────────────────────────────────────
export const makeFill = (argb: string): Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

export const FILLS = {
  primaryHeader:  makeFill(COLORS.PRIMARY),
  accentHeader:   makeFill(COLORS.ACCENT),
  sectionTitle:   makeFill(COLORS.PRIMARY_LIGHT),
  rowOdd:         makeFill(COLORS.ROW_ODD),
  rowEven:        makeFill(COLORS.ROW_EVEN),
  successBg:      makeFill(COLORS.SUCCESS_LIGHT),
  warningBg:      makeFill(COLORS.WARNING_LIGHT),
  dangerBg:       makeFill(COLORS.DANGER_LIGHT),
  infoBg:         makeFill(COLORS.INFO_LIGHT),
  grayHeader:     makeFill(COLORS.GRAY_800),
  statCard:       makeFill(COLORS.GRAY_50),
};

// ─── Border Presets ───────────────────────────────────────────────────────────
const thinBorder: Partial<Border> = { style: 'thin', color: { argb: COLORS.GRAY_200 } };
const mediumBorder: Partial<Border> = { style: 'medium', color: { argb: COLORS.GRAY_400 } };
const thickBorder: Partial<Border> = { style: 'thick', color: { argb: COLORS.PRIMARY } };

export const BORDERS = {
  allThin: {
    top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder,
  },
  allMedium: {
    top: mediumBorder, bottom: mediumBorder, left: mediumBorder, right: mediumBorder,
  },
  bottomMedium: {
    bottom: mediumBorder,
  },
  bottomThick: {
    bottom: thickBorder,
  },
  bottomThin: {
    bottom: thinBorder,
  },
};

// ─── Alignment Presets ────────────────────────────────────────────────────────
export const ALIGNMENTS = {
  centerMiddle: {
    horizontal: 'center' as const,
    vertical: 'middle' as const,
    wrapText: false,
  } as Partial<Alignment>,

  leftMiddle: {
    horizontal: 'left' as const,
    vertical: 'middle' as const,
    wrapText: false,
  } as Partial<Alignment>,

  rightMiddle: {
    horizontal: 'right' as const,
    vertical: 'middle' as const,
    wrapText: false,
  } as Partial<Alignment>,

  leftWrap: {
    horizontal: 'left' as const,
    vertical: 'middle' as const,
    wrapText: true,
  } as Partial<Alignment>,

  centerTop: {
    horizontal: 'center' as const,
    vertical: 'top' as const,
    wrapText: true,
  } as Partial<Alignment>,
};

// ─── Status Label / Color Helpers ─────────────────────────────────────────────
export const getStatusColor = (status?: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'active':    return COLORS.SUCCESS;
    case 'inactive':  return COLORS.DANGER;
    case 'suspended': return COLORS.WARNING;
    default:          return COLORS.GRAY_400;
  }
};

export const getStatusLabel = (status?: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'active':    return '✅ Actif';
    case 'inactive':  return '❌ Inactif';
    case 'suspended': return '⚠️ Suspendu';
    default:          return status || 'Inconnu';
  }
};

export const getModeLabel = (mode?: string): string => {
  switch (mode) {
    case 'VIREMENT':       return 'Virement Bancaire';
    case 'CHEQUE':         return 'Chèque';
    case 'FEUILLE_CAISSE': return 'Feuille de Caisse';
    default:               return 'Non défini';
  }
};

export const getSlaStatusColor = (avgSla: number, maxDelay: number): string => {
  if (avgSla <= maxDelay * 0.75)   return COLORS.SUCCESS;
  if (avgSla <= maxDelay)          return COLORS.WARNING;
  return COLORS.DANGER;
};

export const getSlaStatusLabel = (avgSla: number, maxDelay: number): string => {
  if (avgSla <= maxDelay * 0.75)   return '🟢 Conforme';
  if (avgSla <= maxDelay)          return '🟡 Attention';
  return '🔴 Dépassement';
};