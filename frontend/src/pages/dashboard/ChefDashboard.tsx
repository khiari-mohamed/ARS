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
    <div style={{ padding: 24 }}>
      <h1>Tableau de bord Chef d'équipe</h1>
      
      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="BS non assignés"
              value={unassignedBS.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: unassignedBS.length > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="BS en cours"
              value={inProgressBS.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="BS en retard"
              value={overdueBS.length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
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

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Vue d'ensemble" key="overview">
          <Row gutter={16}>
            <Col span={16}>
              <Card 
                title="Corbeille globale" 
                extra={
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={handleBulkAssign}
                      disabled={selectedBsIds.length === 0}
                    >
                      Assigner sélectionnés ({selectedBsIds.length})
                    </Button>
                  </Space>
                }
              >
                <Table
                  dataSource={bsList}
                  columns={bsColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </Card>
            </Col>
            <Col span={8}>
              <AssignmentSuggestions 
                onSelectAssignee={(assigneeId) => {
                  // Handle assignee selection
                  console.log('Selected assignee:', assigneeId);
                }}
              />
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Équipe" key="team">
          <Row gutter={16}>
            <Col span={16}>
              <Card 
                title="Performance de l'équipe"
                extra={
                  <Button 
                    size="small" 
                    onClick={() => {
                      // Refresh team workload data without page reload
                      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
                      queryClient.invalidateQueries({ queryKey: ['bs-list'] });
                      queryClient.invalidateQueries({ queryKey: ['assignment-suggestions'] });
                    }}
                    icon={<TeamOutlined />}
                  >
                    Actualiser ({teamLoad?.length || 0} gestionnaires)
                  </Button>
                }
              >

                <Table
                  dataSource={teamLoad || []}
                  columns={teamColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 700 }}
                  loading={!teamLoad}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Répartition des risques">
                <Row gutter={8}>
                  <Col span={8}>
                    <Statistic
                      title="Faible"
                      value={teamStats.lowRiskMembers}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Moyen"
                      value={teamStats.mediumRiskMembers}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Élevé"
                      value={teamStats.highRiskMembers}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
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