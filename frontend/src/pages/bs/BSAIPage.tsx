import React from 'react';
import { Row, Col } from 'antd';
import { AssignmentSuggestions } from '../../components/BS/AssignmentSuggestions';
import { RebalancingSuggestions } from '../../components/BS/RebalancingSuggestions';
import { PrioritiesDashboard } from '../../components/BS/PrioritiesDashboard';

const BSAIPage: React.FC = () => {
  return (
    <div>
      <h2>IA & Suggestions</h2>
      <p style={{ marginBottom: 24, color: '#666' }}>
        Intelligence artificielle pour l'optimisation des assignations et la gestion des priorités
      </p>
      
      <Row gutter={[8, 8]}>
        <Col xs={24} lg={12} style={{ marginBottom: '8px' }}>
          <AssignmentSuggestions />
        </Col>
        <Col xs={24} lg={12} style={{ marginBottom: '8px' }}>
          <RebalancingSuggestions />
        </Col>
      </Row>

      <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
        <Col span={24}>
          <PrioritiesDashboard />
        </Col>
      </Row>
    </div>
  );
};

export default BSAIPage;