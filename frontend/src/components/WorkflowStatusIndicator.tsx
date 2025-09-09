import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWorkflowNotifications, markWorkflowNotificationAsRead } from '../services/workflowService';

interface WorkflowStatusIndicatorProps {
  className?: string;
}

const WorkflowStatusIndicator: React.FC<WorkflowStatusIndicatorProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Refresh every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await fetchWorkflowNotifications({
        toService: user.role,
        userId: user.id,
        limit: 10
      });
      
      setNotifications(data);
      setUnreadCount(data.filter(n => n.status === 'PENDING' || n.status === 'SENT').length);
    } catch (error) {
      console.error('Error loading workflow notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markWorkflowNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_BORDEREAU_SCAN': return '📥';
      case 'BORDEREAU_READY_ASSIGNMENT': return '📋';
      case 'BORDEREAU_ASSIGNED': return '👤';
      case 'BORDEREAU_RETURNED': return '↩️';
      case 'ASSIGNMENT_FAILURE': return '⚠️';
      case 'TEAM_OVERLOAD': return '🚨';
      case 'SLA_BREACH': return '⏰';
      default: return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'ASSIGNMENT_FAILURE':
      case 'TEAM_OVERLOAD':
      case 'SLA_BREACH':
        return 'text-red-600 bg-red-50';
      case 'BORDEREAU_RETURNED':
        return 'text-orange-600 bg-orange-50';
      case 'NEW_BORDEREAU_SCAN':
      case 'BORDEREAU_READY_ASSIGNMENT':
        return 'text-blue-600 bg-blue-50';
      case 'BORDEREAU_ASSIGNED':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}j`;
  };

  if (!user || !['BO', 'SCAN_TEAM', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'SUPER_ADMIN'].includes(user.role)) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications Workflow
              </h3>
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Fermer</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-2">📭</div>
                <p className="text-gray-600">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      notification.status === 'READ' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                        <span className="text-sm">
                          {getNotificationIcon(notification.type)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.fromService} → {notification.toService}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(notification.sentAt)}
                          </p>
                        </div>
                        
                        <p className="text-sm text-gray-700 mt-1">
                          {notification.message}
                        </p>
                        
                        {notification.bordereau && (
                          <p className="text-xs text-gray-500 mt-1">
                            Bordereau: {notification.bordereau.reference}
                          </p>
                        )}
                        
                        {notification.status !== 'READ' && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                          >
                            Marquer comme lu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={loadNotifications}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                🔄 Actualiser
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowStatusIndicator;