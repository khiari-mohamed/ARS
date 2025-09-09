import React from 'react';
import { Card, Form, InputNumber, Switch, Select, Button, message, Table } from 'antd';
import { useWorkflowConfig, TeamConfig } from '../../hooks/useWorkflowConfig';

const TeamWorkloadConfig: React.FC = () => {
  const { configs, loading, updateConfig } = useWorkflowConfig();

  const handleUpdateConfig = async (teamId: string, values: Partial<TeamConfig>) => {
    const success = await updateConfig(teamId, values);
    if (success) {
      message.success('Configuration updated');
    } else {
      message.error('Failed to update configuration');
    }
  };

  const columns = [
    { title: 'Team ID', dataIndex: 'teamId', key: 'teamId' },
    {
      title: 'Max Load',
      dataIndex: 'maxLoad',
      key: 'maxLoad',
      render: (value: number, record: TeamConfig) => (
        <InputNumber
          value={value}
          min={1}
          max={200}
          onChange={(val) => handleUpdateConfig(record.teamId, { maxLoad: val || 50 })}
        />
      )
    },
    {
      title: 'Auto Reassign',
      dataIndex: 'autoReassignEnabled',
      key: 'autoReassignEnabled',
      render: (value: boolean, record: TeamConfig) => (
        <Switch
          checked={value}
          onChange={(checked) => handleUpdateConfig(record.teamId, { autoReassignEnabled: checked })}
        />
      )
    },
    {
      title: 'Overflow Action',
      dataIndex: 'overflowAction',
      key: 'overflowAction',
      render: (value: string, record: TeamConfig) => (
        <Select
          value={value}
          style={{ width: 150 }}
          onChange={(val) => handleUpdateConfig(record.teamId, { overflowAction: val })}
        >
          <Select.Option value="LOWEST_LOAD">Lowest Load</Select.Option>
          <Select.Option value="ROUND_ROBIN">Round Robin</Select.Option>
          <Select.Option value="CAPACITY_BASED">Capacity Based</Select.Option>
        </Select>
      )
    }
  ];

  return (
    <Card title="Team Workload Configuration" loading={loading}>
      <Table
        dataSource={configs}
        columns={columns}
        rowKey="teamId"
        pagination={false}
      />
    </Card>
  );
};

export default TeamWorkloadConfig;