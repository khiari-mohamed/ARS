import React from 'react';
import { Card, Statistic, Row, Col, Progress } from 'antd';
import { TrophyOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { usePerformanceMetrics } from '../../hooks/useBS';

interface PerformanceChartProps {
  userId?: string;
  period?: { start: string; end: string };
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  userId, 
  period = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  }
}) => {
  const { data: performance, isLoading } = usePerformanceMetrics(period);

  const userPerformance = userId 
    ? performance?.find((p: any) => p.processedById === userId)
    : performance?.[0];

  const processedCount = userPerformance?._count?.id || 0;
  const target = 50; // Monthly target
  const completionRate = target > 0 ? (processedCount / target) * 100 : 0;

  return (
    <Card title="Performance" loading={isLoading}>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="BS traités"
            value={processedCount}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Objectif"
            value={target}
            prefix={<TrophyOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Taux"
            value={completionRate}
            precision={1}
            suffix="%"
            prefix={<ClockCircleOutlined />}
            valueStyle={{ 
              color: completionRate >= 100 ? '#3f8600' : completionRate >= 80 ? '#faad14' : '#cf1322' 
            }}
          />
        </Col>
      </Row>
      
      <div style={{ marginTop: 16 }}>
        <Progress
          percent={Math.min(completionRate, 100)}
          status={completionRate >= 100 ? 'success' : completionRate >= 80 ? 'active' : 'exception'}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
      </div>
    </Card>
  );
};