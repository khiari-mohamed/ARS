import React from 'react';
import { Box, Container } from '@mui/material';

interface AlertsLayoutProps {
  children: React.ReactNode;
}

const AlertsLayout: React.FC<AlertsLayoutProps> = ({ children }) => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 2 }}>
        {children}
      </Box>
    </Container>
  );
};

export default AlertsLayout;