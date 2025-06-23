import React from 'react';

interface AlertsPanelProps {
  alerts: any[];
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => (
  <div>
    <h3>Alerts Overview</h3>
    <ul>
      {alerts.map((alert, idx) => (
        <li key={idx} style={{ color: alert.alertLevel === 'red' ? 'red' : alert.alertLevel === 'orange' ? 'orange' : 'green' }}>
          {alert.reason} (Bordereau: {alert.bordereau.reference})
        </li>
      ))}
    </ul>
  </div>
);

export default AlertsPanel;
