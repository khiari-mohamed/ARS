import React, { useEffect, useState } from 'react';
import { LocalAPI } from '../../services/axios';
import { NotificationIcon } from './NotificationIcon';

interface Alert {
  id: string;
  reclamationId: string;
  level: 'critical' | 'warning' | 'normal';
  message: string;
  createdAt: string;
  resolved: boolean;
}

export const ReclamationAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [show, setShow] = useState(false);

  // Polling for alerts every 30 seconds
  useEffect(() => {
    let mounted = true;
    const fetchAlerts = async () => {
      try {
        const { data } = await LocalAPI.get<Alert[]>('/alerts/reclamations');
        if (mounted) setAlerts(data || []);
      } catch (e) {
        // Optionally handle error
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const critical = alerts.filter(a => a.level === 'critical' && !a.resolved);
  const warning = alerts.filter(a => a.level === 'warning' && !a.resolved);

  return (
    <div className="relative">
      <NotificationIcon count={critical.length + warning.length} onClick={() => setShow(s => !s)} />
      {show && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded z-50 p-3">
          <h4 className="font-bold mb-2">Alertes Réclamations</h4>
          {alerts.length === 0 && <div className="text-gray-500">Aucune alerte active.</div>}
          <ul>
            {alerts.map(alert => (
              <li
                key={alert.id}
                className={`mb-2 p-2 rounded ${
                  alert.level === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : alert.level === 'warning'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                <div className="text-xs">{new Date(alert.createdAt).toLocaleString()}</div>
                <div className="font-semibold">{alert.message}</div>
                <div className="text-xs">Réclamation: {alert.reclamationId}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};