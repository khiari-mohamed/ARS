import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { NotificationPreferences } from '../components/NotificationPreferences';

const NotificationSettings: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Paramètres de Notification
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Configurez vos préférences pour recevoir les notifications par email et/ou dans l'application.
        </Typography>
        <NotificationPreferences />
      </Box>
    </Container>
  );
};

export default NotificationSettings;