import React from 'react';
import { List, Typography } from 'antd';
import { useBSLogs } from '../../hooks/useBS';

export const BSLogs: React.FC<{ bsId: number }> = ({ bsId }) => {
  const { data, isLoading } = useBSLogs(bsId);

  // Ensure data is always an array
  const logs: Array<{ timestamp: string | number | Date; action: string }> = Array.isArray(data) ? data : [];

  return (
    <List
      dataSource={logs}
      size="small"
      header={<b>Historique</b>}
      renderItem={log => (
        <List.Item>
          <Typography.Text type="secondary">
            {new Date(log.timestamp).toLocaleString()} - 
          </Typography.Text>
          <span style={{ marginLeft: 8 }}>{log.action}</span>
        </List.Item>
      )}
    />
  );
};
