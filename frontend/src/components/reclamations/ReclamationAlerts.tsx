import React, { useEffect, useState } from 'react';
import { LocalAPI } from '../../services/axios';
import { NotificationIcon } from './NotificationIcon';

interface Alert {
  id: string;
  type: string;
  level: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  reclamationId?: string;
  clientName?: string;
  createdAt: string;
  read: boolean;
}

export const ReclamationAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // Polling for alerts every 30 seconds
  useEffect(() => {
    let mounted = true;
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const { data } = await LocalAPI.get<Alert[]>('/reclamations/alerts');
        if (mounted) setAlerts(data || []);
      } catch (e) {
        console.error('Failed to fetch alerts:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await LocalAPI.patch(`/reclamations/alerts/${alertId}/read`);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const handleViewReclamation = (reclamationId: string) => {
    window.open(`/reclamations/${reclamationId}`, '_blank');
  };

  const unreadAlerts = alerts.filter(a => !a.read);

  return (
    <div className="relative">
      <NotificationIcon 
        count={unreadAlerts.length} 
        onClick={() => setShow(s => !s)} 
      />
      {show && (
        <div className="absolute right-0 mt-2 w-96 bg-white shadow-lg rounded-lg z-50 border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-lg">Alertes Réclamations ({unreadAlerts.length} non lues)</h4>
              <button 
                onClick={() => setShow(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Chargement...</div>
            ) : alerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Aucune alerte</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {alerts.map(alert => (
                  <li
                    key={alert.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      alert.read ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${
                            alert.level === 'error' ? 'bg-red-500' :
                            alert.level === 'warning' ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`} />
                          <span className="font-semibold text-sm">{alert.title}</span>
                          {alert.clientName && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {alert.clientName}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">{alert.message}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(alert.createdAt).toLocaleString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        {alert.reclamationId && (
                          <button
                            onClick={() => handleViewReclamation(alert.reclamationId!)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            Voir
                          </button>
                        )}
                        {!alert.read && (
                          <button
                            onClick={() => handleMarkAsRead(alert.id)}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            Marquer lu
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};