import { Theme } from '@mui/material/styles';

export const getResponsivePadding = (theme: Theme) => ({
  xs: theme.spacing(1),
  sm: theme.spacing(2),
  md: theme.spacing(3)
});

export const getResponsiveSpacing = (theme: Theme) => ({
  xs: 1,
  sm: 2,
  md: 3
});

export const getResponsiveTypography = (mobile: string, desktop: string) => ({
  xs: mobile,
  sm: desktop
});

export const getResponsiveHeight = (mobile: number | string, desktop: number | string) => ({
  xs: mobile,
  sm: desktop
});

export const getMobileCardStyles = (theme: Theme) => ({
  p: { xs: 1.5, sm: 2 },
  mb: { xs: 1, sm: 2 },
  '&::-webkit-scrollbar': { width: 6, height: 6 },
  '&::-webkit-scrollbar-thumb': { 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderRadius: 3 
  }
});

export const getResponsiveGridSpacing = () => ({
  xs: 1,
  sm: 2,
  md: 3
});

export const getResponsiveButtonProps = () => ({
  size: { xs: 'small', sm: 'medium' } as const,
  fullWidth: { xs: true, sm: false }
});

export const getResponsiveDialogProps = (isMobile: boolean) => ({
  fullScreen: isMobile,
  maxWidth: 'sm' as const,
  fullWidth: true
});

export default {
  getResponsivePadding,
  getResponsiveSpacing,
  getResponsiveTypography,
  getResponsiveHeight,
  getMobileCardStyles,
  getResponsiveGridSpacing,
  getResponsiveButtonProps,
  getResponsiveDialogProps
};