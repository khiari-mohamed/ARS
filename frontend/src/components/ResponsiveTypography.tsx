import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { useResponsive } from '../hooks/useResponsive';

interface ResponsiveTypographyProps extends Omit<TypographyProps, 'variant'> {
  mobileVariant: TypographyProps['variant'];
  desktopVariant: TypographyProps['variant'];
}

const ResponsiveTypography: React.FC<ResponsiveTypographyProps> = ({
  mobileVariant,
  desktopVariant,
  children,
  ...props
}) => {
  const { isMobile } = useResponsive();
  
  return (
    <Typography variant={isMobile ? mobileVariant : desktopVariant} {...props}>
      {children}
    </Typography>
  );
};

export default ResponsiveTypography;