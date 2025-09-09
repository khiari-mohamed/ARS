import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Alert, Tabs } from 'antd';
import { 
  TeamOutlined, 
  ClockCircleOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useBSList, useSlaAlerts, useTeamWorkload } from '../../hooks/useBS';
import { useQueryClient } from '@tanstack/react-query';
import { BSAssignModal } from '../../components/BS/BSAssignModal';
import { AssignmentSuggestions } from '../../components/BS/AssignmentSuggestions';
import { RebalancingSuggestions } from '../../components/BS/RebalancingSuggestions';
import { BSStatusTag } from '../../components/BS/BSStatusTag';
import GlobalCorbeille from '../../components/analytics/GlobalCorbeille';
import AssignmentCriteria from '../../components/Workflow/AssignmentCriteria';

const { TabPane } = Tabs;

interface TeamMember {
  id: string;
  fullName: string;
  workload: number;
  inProgress: number;
  enCours: number;
  validated: number;
  rejected: number;
  total: number;
  overdue: number;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface BSItem {
  id: string;
  numBs: string;
  nomAssure: string;
  etat: string;
  dueDate?: string;
  ownerId?: string;
}

const ChefDashboard: React.FC = () => {
  const [selectedBsIds, setSelectedBsIds] = useState<string[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  // Data hooks
  const { data: bsData } = useBSList({ 
    limit: 100 
  }) as { data: { items: BSItem[] } | undefined };
  
  const { data: slaAlerts } = useSlaAlerts();
  const { data: teamLoad } = useTeamWorkload() as { data: TeamMember[] | undefined };

  // Computed data
  const bsList = bsData?.items || [];
  const unassignedBS = bsList.filter(bs => !bs.ownerId);
  const inProgressBS = bsList.filter(bs => bs.ownerId && bs.etat === 'IN_PROGRESS');
  const overdueBS = slaAlerts?.overdue || [];
  const approachingBS = slaAlerts?.approaching || [];

  // Team statistics
  const teamStats = {
    totalMembers: teamLoad?.length || 0,
    highRiskMembers: teamLoad?.filter(m => m.risk === 'HIGH').length || 0,
    mediumRiskMembers: teamLoad?.filter(m => m.risk === 'MEDIUM').length || 0,
    lowRiskMembers: teamLoad?.filter(m => m.risk === 'LOW').length || 0,
  };

  // Force refresh team data after assignment
  React.useEffect(() => {
    // This will trigger a re-fetch when the component mounts or updates
  }, [selectedBsIds]);

  const handleBulkAssign = () => {
    if (selectedBsIds.length === 0) {
      return;
    }
    setAssignModalVisible(true);
  };

  const handleAutoAssignByClient = async () => {
    if (selectedBsIds.length === 0) return;
    
    try {
      const response = await fetch('/api/workflow/enhanced-corbeille/auto-assign-by-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bordereauIds: selectedBsIds })
      });
      
      if (response.ok) {
        setSelectedBsIds([]);
        queryClient.invalidateQueries(['bs-list']);
        queryClient.invalidateQueries(['team-workload']);
      }
    } catch (error) {
      console.error('Auto assignment failed:', error);
    }
  };

  const handleAutoAssignByType = async (documentType: string) => {
    if (selectedBsIds.length === 0) return;
    
    try {
      const response = await fetch('/api/workflow/enhanced-corbeille/auto-assign-by-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bordereauIds: selectedBsIds, documentType })
      });
      
      if (response.ok) {
        setSelectedBsIds([]);
        queryClient.invalidateQueries(['bs-list']);
        queryClient.invalidateQueries(['team-workload']);
      }
    } catch (error) {
      console.error('Auto assignment by type failed:', error);
    }
  };

  const handleAssignSuccess = () => {
    setSelectedBsIds([]);
    setAssignModalVisible(false);
  };

  const getSlaColor = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    if (due < now) return 'red';
    if (due.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'orange';
    return 'green';
  };

  const bsColumns = [
    {
      title: 'Sélection',
      key: 'selection',
      render: (_: any, record: BSItem) => (
        <input
          type="checkbox"
          checked={selectedBsIds.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedBsIds([...selectedBsIds, record.id]);
            } else {
              setSelectedBsIds(selectedBsIds.filter(id => id !== record.id));
            }
          }}
        />
      ),
    },
    {
      title: 'Numéro BS',
      dataIndex: 'numBs',
      key: 'numBs',
    },
    {
      title: 'Assuré',
      dataIndex: 'nomAssure',
      key: 'nomAssure',
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
      render: (dueDate: string) => dueDate ? (
        <Tag color={getSlaColor(dueDate)}>
          {new Date(dueDate).toLocaleDateString()}
        </Tag>
      ) : '-',
    },
    {
      title: 'Assigné à',
      dataIndex: 'ownerId',
      key: 'ownerId',
      render: (ownerId: string) => ownerId ? `Gestionnaire ${ownerId}` : 'Non assigné',
    },
  ];

  const teamColumns = [
    {
      title: 'Gestionnaire',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 200,
    },
    {
      title: 'Total BS',
      dataIndex: 'total',
      key: 'total',
      width: 80,
      render: (count: number, record: TeamMember) => {
        const totalCount = record.total || 0;
        return (
          <Statistic 
            value={totalCount} 
            valueStyle={{ 
              fontSize: 14, 
              color: totalCount > 0 ? '#000' : '#999',
              fontWeight: 'bold'
            }} 
          />
        );
      },
    },
    {
      title: 'En cours',
      dataIndex: 'workload',
      key: 'workload',
      width: 80,
      render: (count: number) => (
        <Statistic value={count} valueStyle={{ fontSize: 14, color: '#1890ff' }} />
      ),
    },
    {
      title: 'Détail par statut',
      key: 'statusDetail',
      width: 250,
      render: (record: TeamMember) => (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {(record.inProgress || 0) > 0 && (
            <Tag color="blue" style={{ fontSize: '10px', margin: '1px', padding: '0 4px' }}>
              Prog: {record.inProgress || 0}
            </Tag>
          )}
          {(record.enCours || 0) > 0 && (
            <Tag color="cyan" style={{ fontSize: '10px', margin: '1px', padding: '0 4px' }}>
              Cours: {record.enCours || 0}
            </Tag>
          )}
          {(record.validated || 0) > 0 && (
            <Tag color="green" style={{ fontSize: '10px', margin: '1px', padding: '0 4px' }}>
              Valid: {record.validated || 0}
            </Tag>
          )}
          {(record.rejected || 0) > 0 && (
            <Tag color="red" style={{ fontSize: '10px', margin: '1px', padding: '0 4px' }}>
              Rejet: {record.rejected || 0}
            </Tag>
          )}
          {(record.overdue || 0) > 0 && (
            <Tag color="orange" style={{ fontSize: '10px', margin: '1px', padding: '0 4px' }}>
              Retard: {record.overdue || 0}
            </Tag>
          )}
          {(!record.inProgress && !record.enCours && !record.validated && !record.rejected && !record.overdue) && (
            <Tag style={{ fontSize: '10px', color: '#999' }}>Aucun BS</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Niveau de risque',
      dataIndex: 'risk',
      key: 'risk',
      width: 120,
      render: (risk: string) => {
        const colors = { HIGH: 'red', MEDIUM: 'orange', LOW: 'green' };
        const icons = { 
          HIGH: <ExclamationCircleOutlined />, 
          MEDIUM: <WarningOutlined />, 
          LOW: <CheckCircleOutlined /> 
        };
        return (
          <Tag color={colors[risk as keyof typeof colors]} icon={icons[risk as keyof typeof icons]}>
            {risk === 'HIGH' ? 'Élevé' : risk === 'MEDIUM' ? 'Moyen' : 'Faible'}
          </Tag>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '12px 8px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Tableau de bord Chef d'équipe</h1>
      
      {/* KPI Cards */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="BS non assignés"
              value={unassignedBS.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: unassignedBS.length > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="BS en cours"
              value={inProgressBS.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="BS en retard"
              value={overdueBS.length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="Membres à risque"
              value={teamStats.highRiskMembers}
              prefix={<WarningOutlined />}
              valueStyle={{ color: teamStats.highRiskMembers > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {(overdueBS.length > 0 || teamStats.highRiskMembers > 0) && (
        <Alert
          type="warning"
          message="Attention requise"
          description={
            <div>
              {overdueBS.length > 0 && <p>• {overdueBS.length} BS en retard SLA</p>}
              {teamStats.highRiskMembers > 0 && <p>• {teamStats.highRiskMembers} gestionnaire(s) en surcharge</p>}
            </div>
          }
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" style={{ width: '100%' }}>
        <TabPane tab="Vue d'ensemble" key="overview">
          <Row gutter={[8, 8]}>
            <Col xs={24} lg={16} style={{ marginBottom: '8px' }}>
              <Card 
                title="Corbeille globale" 
                size="small"
                extra={
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={handleBulkAssign}
                      disabled={selectedBsIds.length === 0}
                      size="small"
                    >
                      Assigner sélectionnés ({selectedBsIds.length})
                    </Button>
                    <Button 
                      onClick={handleAutoAssignByClient}
                      disabled={selectedBsIds.length === 0}
                      size="small"
                    >
                      Auto-assigner par client
                    </Button>
                    <Button 
                      onClick={() => handleAutoAssignByType('BS')}
                      disabled={selectedBsIds.length === 0}
                      size="small"
                    >
                      Auto-assigner par type
                    </Button>
                  </Space>
                }
              >
                <div style={{ overflowX: 'auto' }}>
                  <Table
                    dataSource={bsList}
                    columns={bsColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                    scroll={{ x: 600 }}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8} style={{ marginBottom: '8px' }}>
              <AssignmentSuggestions 
                onSelectAssignee={(assigneeId) => {
                  // Handle assignee selection
                  console.log('Selected assignee:', assigneeId);
                }}
              />
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Corbeille Globale" key="team">
          <GlobalCorbeille />
        </TabPane>

        <TabPane tab="Affectation Avancée" key="assignment">
          <AssignmentCriteria />
        </TabPane>

        <TabPane tab="Rééquilibrage IA" key="rebalancing">
          <RebalancingSuggestions />
        </TabPane>
      </Tabs>

      <BSAssignModal
        visible={assignModalVisible}
        onClose={() => setAssignModalVisible(false)}
        bsIds={selectedBsIds}
        onSuccess={handleAssignSuccess}
      />
    </div>
  );
};

export default ChefDashboard;