import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxHeight?: string | number;
  enableScroll?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
  children, 
  maxHeight = '70vh',
  enableScroll = true 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100vw',
        maxHeight: isMobile ? '60vh' : maxHeight,
        overflow: enableScroll ? 'auto' : 'hidden',
        '&::-webkit-scrollbar': {
          width: 6,
          height: 6
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 3
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(0,0,0,0.05)'
        }
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveContainer;