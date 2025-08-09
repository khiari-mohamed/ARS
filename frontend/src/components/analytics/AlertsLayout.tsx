import React from 'react';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';

interface Props {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

const AlertsLayout: React.FC<Props> = ({ children, maxWidth = 'xl' }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  return (
    <Container 
      maxWidth={maxWidth} 
      sx={{ 
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 1, sm: 2 },
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, md: 3 },
          '& .MuiCard-root': {
            boxShadow: { xs: 1, md: 2 },
            borderRadius: { xs: 1, md: 2 }
          },
          '& .MuiGrid-container': {
            spacing: { xs: 1, sm: 2, md: 3 }
          }
        }}
      >
        {children}
      </Box>
    </Container>
  );
};

export default AlertsLayout;