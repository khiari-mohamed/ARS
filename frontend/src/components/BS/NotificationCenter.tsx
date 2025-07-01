import React, { useState, useEffect } from 'react';
import { List, Badge, Button } from 'antd';

export const NotificationCenter: React.FC<{ notifications: { message: string; read: boolean }[] }> = ({ notifications }) => {
  const [visible, setVisible] = useState(true);

  // Auto-hide after 5 seconds if there are notifications
  useEffect(() => {
    if (notifications.length > 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  if (!visible || notifications.length === 0) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0002', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b>Notifications</b>
        <Button size="small" onClick={() => setVisible(false)}>X</Button>
      </div>
      <List
        dataSource={notifications}
        renderItem={n => (
          <List.Item>
            <Badge status={n.read ? 'default' : 'processing'} />
            <span style={{ marginLeft: 8 }}>{n.message}</span>
          </List.Item>
        )}
      />
    </div>
  );
};