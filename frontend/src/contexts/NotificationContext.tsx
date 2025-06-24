import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';


interface NotificationContextProps {
  notify: (message: string, severity?: 'success' | 'info' | 'warning' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  notify: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  const notify = (msg: string, sev: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(false); // Close first to allow re-showing the same message
    setTimeout(() => setOpen(true), 50);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          sx={{ width: '100%' }}
          role="alert"
        >
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};