import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { PerformanceChart } from '../../components/BS/PerformanceChart';
import { useTeamWorkload, useSlaAlerts, usePerformanceMetrics } from '../../hooks/useBS';

const BSAnalyticsPage: React.FC = () => {
  const { data: teamWorkload } = useTeamWorkload();
  const { data: slaAlerts } = useSlaAlerts();
  const { data: performanceMetrics } = usePerformanceMetrics({});

  const totalBS = teamWorkload?.reduce((sum: number, t: any) => sum + t.total, 0) || 0;
  const inProgressBS = teamWorkload?.reduce((sum: number, t: any) => sum + t.inProgress, 0) || 0;
  const overdueBS = teamWorkload?.reduce((sum: number, t: any) => sum + t.overdue, 0) || 0;
  const validatedBS = teamWorkload?.reduce((sum: number, t: any) => sum + t.validated, 0) || 0;

  return (
    <div>
      <h2>Analytiques BS</h2>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total BS" value={totalBS} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="En cours" value={inProgressBS} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="En retard" value={overdueBS} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Validés" value={validatedBS} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <PerformanceChart />
        </Col>
      </Row>

      {teamWorkload && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="Charge de travail par gestionnaire">
              <Row gutter={[16, 16]}>
                {teamWorkload.map((member: any) => (
                  <Col span={8} key={member.id}>
                    <Card size="small">
                      <Statistic 
                        title={member.fullName} 
                        value={member.workload}
                        suffix="BS"
                        valueStyle={{ 
                          color: member.risk === 'HIGH' ? '#cf1322' : 
                                 member.risk === 'MEDIUM' ? '#fa8c16' : '#52c41a' 
                        }}
                      />
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                        En retard: {member.overdue} | Validés: {member.validated}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default BSAnalyticsPage;