import React, { useState } from 'react';
import { Row, Col, Card, Statistic, Select, DatePicker, Button, Progress, Table, Tag, Tabs } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrophyOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const fetchBSAnalytics = async (endpoint: string, period?: string) => {
  const { data } = await axios.get(`http://localhost:5000/api/bulletin-soin/analytics/${endpoint}`, {
    params: { period }
  });
  return data;
};

const BSAnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['bs-analytics-dashboard', period],
    queryFn: () => fetchBSAnalytics('dashboard', period)
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['bs-analytics-trends', period],
    queryFn: () => fetchBSAnalytics('trends', period)
  });

  const { data: slaCompliance, isLoading: slaLoading } = useQuery({
    queryKey: ['bs-analytics-sla', period],
    queryFn: () => fetchBSAnalytics('sla-compliance', period)
  });

  const { data: teamPerformance, isLoading: teamLoading } = useQuery({
    queryKey: ['bs-analytics-team', period],
    queryFn: () => fetchBSAnalytics('team-performance', period)
  });

  const { data: volumeStats, isLoading: volumeLoading } = useQuery({
    queryKey: ['bs-analytics-volume', period],
    queryFn: () => fetchBSAnalytics('volume-stats', period)
  });

  const exportAnalytics = () => {
    const link = document.createElement('a');
    link.href = 'http://localhost:5000/api/bulletin-soin/export/excel';
    link.download = `BS_Analytics_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const teamColumns = [
    {
      title: 'Gestionnaire',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Traités',
      dataIndex: 'processed',
      key: 'processed',
      render: (value: number) => <Tag color="green">{value}</Tag>
    },
    {
      title: 'En cours',
      dataIndex: 'inProgress',
      key: 'inProgress',
      render: (value: number) => <Tag color="blue">{value}</Tag>
    },
    {
      title: 'En retard',
      dataIndex: 'overdue',
      key: 'overdue',
      render: (value: number) => <Tag color="red">{value}</Tag>
    },
    {
      title: 'Efficacité',
      dataIndex: 'efficiency',
      key: 'efficiency',
      render: (value: number) => (
        <Progress 
          percent={Math.round(value)} 
          size="small" 
          status={value >= 80 ? 'success' : value >= 60 ? 'active' : 'exception'}
        />
      )
    },
    {
      title: 'Risque',
      dataIndex: 'risk',
      key: 'risk',
      render: (risk: string) => (
        <Tag color={risk === 'HIGH' ? 'red' : risk === 'MEDIUM' ? 'orange' : 'green'}>
          {risk}
        </Tag>
      )
    }
  ];

  const slaData = slaCompliance ? [
    { name: 'À temps', value: slaCompliance.onTime, color: '#52c41a' },
    { name: 'Proche échéance', value: slaCompliance.approaching, color: '#faad14' },
    { name: 'En retard', value: slaCompliance.overdue, color: '#ff4d4f' }
  ] : [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Analytiques BS</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 120 }}
            options={[
              { value: '7d', label: '7 jours' },
              { value: '30d', label: '30 jours' },
              { value: '90d', label: '3 mois' },
              { value: '365d', label: '1 an' }
            ]}
          />
          <Button type="primary" onClick={exportAnalytics}>
            Exporter
          </Button>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Vue d'ensemble" key="overview">
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card loading={dashboardLoading}>
                <Statistic 
                  title="Total BS" 
                  value={dashboard?.overview?.total || 0}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card loading={dashboardLoading}>
                <Statistic 
                  title="En cours" 
                  value={dashboard?.overview?.inProgress || 0}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card loading={dashboardLoading}>
                <Statistic 
                  title="En retard" 
                  value={dashboard?.overview?.overdue || 0}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card loading={dashboardLoading}>
                <Statistic 
                  title="Taux de réussite" 
                  value={dashboard?.overview?.completionRate || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[8, 8]}>
            <Col xs={24} lg={16} style={{ marginBottom: '8px' }}>
              <Card title="Tendances de volume" loading={trendsLoading} size="small">
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <ResponsiveContainer width="100%" height={250} minWidth={350}>
                    <LineChart data={volumeStats || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Envoyés" />
                      <Line type="monotone" dataKey="received" stroke="#82ca9d" name="Reçus" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8} style={{ marginBottom: '8px' }}>
              <Card title="Conformité SLA" loading={slaLoading} size="small">
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <ResponsiveContainer width="100%" height={250} minWidth={200}>
                    <PieChart>
                      <Pie
                        data={slaData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {slaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Performance équipe" key="team">
          <Row gutter={[8, 8]}>
            <Col span={24}>
              <Card title="Performance par gestionnaire" loading={teamLoading} size="small">
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <Table
                    dataSource={teamPerformance?.teamPerformance || []}
                    columns={teamColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                  />
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
            <Col span={24}>
              <Card title="Efficacité par gestionnaire" loading={teamLoading} size="small">
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <ResponsiveContainer width="100%" height={250} minWidth={350}>
                    <BarChart data={teamPerformance?.teamPerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="efficiency" fill="#8884d8" name="Efficacité (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Tendances" key="trends">
          <Row gutter={[8, 8]}>
            <Col span={24}>
              <Card title="Évolution des performances" loading={trendsLoading} size="small">
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <ResponsiveContainer width="100%" height={300} minWidth={400}>
                    <LineChart data={trends?.performanceTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="processed" stroke="#8884d8" name="Traités" />
                      <Line type="monotone" dataKey="efficiency" stroke="#82ca9d" name="Efficacité (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default BSAnalyticsPage;