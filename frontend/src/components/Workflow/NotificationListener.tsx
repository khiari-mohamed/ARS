import React, { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import io from 'socket.io-client';
import { getSocketUrl } from '../../utils/getSocketUrl';

const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });

const NotificationListener: React.FC = () => {
  const [notif, setNotif] = useState<{ open: boolean, message: string, severity: 'warning' | 'info' | 'success' | 'error' }>({ open: false, message: '', severity: 'warning' });

  useEffect(() => {
    const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });

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