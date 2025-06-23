// src/components/BS/NotificationCenter.tsx
import React from 'react';
import { List, Badge } from 'antd';

export const NotificationCenter: React.FC<{ notifications: { message: string; read: boolean }[] }> = ({ notifications }) => (
  <List
    header={<b>Notifications</b>}
    dataSource={notifications}
    renderItem={n => (
      <List.Item>
        <Badge status={n.read ? 'default' : 'processing'} />
        <span style={{ marginLeft: 8 }}>{n.message}</span>
      </List.Item>
    )}
  />
);