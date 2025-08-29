import { LocalAPI } from './axios';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export class NotificationService {
  // Get user notifications
  static async getUserNotifications(): Promise<Notification[]> {
    try {
      const response = await LocalAPI.get('/notifications');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await LocalAPI.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(): Promise<void> {
    try {
      await LocalAPI.patch('/notifications/mark-all-read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  // Get notification icon based on type
  static getNotificationIcon(type: string): string {
    switch (type) {
      case 'NEW_BORDEREAU_SCAN':
        return '📄';
      case 'BORDEREAU_READY_ASSIGNMENT':
        return '📋';
      case 'BORDEREAU_RETURNED':
        return '↩️';
      case 'TEAM_OVERLOAD_ALERT':
        return '⚠️';
      case 'ASSIGNMENT_FAILURE':
        return '❌';
      case 'SLA_BREACH':
        return '🔴';
      case 'CUSTOM_NOTIFICATION':
        return '💬';
      default:
        return '🔔';
    }
  }

  // Get notification color based on type
  static getNotificationColor(type: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (type) {
      case 'NEW_BORDEREAU_SCAN':
        return 'info';
      case 'BORDEREAU_READY_ASSIGNMENT':
        return 'primary';
      case 'BORDEREAU_RETURNED':
        return 'warning';
      case 'TEAM_OVERLOAD_ALERT':
        return 'error';
      case 'ASSIGNMENT_FAILURE':
        return 'error';
      case 'SLA_BREACH':
        return 'error';
      case 'CUSTOM_NOTIFICATION':
        return 'info';
      default:
        return 'default';
    }
  }
}