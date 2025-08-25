import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationContextProps {
  notify: (message: string, severity?: 'success' | 'info' | 'warning' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  notify: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Array<{
    id: number;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>>([]);

  const notify = (msg: string, sev: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message: msg, severity: sev }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };



  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      
      {/* Custom Professional Notification Popup */}
      <div className="notification-popup-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-popup ${notification.severity} show notification-slide-in`}
          >
            <div className="notification-popup-content">
              <div className="notification-popup-message">
                <span className="notification-popup-icon">{getIcon(notification.severity)}</span>
                <span className="notification-popup-text">
                  {notification.message}
                </span>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="notification-popup-close"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};