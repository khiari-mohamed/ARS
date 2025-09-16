import React from 'react';

interface AlertsPanelProps {
  alerts: any[];
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const getAlertColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'MEDIUM': return '#d97706';
      case 'LOW': return '#059669';
      default: return '#6b7280';
    }
  };
  
  const getAlertIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'SLA_BREACH': return '⏰';
      case 'WORKLOAD': return '📊';
      case 'QUALITY': return '⚠️';
      case 'SYSTEM_ERROR': return '🚨';
      default: return '📋';
    }
  };
  
  if (!alerts || alerts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
        <p>Aucune alerte ARS active</p>
        <p style={{ fontSize: '0.9rem' }}>Système fonctionnel</p>
      </div>
    );
  }
  
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Alertes ARS</h3>
        <span style={{ 
          marginLeft: '0.5rem', 
          padding: '0.25rem 0.5rem', 
          backgroundColor: '#ef4444', 
          color: 'white', 
          borderRadius: '12px', 
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          {alerts.length}
        </span>
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {alerts.map((alert, idx) => (
          <div 
            key={alert.id || idx} 
            style={{ 
              padding: '0.75rem',
              marginBottom: '0.5rem',
              border: `1px solid ${getAlertColor(alert.alertLevel)}`,
              borderRadius: '6px',
              backgroundColor: `${getAlertColor(alert.alertLevel)}10`,
              borderLeft: `4px solid ${getAlertColor(alert.alertLevel)}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{getAlertIcon(alert.alertType)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '600', 
                  color: getAlertColor(alert.alertLevel),
                  marginBottom: '0.25rem',
                  fontSize: '0.9rem'
                }}>
                  {alert.message}
                </div>
                {alert.reason && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>
                    {alert.reason}
                  </div>
                )}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: '#9ca3af'
                }}>
                  <span>Source: {alert.source || 'ARS'}</span>
                  <span>{alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : ''}</span>
                </div>
              </div>
              <span style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: getAlertColor(alert.alertLevel),
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '500'
              }}>
                {alert.alertLevel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
