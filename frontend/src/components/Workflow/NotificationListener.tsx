import React, { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const NotificationListener: React.FC = () => {
  const [notif, setNotif] = useState<{ open: boolean, message: string, severity: 'warning' | 'info' | 'success' | 'error' }>({ open: false, message: '', severity: 'warning' });

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    socket.on('sla_alert', (data: any) => {
      setNotif({ open: true, message: data.message, severity: 'warning' });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Snackbar open={notif.open} autoHideDuration={4000} onClose={() => setNotif({ ...notif, open: false })}>
      <Alert onClose={() => setNotif({ ...notif, open: false })} severity={notif.severity} sx={{ width: '100%' }}>
        {notif.severity === 'warning' ? 'Alerte SLA : ' : ''}{notif.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationListener;