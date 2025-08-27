import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Alert, Tabs, Progress } from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useBSList, useSlaAlerts, usePriorities, usePerformanceMetrics } from '../../hooks/useBS';
import { BSStatusTag } from '../../components/BS/BSStatusTag';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;

interface BSItem {
  id: string;
  numBs: string;
  nomAssure: string;
  nomBeneficiaire: string;
  etat: string;
  dueDate?: string;
  dateCreation: string;
  totalPec: number;
}

interface PriorityBS extends BSItem {
  priority_score?: number;
}

const GestionnaireDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('corbeille');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data hooks
  const { data: bsData } = useBSList({ 
    ownerId: user?.id,
    limit: 100 
  }) as { data: { items: BSItem[] } | undefined };
  
  const { data: slaAlerts } = useSlaAlerts();
  const { data: priorities } = usePriorities(user?.id || '') as { data: PriorityBS[] | undefined };
  const { data: performance } = usePerformanceMetrics({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Computed data
  const bsList = bsData?.items || [];
  const enCoursBS = bsList.filter(bs => bs.etat === 'IN_PROGRESS' || bs.etat === 'EN_COURS');
  const traitesBS = bsList.filter(bs => bs.etat === 'VALIDATED' || bs.etat === 'TRAITE');
  const retournesBS = bsList.filter(bs => bs.etat === 'REJECTED' || bs.etat === 'RETOUR_ADMIN');
  
  // My SLA alerts
  const myOverdueBS = slaAlerts?.overdue?.filter((bs: any) => bs.ownerId === user?.id) || [];
  const myApproachingBS = slaAlerts?.approaching?.filter((bs: any) => bs.ownerId === user?.id) || [];

  // Performance metrics
  const todayProcessed = performance?.find((p: any) => p.processedById === user?.id)?._count?.id || 0;
  const monthlyTarget = 50; // Could be dynamic based on contract/role
  const monthlyProcessed = traitesBS.length;
  const performanceRate = monthlyTarget > 0 ? (monthlyProcessed / monthlyTarget) * 100 : 0;

  const getSlaColor = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    if (due < now) return 'red';
    if (due.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'orange';
    return 'green';
  };

  const getUrgencyLevel = (dueDate?: string) => {
    if (!dueDate) return 'normal';
    const now = new Date();
    const due = new Date(dueDate);
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'overdue';
    if (hoursLeft < 24) return 'urgent';
    if (hoursLeft < 72) return 'soon';
    return 'normal';
  };

  const corbeilleColumns = [
    {
      title: 'Numéro BS',
      dataIndex: 'numBs',
      key: 'numBs',
      render: (numBs: string, record: BSItem) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/bs/${record.id}`)}
          style={{ padding: 0 }}
        >
          {numBs}
        </Button>
      ),
    },
    {
      title: 'Assuré',
      dataIndex: 'nomAssure',
      key: 'nomAssure',
    },
    {
      title: 'Bénéficiaire',
      dataIndex: 'nomBeneficiaire',
      key: 'nomBeneficiaire',
    },
    {
      title: 'Statut',
      dataIndex: 'etat',
      key: 'etat',
      render: (etat: string) => <BSStatusTag status={etat as any} />,
    },
    {
      title: 'Échéance',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate: string) => {
        if (!dueDate) return '-';
        const urgency = getUrgencyLevel(dueDate);
        const urgencyColors = {
          overdue: 'red',
          urgent: 'red',
          soon: 'orange',
          normal: 'green'
        };
        const urgencyIcons = {
          overdue: <ExclamationCircleOutlined />,
          urgent: <WarningOutlined />,
          soon: <ClockCircleOutlined />,
          normal: <CheckCircleOutlined />
        };
        
        return (
          <Tag 
            color={urgencyColors[urgency]} 
            icon={urgencyIcons[urgency]}
          >
            {new Date(dueDate).toLocaleDateString()}
          </Tag>
        );
      },
    },
    {
      title: 'Montant',
      dataIndex: 'totalPec',
      key: 'totalPec',
      render: (amount: number) => `${amount?.toFixed(2) || 0} DT`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: BSItem) => (
        <Space>
          <Button 
            size="small" 
            type="primary"
            onClick={() => navigate(`/bs/${record.id}/processing`)}
          >
            Traiter
          </Button>
        </Space>
      ),
    },
  ];

  const prioritiesColumns = [
    {
      title: 'Priorité IA',
      key: 'priority',
      render: (_: any, record: PriorityBS, index: number) => (
        <Tag color={index < 3 ? 'red' : index < 6 ? 'orange' : 'blue'}>
          #{index + 1}
        </Tag>
      ),
    },
    ...corbeilleColumns.slice(0, -1), // Remove actions column
    {
      title: 'Score IA',
      dataIndex: 'priority_score',
      key: 'priority_score',
      render: (score: number) => score ? score.toFixed(2) : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PriorityBS) => (
        <Button 
          size="small" 
          type="primary"
          onClick={() => navigate(`/bs/${record.id}/processing`)}
        >
          Traiter
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>Mon tableau de bord</h1>
      
      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="En cours"
              value={enCoursBS.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Traités ce mois"
              value={monthlyProcessed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En retard SLA"
              value={myOverdueBS.length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Traités aujourd'hui"
              value={todayProcessed}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Progress */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Performance mensuelle">
            <Progress
              percent={Math.min(performanceRate, 100)}
              status={performanceRate >= 100 ? 'success' : performanceRate >= 80 ? 'active' : 'exception'}
              format={() => `${monthlyProcessed}/${monthlyTarget}`}
            />
            <p style={{ marginTop: 8, color: '#666' }}>
              Objectif mensuel: {monthlyTarget} BS
            </p>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Alertes SLA">
            {myOverdueBS.length === 0 && myApproachingBS.length === 0 ? (
              <Alert type="success" message="Aucune alerte SLA" showIcon />
            ) : (
              <div>
                {myOverdueBS.length > 0 && (
                  <Alert 
                    type="error" 
                    message={`${myOverdueBS.length} BS en retard`}
                    style={{ marginBottom: 8 }}
                    showIcon 
                  />
                )}
                {myApproachingBS.length > 0 && (
                  <Alert 
                    type="warning" 
                    message={`${myApproachingBS.length} BS proches de l'échéance`}
                    showIcon 
                  />
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={`En cours (${enCoursBS.length})`} key="corbeille">
          <Card title="Ma corbeille personnelle">
            <Table
              dataSource={enCoursBS}
              columns={corbeilleColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
              rowClassName={(record) => {
                const urgency = getUrgencyLevel(record.dueDate);
                if (urgency === 'overdue') return 'row-overdue';
                if (urgency === 'urgent') return 'row-urgent';
                return '';
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab={`Traités (${traitesBS.length})`} key="traites">
          <Card title="BS traités">
            <Table
              dataSource={traitesBS}
              columns={corbeilleColumns.slice(0, -1)} // Remove actions
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab={`Retournés (${retournesBS.length})`} key="retournes">
          <Card title="BS retournés">
            <Table
              dataSource={retournesBS}
              columns={corbeilleColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="Priorités IA" key="priorities">
          <Card 
            title="Priorités suggérées par l'IA"
            extra={
              <Tag color="blue">
                <TrophyOutlined /> Recommandations intelligentes
              </Tag>
            }
          >
            <Alert
              type="info"
              message="Ordre de traitement optimisé"
              description="L'IA analyse les SLA, l'importance client et la complexité pour suggérer l'ordre optimal de traitement."
              style={{ marginBottom: 16 }}
              showIcon
            />
            <Table
              dataSource={priorities || []}
              columns={prioritiesColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </TabPane>
      </Tabs>

      <style>{`
        .row-overdue {
          background-color: #fff2f0 !important;
        }
        .row-urgent {
          background-color: #fffbe6 !important;
        }
      `}</style>
    </div>
  );
};

export default GestionnaireDashboard;